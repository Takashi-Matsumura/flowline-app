"use client";

import { useEffect } from "react";

/**
 * 聞こえない音（約 -70 dB のノイズ）の音量。完全な無音だと、ブラウザや OS が
 * 「鳴っていない」とみなして出力を止めることがあるので、ごく小さく鳴らし続ける。
 */
const KEEP_ALIVE_GAIN = 0.0003;

/**
 * 読み上げのあいだ、音声の出力先を起こしておく。
 *
 * Windows の HDMI 音声などは、無音が続くと省電力で出力を止め、次の音の出だしで復帰する。
 * その復帰のあいだに読み上げの頭が欠けたり、つまったりする。
 * `active` の間は聞こえない音を流し続けて、出力を止めさせない。
 * 開くボタンを押した直後に呼ばれる前提（ブラウザの自動再生の制限に掛からない）。
 */
export function useAudioKeepAlive(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined" || !("AudioContext" in window)) return;
    const ctx = new AudioContext();
    // 1 秒ぶんのノイズを繰り返す
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = KEEP_ALIVE_GAIN;
    source.connect(gain).connect(ctx.destination);
    source.start();
    // 自動再生の制限で止まった状態で作られたら、動かし直す（失敗しても読み上げには影響しない）
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return () => {
      source.stop();
      ctx.close().catch(() => {});
    };
  }, [active]);
}
