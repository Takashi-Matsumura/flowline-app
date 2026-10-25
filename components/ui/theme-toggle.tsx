"use client";

import { setTheme, useTheme } from "@/lib/theme";

/** ライト／ダークの切り替え。押すたびに入れ替え、選んだ配色はこのブラウザに覚えさせる */
export function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="ダークモード"
      title={dark ? "ライトモードにする" : "ダークモードにする"}
      // サーバーの描画では配色が分からないので、分かるまで押せなくする（見た目の食い違いも避ける）
      disabled={theme === null}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-black/5 disabled:opacity-0 dark:text-zinc-400 dark:hover:bg-white/10"
    >
      <span aria-hidden>{dark ? "☾ ダーク" : "☀ ライト"}</span>
      <span
        aria-hidden
        className={`relative h-4 w-7 rounded-full transition-colors ${dark ? "bg-sky-500" : "bg-zinc-300"}`}
      >
        <span
          // left-0 を付けないと、ボタン既定の text-align: center でトラックの中央が起点になり、右へはみ出す
          className={`absolute top-0.5 left-0 size-3 rounded-full bg-white shadow transition-transform ${
            dark ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
