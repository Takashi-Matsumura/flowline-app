"use client";

/**
 * アイコンだけのボタン。何をするかは、マウスを乗せる（キーボードで選ぶ）と出る吹き出しで伝える。
 * 読み上げソフト向けに同じ文を aria-label にも入れる。
 *
 * 押せることが一目で分かるよう、白い面・枠・影で浮かせ、乗せると色が付く。
 * `tone="danger"` は削除など取り消せない操作で、乗せると赤くなる。
 * 吹き出しはボタンの右端にそろえて左へ広げる（表の右端の列に置いても、表の外へはみ出さない）。
 */
export function IconButton({
  label,
  onClick,
  disabled = false,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const hover =
    tone === "danger"
      ? "hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-400/50 dark:hover:bg-red-400/10 dark:hover:text-red-300"
      : "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:hover:border-sky-400/50 dark:hover:bg-sky-400/10 dark:hover:text-sky-300";
  return (
    <span className="group/tip relative inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex size-8 items-center justify-center rounded-md border border-black/15 bg-white text-zinc-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500 disabled:opacity-40 disabled:shadow-none dark:border-white/20 dark:bg-zinc-900 dark:text-zinc-200 ${disabled ? "" : hover}`}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 whitespace-nowrap rounded bg-zinc-800 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity delay-150 group-hover/tip:opacity-100 group-focus-within/tip:opacity-100 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {label}
      </span>
    </span>
  );
}
