/**
 * 配色（lib/theme.ts）のうち、サーバーの app/layout.tsx からも使う部分。
 * "use client" のモジュールから文字列を export しても、サーバーではクライアント参照になって中身を読めないため分ける。
 */

export const THEME_KEY = "flowline:theme";

/**
 * 描画前に `<html>` へ `dark` クラスを付けるスクリプト（app/layout.tsx の <head> に埋める）。
 * 選んでいない間は、OS の設定が変わるたびに付け直す。
 */
export const THEME_INIT_SCRIPT = `(() => {
  const key = ${JSON.stringify(THEME_KEY)};
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const apply = () => {
    const t = saved();
    document.documentElement.classList.toggle("dark", t === "dark" || (t !== "light" && media.matches));
  };
  apply();
  media.addEventListener("change", apply);
})();`;
