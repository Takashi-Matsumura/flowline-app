"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_READING_CHARS, MAX_WORD_CHARS, type Reading } from "@/lib/readings";
import { DisclosureIcon } from "./disclosure-icon";

async function errorOf(res: Response): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return json.error ?? `HTTP ${res.status}`;
}

const input = "w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20";
const btn =
  "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";

/**
 * 読みの辞書。社内のシステム名や略語など、VOICEVOX が読み違える語の読みを登録する。
 * 登録した読みは、フローの再生と使い方の動画の読み上げに使う（画面の字幕はそのまま）。
 * ふだんは閉じておき、開いたときに一覧を読む。
 */
export function ReadingDictionary() {
  const [open, setOpen] = useState(false);
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [word, setWord] = useState("");
  const [reading, setReading] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open || readings !== null) return;
    const ctrl = new AbortController();
    fetch("/api/readings", { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await errorOf(res));
        setReadings(((await res.json()) as { readings: Reading[] }).readings);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "辞書を読み込めませんでした");
      });
    return () => ctrl.abort();
  }, [open, readings]);

  // 閉じたら試聴も止める
  useEffect(() => {
    if (!open) audioRef.current?.pause();
  }, [open]);
  useEffect(() => () => audioRef.current?.pause(), []);

  async function send(method: "PUT" | "DELETE", body: object): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/readings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await errorOf(res));
      setReadings(((await res.json()) as { readings: Reading[] }).readings);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存できませんでした");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send("PUT", { word, reading })) {
      setWord("");
      setReading("");
    }
  }

  /** 文を読み上げて聞かせる。`id` は押したボタンの印（読み込み中の表示に使う） */
  async function listen(id: string, text: string) {
    audioRef.current?.pause();
    setListening(id);
    setError(null);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(await errorOf(res));
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = audio.onpause = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? `読み上げできません: ${e.message}` : "読み上げできません");
    } finally {
      setListening(null);
    }
  }

  return (
    <details className="group" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-1.5 font-medium [&::-webkit-details-marker]:hidden">
        <DisclosureIcon />
        読みの辞書
        {readings && <span className="text-sm font-normal text-zinc-500">（{readings.length}）</span>}
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          読み上げで読み違える社内の言葉（システム名・略語など）の読みを登録します。フローの再生と使い方の動画の読み上げに使われ、画面の字幕はそのままです。
        </p>

        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => void add(e)}>
          <label className="flex min-w-32 flex-1 flex-col gap-1 text-xs text-zinc-500">
            表記
            <input
              className={input}
              value={word}
              maxLength={MAX_WORD_CHARS}
              placeholder="例: TOMAS"
              onChange={(e) => setWord(e.target.value)}
            />
          </label>
          <label className="flex min-w-32 flex-1 flex-col gap-1 text-xs text-zinc-500">
            読み（カタカナかひらがな）
            <input
              className={input}
              value={reading}
              maxLength={MAX_READING_CHARS}
              placeholder="例: トーマス"
              onChange={(e) => setReading(e.target.value)}
            />
          </label>
          <button
            type="button"
            className={btn}
            disabled={!reading.trim() || listening !== null}
            title="入力した読みを、読み上げの声で聞きます"
            onClick={() => void listen("draft", reading)}
          >
            {listening === "draft" ? "準備中…" : "▶ 聞く"}
          </button>
          <button type="submit" className={btn} disabled={busy || !word.trim() || !reading.trim()}>
            登録
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {readings === null ? (
          !error && <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : readings.length === 0 ? (
          <p className="text-sm text-zinc-500">まだ登録はありません。</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-md border border-black/10 dark:divide-white/15 dark:border-white/15">
            {readings.map((r) => (
              <li key={r.word} className="flex items-center gap-3 px-3 py-2 text-sm">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left hover:underline"
                  title="押すと上の欄に入ります（読みを直して登録すると上書きします）"
                  onClick={() => {
                    setWord(r.word);
                    setReading(r.reading);
                  }}
                >
                  <span className="font-medium">{r.word}</span>
                  <span className="mx-2 text-zinc-400">→</span>
                  <span>{r.reading}</span>
                </button>
                <span className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className={btn}
                    disabled={listening !== null}
                    title="辞書を通した読み上げを聞きます"
                    onClick={() => void listen(r.word, r.word)}
                  >
                    {listening === r.word ? "準備中…" : "▶ 聞く"}
                  </button>
                  <button type="button" className={btn} disabled={busy} onClick={() => void send("DELETE", { word: r.word })}>
                    削除
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
