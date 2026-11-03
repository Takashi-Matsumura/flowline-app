"use client";

import { useState } from "react";

/** 選べる読み上げの声（/api/tts の GET）。`credit` は画面に出す表記（VOICEVOX の利用規約で要る） */
export type Voice = { id: number; name: string; credit: string };

export type Tts =
  | { status: "loading" }
  | { status: "ready"; voices: Voice[]; defaultId: number }
  | { status: "error"; message: string };

/** 選べる声を引く。古いサーバ（voices が無い）なら、既定の声 1 つとして扱う */
export async function fetchVoices(signal: AbortSignal): Promise<Tts> {
  const res = await fetch("/api/tts", { signal });
  const json = (await res.json().catch(() => ({}))) as {
    credit?: string;
    default?: number;
    voices?: Voice[];
    error?: string;
  };
  if (!res.ok || !json.credit) return { status: "error", message: json.error ?? `HTTP ${res.status}` };
  const defaultId = json.default ?? -1;
  const voices = json.voices?.length
    ? json.voices
    : [{ id: defaultId, name: json.credit.replace(/^VOICEVOX:/, ""), credit: json.credit }];
  return { status: "ready", voices, defaultId };
}

const STORAGE_KEY = "flowline.voice";

/**
 * 選んだ声。フローの再生と使い方の動画で共通にし、この端末のブラウザに覚えておく。
 * 覚えた声がもう選べなければ、サーバの既定の声に戻す。
 */
export function useVoiceChoice(tts: Tts): { voice: Voice | null; choose: (id: number) => void } {
  const [chosen, setChosen] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const n = Number(window.localStorage.getItem(STORAGE_KEY));
      return Number.isInteger(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  });
  const voice =
    tts.status === "ready"
      ? (tts.voices.find((v) => v.id === chosen) ?? tts.voices.find((v) => v.id === tts.defaultId) ?? tts.voices[0])
      : null;
  function choose(id: number) {
    setChosen(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // 保存できなくても、この画面の間は選んだ声で読む
    }
  }
  return { voice: voice ?? null, choose };
}

/** 声の選択。選べる声が 1 つなら出さない */
export function VoiceSelect({ tts, voice, choose }: { tts: Tts; voice: Voice | null; choose: (id: number) => void }) {
  if (tts.status !== "ready" || tts.voices.length < 2 || !voice) return null;
  return (
    <select
      aria-label="読み上げの声"
      value={voice.id}
      onChange={(e) => choose(Number(e.target.value))}
      className="rounded-md border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
    >
      {tts.voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}
