"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-script";

/**
 * 画面の配色（ライト／ダーク）。`<html>` の `dark` クラスで切り替える（globals.css の `@custom-variant dark`）。
 *
 * - 選んだ配色は、このブラウザの `localStorage` に覚えさせる（見え方の好みなので、図のデータには入れない）
 * - 選んでいなければ OS の設定に従い、OS の設定が変わったら追従する
 * - 最初の描画で白く光らないよう、クラスは app/layout.tsx の THEME_INIT_SCRIPT（theme-script.ts）が描画前に付ける
 */

export type Theme = "light" | "dark";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** 今の配色。サーバーの描画ではまだ分からないので null */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, currentTheme, () => null);
}

export function setTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // プライベートウィンドウ等で書けないときは、この画面の間だけ切り替える
  }
}
