"use client";

import type { NoteMark, NoteMarks } from "@/lib/model/notes";

/**
 * 図に重ねて出す付箋。印の位置（MermaidDiagram が描いた SVG の印を測ったもの）に付箋のアイコンを置き、
 * 押すと、その手順・枠・登場人物に貼られた付箋の中身を開いて見せる。
 * どれを開いているかは呼び出し側が持つ（ツールバーの「付箋をすべて開く／閉じる」から変えるため）。
 *
 * 図の上に重ねるだけで、書き出す図には入らない。中身の書き換えは編集パネルで行う（「編集する」で開く）。
 */

/** 印の場所。key は "step:3" / "frame:0" / "fold:1" / "actor:A2"（noteKey）。x, y は図の外枠の左上からの px（印の中心） */
export type NoteAnchor = { key: string; x: number; y: number };

/** 付箋の印を、どこの印かの key にする（SVG の印にも同じ key を付けて、位置を測る） */
export const noteKey = (kind: "step" | "frame" | "fold" | "actor", id: string | number) => `${kind}:${id}`;

/** 図に出る付箋の印、すべての key（「付箋をすべて開く」用） */
export function noteKeys(notes: NoteMarks): string[] {
  return [
    ...[...notes.steps.keys()].map((n) => noteKey("step", n)),
    ...[...notes.frames.keys()].map((i) => noteKey("frame", i)),
    ...[...notes.folds.keys()].map((k) => noteKey("fold", k)),
    ...[...notes.actors.keys()].map((id) => noteKey("actor", id)),
  ];
}

const WHAT = { step: "手順", frame: "枠", fold: "畳んだ枠", actor: "登場人物" } as const;

/** 開いた中身の幅（px）。右端に近い印は、左へ開く */
const CARD_W = 288;

function lookup(notes: NoteMarks, key: string): { what: string; mark: NoteMark } | null {
  const i = key.indexOf(":");
  const kind = key.slice(0, i) as keyof typeof WHAT;
  const id = key.slice(i + 1);
  const mark =
    kind === "step"
      ? notes.steps.get(Number(id))
      : kind === "frame"
        ? notes.frames.get(Number(id))
        : kind === "fold"
          ? notes.folds.get(Number(id))
          : kind === "actor"
            ? notes.actors.get(id)
            : undefined;
  return mark ? { what: WHAT[kind], mark } : null;
}

export function NoteOverlay({
  anchors,
  notes,
  width,
  open,
  onOpenChange,
  onEdit,
}: {
  anchors: NoteAnchor[];
  notes: NoteMarks;
  /** 図の外枠の幅（px）。開く向きを決める */
  width: number;
  /** 中身を開いている付箋（noteKey） */
  open: ReadonlySet<string>;
  onOpenChange: (next: ReadonlySet<string>) => void;
  /** 「編集する」を押したとき（手順・枠のみ。登場人物の付箋は「登場人物を編集」から直す） */
  onEdit?: (key: string) => void;
}) {
  const toggle = (key: string) => {
    const next = new Set(open);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onOpenChange(next);
  };

  return (
    <div className="pointer-events-none absolute inset-0">
      {anchors.map(({ key, x, y }) => {
        const found = lookup(notes, key);
        if (!found) return null;
        const { what, mark } = found;
        const isOpen = open.has(key);
        const pending = mark.state === "open";
        const toLeft = x + 14 + CARD_W > width;
        return (
          <div key={key} className={`absolute ${isOpen ? "z-20" : "z-10"}`} style={{ left: x, top: y }}>
            <button
              type="button"
              aria-expanded={isOpen}
              title={`${what}の付箋（${mark.notes.length} 件）: ${pending ? "まだ決まっていないことがあります" : "決まりごとがあります"}`}
              onClick={() => toggle(key)}
              className={`pointer-events-auto absolute -left-[9px] -top-[9px] flex h-[18px] min-w-[18px] items-center justify-center rounded-sm rounded-br-[6px] border px-0.5 text-[10px] font-bold leading-none shadow-sm transition-transform hover:scale-110 ${
                pending
                  ? "border-yellow-600 bg-yellow-300 text-yellow-900"
                  : "border-green-600 bg-green-200 text-green-900"
              } ${isOpen ? "ring-2 ring-sky-400" : ""}`}
            >
              {mark.notes.length > 1 ? mark.notes.length : pending ? "?" : "✓"}
            </button>
            {isOpen && (
              <div
                role="dialog"
                aria-label={`${what}の付箋`}
                className="pointer-events-auto absolute top-[-9px] rounded-md border border-yellow-300 bg-yellow-50 p-2.5 text-left text-xs text-zinc-800 shadow-lg dark:border-yellow-700 dark:bg-zinc-900 dark:text-zinc-100"
                style={{ width: CARD_W, ...(toLeft ? { right: 14 } : { left: 14 }) }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                    {what}の付箋 {mark.notes.length} 件
                  </span>
                  <button
                    type="button"
                    aria-label="閉じる"
                    onClick={() => toggle(key)}
                    className="rounded px-1 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
                <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
                  {mark.notes.map((n) => {
                    const answered = n.status === "answered";
                    return (
                      <li
                        key={n.id}
                        className="rounded border border-black/5 bg-white/70 p-1.5 dark:border-white/10 dark:bg-white/5"
                      >
                        <span
                          className={`mr-1.5 inline-block rounded px-1 text-[10px] font-semibold ${
                            answered
                              ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                          }`}
                        >
                          {answered ? "決定" : "未決"}
                        </span>
                        <span className="whitespace-pre-wrap">{n.question}</span>
                        {n.answer && (
                          <p className="mt-1 whitespace-pre-wrap border-l-2 border-green-400 pl-1.5 text-zinc-700 dark:text-zinc-300">
                            {n.answer}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {onEdit && !key.startsWith("actor:") && (
                  <button
                    type="button"
                    onClick={() => onEdit(key)}
                    className="mt-2 text-sky-700 hover:underline dark:text-sky-400"
                  >
                    編集する
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
