"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MermaidDiagram } from "@/components/diagram/mermaid-diagram";
import type { FlowModel, ModelOp } from "@/lib/model/types";
import { addNoteOp, MAX_NOTE_CHARS, notesOf } from "@/lib/model/notes";
import { buildScenes, narrate, speechOf, type Narration, type Scene } from "@/lib/preview/scenes";
import { toMermaid } from "@/lib/render/mermaid";
import { fetchVoices, useVoiceChoice, VoiceSelect, type Tts } from "@/components/ui/voice";
import { useAudioKeepAlive } from "@/components/ui/use-audio-keep-alive";

/** 1 場面を見せる時間（ミリ秒）。字幕が長いほど長く、ステップは矢印の丸が走る分を足す */
function durationOf(scene: Scene): number {
  return 2_200 + 110 * scene.caption.length + (scene.kind === "step" ? 900 : 0);
}

/** 読み上げるときの、場面の最短の長さ（ミリ秒）。短い字幕でも、矢印の丸が走り終わるまでは待つ */
function minDurationOf(scene: Scene): number {
  return scene.kind === "step" ? 1_400 : 800;
}

/** 読み終えてから次の場面へ移るまでの間（ミリ秒） */
const VOICE_GAP_MS = 500;

/** `voice` は VOICEVOX の話す速さ。場面の速さほど上げると聞き取れないので、控えめにする */
const SPEEDS = [
  { value: 0.6, label: "ゆっくり", voice: 0.9 },
  { value: 1, label: "ふつう", voice: 1.1 },
  { value: 1.6, label: "はやい", voice: 1.3 },
] as const;

/** 字幕の文字の大きさ。外部ディスプレイに映して、離れた席から読むときに大きくする */
const CAPTION_SIZES = [
  { value: "normal", label: "標準", className: "text-xl sm:text-2xl" },
  { value: "large", label: "大", className: "text-3xl sm:text-4xl" },
  { value: "xlarge", label: "特大", className: "text-4xl sm:text-6xl" },
] as const;
type CaptionSize = (typeof CAPTION_SIZES)[number]["value"];
const CAPTION_SIZE_KEY = "flowline.captionSize";

/** 選んだ字幕の大きさ。この端末のブラウザに覚えておく（図のデータには入れない） */
function useCaptionSize(): [CaptionSize, (v: CaptionSize) => void] {
  const [size, setSize] = useState<CaptionSize>(() => {
    try {
      const saved = window.localStorage.getItem(CAPTION_SIZE_KEY);
      return CAPTION_SIZES.find((c) => c.value === saved)?.value ?? "normal";
    } catch {
      return "normal";
    }
  });
  function choose(v: CaptionSize) {
    setSize(v);
    try {
      window.localStorage.setItem(CAPTION_SIZE_KEY, v);
    } catch {
      // 保存できなくても、この画面の間は選んだ大きさで出す
    }
  }
  return [size, choose];
}

type Ai = { status: "loading" } | { status: "ready"; narration: Narration } | { status: "error"; message: string };

/** 読み上げに失敗した理由を、画面に出す文にする */
function speechFailure(e: unknown): string {
  // 音声を鳴らす前に、ブラウザが自動再生を止めた（画面を操作しないまま再生が始まった場合など）
  if (e instanceof DOMException && e.name === "NotAllowedError") {
    return "ブラウザが音声の自動再生を止めました。読み上げを入れ直すか、再生ボタンを押し直してください";
  }
  return e instanceof Error ? e.message : "読み上げに失敗しました";
}

async function errorOf(res: Response): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return json.error ?? `HTTP ${res.status}`;
}

/**
 * フローのプレビュー。起点から終点まで、図の上で今の手順を強調しながら、字幕で流れを言葉にする。
 * 作ったチームで「この流れで合っているか」を一緒に確かめるためのもの。図は変えない。
 *
 * 字幕はまずコードで作ったもの（lib/preview/scenes.ts）で流し始め、gemma の言い回しが届いたら差し替える。
 * gemma が落ちていても、再生はそのまま続けられる。
 *
 * 読み上げ（VOICEVOX、/api/tts）が使えるときは、字幕を読み終えてから次の場面へ進む。
 * 使えないとき・切ったときは、字幕の長さから決めた時間で進む。
 */
export function FlowPlayer({
  name,
  model,
  onCommit,
  onClose,
}: {
  name: string;
  model: FlowModel;
  /** 再生中に貼った付箋を図に反映する */
  onCommit: (ops: ModelOp[]) => void;
  /** `stepId` は最後に見ていた手順。編集画面でその手順を選んだ状態に戻すのに使う */
  onClose: (stepId?: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 場面は開いたときの図で作る。再生中に付箋を貼ると model が変わるが、それで場面や AI の言い回しを作り直さない
  // （付箋は場面に出ない）。付箋の一覧と、貼るときの id は今の model から取る
  const [flow] = useState(model);
  const code = useMemo(() => toMermaid(flow), [flow]);
  const base = useMemo(() => buildScenes(flow, name), [flow, name]);
  const [ai, setAi] = useState<Ai>({ status: "loading" });
  const [useAi, setUseAi] = useState(true);
  const scenes = useMemo(
    () => narrate(base, useAi && ai.status === "ready" ? ai.narration : null),
    [base, useAi, ai],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.6);
  const [voice, setVoice] = useState(true);
  const [tts, setTts] = useState<Tts>({ status: "loading" });
  const voiceSpeed = SPEEDS.find((s) => s.value === speed)?.voice ?? 1;
  const { voice: speaker, choose } = useVoiceChoice(tts);
  const speakerId = speaker?.id;
  // 字幕と話す速さごとの音声（object URL）。前へ戻ったときや先読みで、同じ文を作り直さない
  const audioCache = useRef(new Map<string, Promise<string>>());
  const last = scenes.length - 1;
  const scene = scenes[Math.min(index, last)];
  const [captionSize, setCaptionSize] = useCaptionSize();
  // 付箋を貼れるのはステップの場面だけ（Scene.key がステップの id）
  const stepId = scene.kind === "step" ? scene.key : undefined;
  const stepNotes = stepId ? notesOf(model, stepId) : [];
  /** 付箋を書いている場面のステップ。場面が移ったら書く欄は閉じる */
  const [noting, setNoting] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const notingHere = noting !== null && noting === stepId;

  function startNote() {
    if (!stepId) return;
    // 書いている間に次の場面へ進まないよう止める
    setPlaying(false);
    setNoting(stepId);
  }
  function addNote() {
    if (!stepId) return;
    const op = addNoteOp(model, noteText, { kind: "step", id: stepId });
    if (!op) return;
    onCommit([op]);
    setNoteText("");
    setNoting(null);
  }

  /** 閉じる。今の場面か、それより前でいちばん近い手順を、最後に見ていた手順として渡す（はじめの場面なら無し） */
  function close() {
    for (let i = Math.min(index, last); i >= 0; i--) {
      if (scenes[i].kind === "step") return onClose(scenes[i].key);
    }
    onClose();
  }

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: flow, title: name }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as { narration?: Narration; error?: string };
        setAi(
          res.ok && json.narration
            ? { status: "ready", narration: json.narration }
            : { status: "error", message: json.error ?? `HTTP ${res.status}` },
        );
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setAi({ status: "error", message: e instanceof Error ? e.message : "通信に失敗しました" });
      });
    return () => ctrl.abort();
  }, [flow, name]);

  // 読み上げの声のクレジット。取れたら読み上げが使える
  useEffect(() => {
    if (!voice || tts.status !== "loading") return;
    const ctrl = new AbortController();
    fetchVoices(ctrl.signal)
      .then(setTts)
      .catch((e) => {
        if (!ctrl.signal.aborted) setTts({ status: "error", message: e instanceof Error ? e.message : "通信に失敗しました" });
      });
    return () => ctrl.abort();
  }, [voice, tts.status]);

  useEffect(() => {
    const cache = audioCache.current;
    return () => {
      for (const url of cache.values()) url.then(URL.revokeObjectURL, () => {});
      cache.clear();
    };
  }, []);

  const speech = useCallback(
    (text: string): Promise<string> => {
      const key = `${speakerId}:${voiceSpeed}:${text}`;
      let url = audioCache.current.get(key);
      if (!url) {
        url = fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speed: voiceSpeed, speaker: speakerId }),
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
    [voiceSpeed, speakerId],
  );
  const speaking = voice && tts.status === "ready";
  useAudioKeepAlive(speaking);

  // 今の場面。AI の言い回しが届くと場面の一覧が作り直されるが、それで再生をやり直すと
  // 読みかけの声が頭から読み直しになる。再生の効果は場面の番号で動かし、中身はここから読む
  const sceneRef = useRef(scene);
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  // 再生中は、場面の時間が過ぎたら（読み上げ中は読み終えたら）次へ。最後の場面で止まる
  useEffect(() => {
    if (!playing) return;
    const scene = sceneRef.current;
    const advance = () => {
      if (index >= last) setPlaying(false);
      else setIndex(index + 1);
    };
    if (!speaking) {
      const timer = setTimeout(advance, durationOf(scene) / speed);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let audio: HTMLAudioElement | undefined;
    const startedAt = performance.now();
    const fail = (e: unknown) => {
      if (cancelled) return;
      // 読み上げを止めて、字幕の長さで進む再生に切り替える（この効果が作り直される）
      setTts({ status: "error", message: speechFailure(e) });
    };
    speech(speechOf(scene))
      .then((url) => {
        if (cancelled) return;
        audio = new Audio(url);
        audio.onended = () => {
          const rest = minDurationOf(scene) / speed - (performance.now() - startedAt);
          timer = setTimeout(advance, Math.max(VOICE_GAP_MS / speed, rest));
        };
        // 自動再生が止められたときも、ここに来る
        return audio.play();
      })
      .catch(fail);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      audio?.pause();
    };
  }, [playing, index, last, speed, speaking, speech]);

  // 次の場面の音声を先に作っておき、場面の切り替わりで待たせない（AI の言い回しが届いたら作り直す）
  const nextSpeech = index < last ? speechOf(scenes[index + 1]) : null;
  useEffect(() => {
    if (playing && speaking && nextSpeech) speech(nextSpeech).catch(() => {});
  }, [playing, speaking, nextSpeech, speech]);

  const go = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(last, i))),
    [last],
  );
  const togglePlay = useCallback(() => {
    // 最後まで見終えたあとの再生は、最初から
    if (!playing && index >= last) setIndex(0);
    setPlaying(!playing);
  }, [playing, index, last]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 付箋を書いている欄や選択肢の上では、キーをそのまま使う
      if (e.isComposing || /^(SELECT|INPUT|TEXTAREA)$/.test((e.target as HTMLElement | null)?.tagName ?? "")) return;
      if (e.key === " ") togglePlay();
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Home") go(0);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, go, index]);

  const btn =
    "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/10";
  const narrated = scene.kind === "step" && scene.label && scene.caption !== scene.label;

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${name} の流れのプレビュー`}
      // Esc で閉じる（dialog の標準動作を、親の状態に揃える）
      onCancel={(e) => {
        e.preventDefault();
        // 付箋を書いている途中の Esc は、書く欄だけ閉じる
        if (notingHere) setNoting(null);
        else close();
      }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-background p-0 text-foreground backdrop:bg-black/50"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-2 dark:border-white/15">
          <h2 className="truncate text-lg font-semibold">
            <span className="mr-2 text-sm font-normal text-zinc-500">流れを確認</span>
            {name}
          </h2>
          <button type="button" className={btn} onClick={close} title="閉じる（Esc）">
            閉じる
          </button>
        </header>

        <div className="flow-play min-h-0 flex-1 p-4">
          <MermaidDiagram code={code} play={scene.mark} />
        </div>

        <section
          aria-live="polite"
          className="shrink-0 border-t border-black/10 bg-zinc-50 px-6 pb-4 pt-3 dark:border-white/15 dark:bg-zinc-900"
        >
          {/* 場面ごとの目盛り。押すとその場面へ */}
          <div className="mb-3 flex gap-1" role="group" aria-label="場面">
            {scenes.map((s, i) => (
              <button
                key={i}
                type="button"
                aria-label={`${i + 1} 番目の場面へ`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => go(i)}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < index
                    ? "bg-sky-600/60 dark:bg-sky-400/60"
                    : i === index
                      ? "bg-sky-600 dark:bg-sky-400"
                      : s.kind === "step"
                        ? "bg-black/15 dark:bg-white/20"
                        : "bg-black/5 dark:bg-white/10"
                }`}
              />
            ))}
          </div>

          <div key={index} className="min-h-[6.5rem] animate-caption-in motion-reduce:animate-none">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              {scene.number !== undefined && (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-800 px-1.5 text-xs font-semibold text-white dark:bg-zinc-200 dark:text-zinc-900">
                  {scene.number}
                </span>
              )}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{scene.heading}</span>
              {scene.context && (
                <span className="rounded-full border border-violet-300 bg-violet-50 px-2 text-xs text-violet-800 dark:border-violet-400/40 dark:bg-violet-400/10 dark:text-violet-200">
                  {scene.context}
                </span>
              )}
              {scene.badges.map((b) => (
                <span key={b} className="rounded border border-black/10 px-1.5 text-xs dark:border-white/15">
                  {b}
                </span>
              ))}
            </div>
            <p className={`mt-2 leading-relaxed ${CAPTION_SIZES.find((c) => c.value === captionSize)?.className}`}>
              {scene.caption}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              {scene.artifact && (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">
                  渡すもの: {scene.artifact}
                </span>
              )}
              {narrated && <span>図の表記: {scene.label}</span>}
              {stepNotes.map((n) => (
                <span
                  key={n.id}
                  className="rounded border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-yellow-900 dark:border-yellow-400/40 dark:bg-yellow-400/10 dark:text-yellow-100"
                >
                  付箋: {n.question}
                  {n.answer ? ` → ${n.answer}` : ""}
                </span>
              ))}
            </div>
            {notingHere && (
              <div className="mt-2 flex gap-2">
                <input
                  autoFocus
                  value={noteText}
                  maxLength={MAX_NOTE_CHARS}
                  placeholder="この手順について、チームで決めること（例: 承認者が不在のときはどうするか）"
                  aria-label="この手順に貼る付箋"
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                    e.preventDefault();
                    addNote();
                  }}
                  className="min-w-0 flex-1 rounded-md border border-black/15 bg-white px-3 py-1.5 text-base dark:border-white/20 dark:bg-zinc-950"
                />
                <button type="button" className={btn} disabled={noteText.trim() === ""} onClick={addNote}>
                  貼る
                </button>
                <button type="button" className={btn} onClick={() => setNoting(null)}>
                  やめる
                </button>
              </div>
            )}
          </div>

          {voice && tts.status === "error" && (
            <div
              role="status"
              className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
            >
              <span className="font-semibold">読み上げが使えません。字幕だけで進みます。</span>
              <span className="min-w-0 flex-1">{tts.message}</span>
              <button
                type="button"
                className="rounded-md border border-amber-400 px-2.5 py-1 hover:bg-amber-100 dark:border-amber-400/50 dark:hover:bg-amber-400/20"
                title="VOICEVOX を起動したあとなどに、もう一度つなぎに行きます"
                onClick={() => setTts({ status: "loading" })}
              >
                もう一度つなぐ
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={() => go(0)} title="最初から（Home）">
              ⏮ 最初から
            </button>
            <button type="button" className={btn} disabled={index === 0} onClick={() => go(index - 1)} title="前へ（←）">
              ◀ 前へ
            </button>
            <button
              type="button"
              className={`${btn} min-w-24 border-sky-600 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600`}
              onClick={togglePlay}
              title="再生・一時停止（Space）"
            >
              {playing ? "⏸ 一時停止" : index >= last ? "↻ もう一度" : "▶ 再生"}
            </button>
            <button type="button" className={btn} disabled={index >= last} onClick={() => go(index + 1)} title="次へ（→）">
              次へ ▶
            </button>
            <span className="ml-2 text-sm tabular-nums text-zinc-500">
              {index + 1} / {scenes.length}
            </span>
            <button
              type="button"
              className={`${btn} ml-2`}
              disabled={!stepId || notingHere}
              title={stepId ? "この手順に付箋を貼ります（再生は止まります）" : "付箋は手順の場面で貼れます"}
              onClick={startNote}
            >
              ＋ この手順に付箋
            </button>
            <span className="flex-1" />
            <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              字幕
              <select
                value={captionSize}
                onChange={(e) => setCaptionSize(e.target.value as CaptionSize)}
                className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              >
                {CAPTION_SIZES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
              速さ
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
              >
                {SPEEDS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400"
              title={ai.status === "error" ? ai.message : "ローカル AI が、図の内容を自然な文に言い換えます"}
            >
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
              AI の言い回し
              <span className="text-xs text-zinc-500">
                {ai.status === "loading" ? "（準備中…）" : ai.status === "error" ? "（使えません）" : ""}
              </span>
            </label>
            <label
              className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400"
              title={tts.status === "error" ? tts.message : "字幕を声で読み上げます（ローカルの VOICEVOX）"}
            >
              <input
                type="checkbox"
                checked={voice}
                onChange={(e) => {
                  setVoice(e.target.checked);
                  // 入れ直したら、もう一度つなぎに行く（VOICEVOX をあとから起動した場合）
                  if (e.target.checked && tts.status === "error") setTts({ status: "loading" });
                }}
              />
              読み上げ
              <span className="text-xs text-zinc-500">
                {!voice
                  ? ""
                  : tts.status === "loading"
                    ? "（準備中…）"
                    : tts.status === "error"
                      ? "（使えません）"
                      : `（${speaker?.credit ?? ""}）`}
              </span>
            </label>
            {voice && <VoiceSelect tts={tts} voice={speaker} choose={choose} />}
          </div>
        </section>
      </div>
    </dialog>
  );
}
