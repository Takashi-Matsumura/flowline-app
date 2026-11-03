"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseVtt, type Cue } from "@/lib/vtt";

export type Narration =
  | { status: "loading" }
  | { status: "ready"; credit: string }
  | { status: "error"; message: string };

/**
 * 読み上げない字幕。動画は音声なしの前提で作ってあり、
 * 「この動画に音声はありません」と読み上げると食い違うので飛ばす。
 */
const SKIP = /音声はありません/;

/** 時刻のずれの許容（秒）。止める判定や、字幕の切れ目を少し手前で拾うのに使う */
const EPS = 0.1;

async function errorOf(res: Response): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return json.error ?? `HTTP ${res.status}`;
}

/**
 * 使い方の動画の字幕を VOICEVOX（/api/tts）で読み上げる。
 *
 * 字幕に入ったらその文を読み、字幕の終わりまでに読み終わらなければ、
 * 読み終えるまで動画を止めて待つ（声が途中で切れたり、次の字幕と重なったりしない）。
 * シークしたら読み上げを止め、移った先の字幕を頭から読み直す。
 * 読み上げに失敗したら error にして、字幕だけの再生に戻す。
 */
export function useVideoNarration({
  video,
  vttSrc,
  enabled,
  voiceSpeed,
}: {
  video: HTMLVideoElement | null;
  vttSrc: string | null;
  enabled: boolean;
  /** VOICEVOX の話す速さ（speedScale） */
  voiceSpeed: number;
}): { narration: Narration; retry: () => void } {
  const [narration, setNarration] = useState<Narration>({ status: "loading" });
  const [cues, setCues] = useState<{ src: string; list: Cue[] } | null>(null);
  const audioCache = useRef(new Map<string, Promise<string>>());

  // 声のクレジット。取れたら読み上げが使える
  useEffect(() => {
    if (!enabled || narration.status !== "loading") return;
    const ctrl = new AbortController();
    fetch("/api/tts", { signal: ctrl.signal })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { credit?: string; error?: string };
        setNarration(
          res.ok && json.credit
            ? { status: "ready", credit: json.credit }
            : { status: "error", message: json.error ?? `HTTP ${res.status}` },
        );
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setNarration({ status: "error", message: e instanceof Error ? e.message : "通信に失敗しました" });
      });
    return () => ctrl.abort();
  }, [enabled, narration.status]);

  // 字幕ファイル
  useEffect(() => {
    if (!enabled || !vttSrc || cues?.src === vttSrc) return;
    const ctrl = new AbortController();
    fetch(vttSrc, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`字幕を読み込めませんでした（HTTP ${res.status}）`);
        setCues({ src: vttSrc, list: parseVtt(await res.text()) });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted)
          setNarration({ status: "error", message: e instanceof Error ? e.message : "字幕を読み込めませんでした" });
      });
    return () => ctrl.abort();
  }, [enabled, vttSrc, cues?.src]);

  useEffect(() => {
    const cache = audioCache.current;
    return () => {
      for (const url of cache.values()) url.then(URL.revokeObjectURL, () => {});
      cache.clear();
    };
  }, []);

  const speech = useCallback(
    (text: string): Promise<string> => {
      const key = `${voiceSpeed}:${text}`;
      let url = audioCache.current.get(key);
      if (!url) {
        url = fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed: voiceSpeed }),
        }).then(async (res) => {
          if (!res.ok) throw new Error(await errorOf(res));
          return URL.createObjectURL(await res.blob());
        });
        // 失敗は覚えない（VOICEVOX を起動し直したら、次は作れる）
        url.catch(() => audioCache.current.delete(key));
        audioCache.current.set(key, url);
      }
      return url;
    },
    [voiceSpeed],
  );

  const list = cues?.src === vttSrc ? cues.list : null;
  const active = enabled && narration.status === "ready" && video !== null && list !== null;

  useEffect(() => {
    if (!active || !video || !list) return;
    const v = video;
    const speakable = (i: number) => i >= 0 && i < list.length && !SKIP.test(list[i].text);
    const cueAt = (t: number) => list.findIndex((c) => t >= c.start - EPS / 2 && t < c.end - EPS / 2);

    /** 読んでいる（読もうとしている）字幕。-1 は無し */
    let current = -1;
    let audio: HTMLAudioElement | null = null;
    let done = true;
    /** 読み終えるのを待つために、こちらで動画を止めている */
    let holding = false;
    /** 古い読み上げの結果を捨てるための番号 */
    let token = 0;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let tickTimer: ReturnType<typeof setTimeout> | undefined;

    const fail = (e: unknown) => {
      setNarration({ status: "error", message: e instanceof Error ? e.message : "読み上げに失敗しました" });
    };

    const resume = () => {
      if (!holding) return;
      holding = false;
      void v.play().catch(() => {});
    };

    const stop = () => {
      token++;
      audio?.pause();
      audio = null;
      done = true;
      current = -1;
      clearTimeout(holdTimer);
    };

    // 字幕の終わりで、まだ読んでいたら止めて待つ
    const scheduleHold = () => {
      clearTimeout(holdTimer);
      if (done || current < 0 || v.paused) return;
      const ms = ((list[current].end - v.currentTime) / v.playbackRate) * 1000 - 30;
      holdTimer = setTimeout(() => {
        if (done || v.paused) return;
        if (v.currentTime >= list[current].end - EPS) {
          holding = true;
          v.pause();
        } else scheduleHold();
      }, Math.max(0, ms));
    };

    const speak = (i: number) => {
      stop();
      const my = token;
      current = i;
      done = false;
      speech(list[i].text)
        .then((url) => {
          if (my !== token) return;
          const a = new Audio(url);
          audio = a;
          a.onended = () => {
            if (my !== token) return;
            done = true;
            audio = null;
            clearTimeout(holdTimer);
            resume();
          };
          // 動画が一時停止中に音声が届いたら、再開したときに鳴らす
          if (v.paused && !holding) return;
          // 自動再生が止められたときも、ここで catch に来る
          return a.play();
        })
        .catch((e) => {
          if (my === token) fail(e);
        });
      scheduleHold();
      // 次に読む字幕の音声を先に作っておき、切り替わりで待たせない
      let next = i + 1;
      while (next < list.length && !speakable(next)) next++;
      if (next < list.length) speech(list[next].text).catch(() => {});
    };

    // 今いる字幕を読み始める。次の字幕の切れ目で、もう一度見に来る
    const tick = () => {
      clearTimeout(tickTimer);
      if (v.paused || holding) return;
      const t = v.currentTime;
      const i = cueAt(t);
      if (i !== current && done && speakable(i)) speak(i);
      const nextStart = list.find((c) => c.start > t + EPS / 2)?.start;
      if (nextStart !== undefined)
        tickTimer = setTimeout(tick, Math.max(20, ((nextStart - t) / v.playbackRate) * 1000 + 20));
    };

    const onPlay = () => {
      if (holding) {
        // 待っている間に自分で再生を押したら、残りの読み上げを飛ばして進める
        holding = false;
        stop();
      } else if (audio && !done) {
        void audio.play().catch(fail);
      }
      scheduleHold();
      tick();
    };
    const onPause = () => {
      clearTimeout(tickTimer);
      if (holding) return;
      // 自分で一時停止したら、声も止める（再生で続きから）
      clearTimeout(holdTimer);
      audio?.pause();
    };
    const onSeeking = () => {
      // 読み終えるのを待っている間に動かしたら、移った先から再生を続ける
      const wasHolding = holding;
      holding = false;
      stop();
      clearTimeout(tickTimer);
      if (wasHolding) void v.play().catch(() => {});
    };
    const onRate = () => scheduleHold();

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("seeked", tick);
    v.addEventListener("ratechange", onRate);
    v.addEventListener("timeupdate", tick);
    tick();
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("seeked", tick);
      v.removeEventListener("ratechange", onRate);
      v.removeEventListener("timeupdate", tick);
      clearTimeout(tickTimer);
      stop();
      // 読み上げをやめたら、止めていた動画を動かす
      resume();
    };
  }, [active, video, list, speech]);

  const retry = useCallback(() => setNarration({ status: "loading" }), []);
  return { narration, retry };
}
