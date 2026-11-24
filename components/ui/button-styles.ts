/**
 * 文字付きボタンの見た目（一覧画面と編集画面でそろえる）。
 * 押せるボタンは白い面・枠・影で浮かせ、乗せると青くなる。主な操作は青で塗る。
 * 乗せたときの色は押せないときには付けない（`not-disabled:`）。<summary> にも使える。
 * アイコンだけのボタンは components/ui/icon-button.tsx。
 */
const base =
  "inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500 disabled:opacity-50 disabled:shadow-none";

export const outlineBtn = `${base} border-black/15 bg-white not-disabled:hover:border-sky-300 not-disabled:hover:bg-sky-50 not-disabled:hover:text-sky-700 dark:border-white/20 dark:bg-zinc-900 dark:not-disabled:hover:border-sky-400/50 dark:not-disabled:hover:bg-sky-400/10 dark:not-disabled:hover:text-sky-300`;

/** 押している状態（点検パネルを開いている など）の outlineBtn */
export const outlineBtnPressed = `${base} border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-400/10 dark:text-sky-300`;

export const primaryBtn = `${base} border-sky-600 bg-sky-600 font-medium text-white not-disabled:hover:bg-sky-700 disabled:border-black/15 disabled:bg-transparent disabled:font-normal disabled:text-zinc-400 disabled:opacity-100 dark:border-sky-500 dark:bg-sky-500 dark:not-disabled:hover:bg-sky-600 dark:disabled:border-white/20`;

/** 開閉する <summary> 用（三角の印を消す） */
export const summaryBtn = `${outlineBtn} list-none [&::-webkit-details-marker]:hidden`;
