"use client";

/**
 * アイコンだけのボタン。何をするかは、マウスを乗せる（キーボードで選ぶ）と出る吹き出しで伝える。
 * 読み上げソフト向けに同じ文を aria-label にも入れる。
 *
 * 押せることが一目で分かるよう、白い面・枠・影で浮かせ、乗せると色が付く。
 * `tone="danger"` は削除など取り消せない操作で、乗せると赤くなる。
 * 吹き出しは既定でボタンの上・右端そろえ（表の右端の列に置いても、表の外へはみ出さない）。
 * 画面上端のツールバーでは `tip="below"`、左寄りに置くときは `tipAlign="left"` にする。
 * `pressed` を渡すと押しっぱなしのボタン（開く/閉じるの切り替え）になり、押している間は青くなる。
 */
export function IconButton({
  label,
  onClick,
  disabled = false,
  tone = "default",
  tip = "above",
  tipAlign = "right",
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  tip?: "above" | "below";
  tipAlign?: "left" | "right";
  pressed?: boolean;
  children: React.ReactNode;
}) {
  const hover =
    tone === "danger"
      ? "hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-400/50 dark:hover:bg-red-400/10 dark:hover:text-red-300"
      : "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:border-sky-400/50 dark:hover:bg-sky-400/10 dark:hover:text-sky-300";
  const on = "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-400/10 dark:text-sky-300";
  const place = `${tip === "below" ? "top-full mt-1.5" : "bottom-full mb-1.5"} ${tipAlign === "left" ? "left-0" : "right-0"}`;
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex size-8 items-center justify-center rounded-md border border-black/15 bg-white text-zinc-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500 disabled:opacity-40 disabled:shadow-none dark:border-white/20 dark:bg-zinc-900 dark:text-zinc-200 ${pressed ? on : ""} ${disabled ? "" : hover}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${place} z-20 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity delay-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 dark:bg-zinc-100 dark:text-zinc-900`}
      >
        {label}
      </span>
    </span>
  );
}
