"use client";

import { useState } from "react";
import { PanelSection } from "./step-panel";
import { conditionPrefix, frameContainers } from "@/lib/model/branch";
import { MAX_FRAME_DEPTH } from "@/lib/model/frames";
import type { Branch, FlowModel } from "@/lib/model/types";
import { visibleSteps } from "@/lib/render/mermaid";
import { KIND_TEXT, armLabel } from "./branch-section";

/**
 * 分岐（枠）を先に作るフォーム（「＋ 分岐を追加」）。ステップの追加と同じ場所（図の右、狭い画面では下）に出す。
 * 種類と条件だけを決めて空の枠を作り、中のステップはあとから場合ごとに足す。
 * 「もし〜なら」は最初から条件を 2 つ出す（「そうでなければ」まで一度に作れるように）。
 * 選んだステップが枠の中なら、どの枠の中に作るか（入れ子）を選べる。既定はいちばん内側の場合の中。
 */
export function BranchAddPanel({
  model,
  afterStepId,
  parentId,
  onCreate,
  onClose,
}: {
  model: FlowModel;
  /** このステップの直後に作る（選んだ枠の中で、枠を割らない位置）。null なら図の最後 */
  afterStepId: string | null;
  /** この場合の中（の最後）に作る。渡すと afterStepId は使わない */
  parentId: string | null;
  /** parentId: 作る枠を囲む場合（null = どの枠の外） */
  onCreate: (kind: Branch["kind"], conditions: string[], parentId: string | null) => void;
  onClose: () => void;
}) {
  const steps = visibleSteps(model);
  const afterIndex = !parentId && afterStepId ? steps.findIndex((s) => s.id === afterStepId) : -1;
  const after = afterIndex >= 0 ? steps[afterIndex] : undefined;
  const fixedParent = parentId ? model.branches.find((b) => b.id === parentId) : undefined;
  // 作れる場所: どの枠の外か、選んだステップを囲む場合（外側から順）。既定はいちばん内側
  const containers = fixedParent ? [fixedParent] : frameContainers(model, after?.id ?? null);
  const [containerId, setContainerId] = useState<string | null>(containers.at(-1)?.id ?? null);
  const container = containers.find((c) => (c?.id ?? null) === containerId) ?? null;
  // 条件の書き出し。場合分けは直前のステップの結果で分かれることが多いので、そのステップ名を主語にしておく
  // （「〜のときだけ」「〜の間くり返す」には合わないので入れない）
  const altPrefix = after ? conditionPrefix(after.label) : "";
  const [kind, setKind] = useState<Branch["kind"]>("alt");
  const [conditions, setConditions] = useState<string[]>([altPrefix, altPrefix]);
  const prefix = kind === "alt" ? altPrefix : "";
  const used = kind === "alt" ? conditions : conditions.slice(0, 1);
  const filled = (c: string) => c.trim() !== "" && c.trim() !== prefix.trim();
  const ready = used.every(filled);
  // 押せない理由（ボタンの横に出す）
  const missing = used.findIndex((c) => !filled(c));
  const hint =
    missing < 0
      ? null
      : used[missing].trim() !== "" && prefix !== ""
        ? `${used.length > 1 ? `${missing + 1} つ目の` : ""}条件の続きを書いてください`
        : `${used.length > 1 ? `${missing + 1} つ目の` : ""}条件を書いてください`;
  /** 種類を変えたら、書き出しを入れ直す（場合分けにだけ入れる）。書いた条件はそのまま */
  const changeKind = (next: Branch["kind"]) => {
    setKind(next);
    setConditions((cs) =>
      cs.map((c) => (next !== "alt" && c === altPrefix ? "" : next === "alt" && c === "" ? altPrefix : c)),
    );
  };
  const position = fixedParent
    ? `${armLabel(fixedParent)}の中に作ります`
    : after
      ? `${afterIndex + 1} 番の後に作ります`
      : "図の最後に作ります";
  const text = KIND_TEXT[kind];
  const submit = () => {
    if (ready) onCreate(kind, used, container?.id ?? null);
  };
  const setAt = (i: number, value: string) => setConditions((cs) => cs.map((c, k) => (k === i ? value : c)));

  return (
    <aside
      aria-label="分岐の追加"
      className="flex shrink-0 flex-col border-t border-black/10 text-sm lg:w-80 lg:border-l lg:border-t-0 dark:border-white/15"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="font-medium">分岐の追加</h2>
        <button
          type="button"
          aria-label="閉じる"
          className="rounded px-2 py-0.5 text-zinc-500 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="px-4 pb-2 text-xs text-zinc-500" title="図の番号を選んでから追加すると、その後に作ります">
        {position}
      </p>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        // 変換を確定する Enter で作らない（Safari は変換中の Enter でもフォームを送る）
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.nativeEvent.isComposing) e.preventDefault();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-2">
          <PanelSection title="どんな分岐ですか？">
            {(Object.keys(KIND_TEXT) as Branch["kind"][]).map((k) => (
              <label
                key={k}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-black/15 px-3 py-2 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 dark:border-white/20 dark:has-[:checked]:bg-sky-500/10"
              >
                <input type="radio" name="frame-kind" className="mt-1" checked={kind === k} onChange={() => changeKind(k)} />
                <span className="flex flex-col">
                  <span className="text-sm">{KIND_TEXT[k].title}</span>
                  <span className="text-xs text-zinc-500">{KIND_TEXT[k].example}</span>
                </span>
              </label>
            ))}
          </PanelSection>

          {containers.length > 1 && (
            <PanelSection title="どこに作りますか？">
              {containers.map((c) => (
                <label
                  key={c?.id ?? "top"}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-black/15 px-3 py-2 has-[:checked]:border-sky-500 has-[:checked]:bg-sky-50 dark:border-white/20 dark:has-[:checked]:bg-sky-500/10"
                >
                  <input
                    type="radio"
                    name="frame-container"
                    className="mt-1"
                    checked={(c?.id ?? null) === containerId}
                    onChange={() => setContainerId(c?.id ?? null)}
                  />
                  <span className="flex flex-col">
                    <span className="text-sm">{c ? `${armLabel(c)}の中` : "どの枠にも入れない"}</span>
                    <span className="text-xs text-zinc-500">
                      {(c?.id ?? null) === (after?.branchId ?? null)
                        ? `${afterIndex + 1} 番のすぐ後に作ります`
                        : `${afterIndex + 1} 番を囲む枠の後に作ります`}
                    </span>
                  </span>
                </label>
              ))}
              <p className="text-xs text-zinc-500">
                枠の中に枠を作ると、入れ子になります（くり返しの中の場合分けなど）。{MAX_FRAME_DEPTH} 段まで作れます。
              </p>
            </PanelSection>
          )}

          <PanelSection title={kind === "alt" ? "場合ごとの条件" : "条件"}>
            {used.map((c, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                  {/* 「もし［　］なら」の形を、欄の上に書く（欄は全幅にして、長い条件も全部見えるようにする） */}
                  <span>
                    {i > 0 ? "そうでなく" : text.before}［　］{text.after}
                  </span>
                  {kind === "alt" && used.length > 2 && (
                    <button
                      type="button"
                      aria-label={`${i + 1} つ目の場合を消す`}
                      className="shrink-0 rounded px-1 text-zinc-400 hover:bg-black/5 hover:text-zinc-600 dark:hover:bg-white/10"
                      onClick={() => setConditions((cs) => cs.filter((_, k) => k !== i))}
                    >
                      ×
                    </button>
                  )}
                </div>
                <textarea
                  autoFocus={i === 0}
                  rows={1}
                  aria-label={`${i + 1} つ目の条件`}
                  className={`w-full resize-none rounded-md border bg-transparent px-3 py-1.5 text-sm [field-sizing:content] ${
                    missing === i && c.trim() !== "" ? "border-amber-500" : "border-black/15 dark:border-white/20"
                  }`}
                  value={c}
                  placeholder={kind === "loop" ? "不備がなくなるまで" : i === 0 ? "不備がある" : "不備がない"}
                  onFocus={(e) => {
                    const n = e.currentTarget.value.length;
                    e.currentTarget.setSelectionRange(n, n);
                  }}
                  // 条件は 1 行の文。Enter は改行ではなく「分岐を作る」
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  onChange={(e) => setAt(i, e.target.value.replace(/\n/g, ""))}
                />
              </div>
            ))}
            {kind === "alt" && (
              <button
                type="button"
                className="w-fit rounded-md px-2 py-1 text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/10"
                onClick={() => setConditions((cs) => [...cs, altPrefix])}
              >
                ＋ 場合を足す
              </button>
            )}
            <p className="text-xs text-zinc-500">中のステップは、作ったあとに場合ごとに足します。</p>
          </PanelSection>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 px-4 py-3 dark:border-white/15">
          {hint && (
            <span role="status" className="mr-auto text-xs text-amber-700 dark:text-amber-300">
              {hint}
            </span>
          )}
          <button
            type="submit"
            className="shrink-0 whitespace-nowrap rounded-md bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:opacity-40 disabled:hover:bg-sky-600"
            disabled={!ready}
          >
            分岐を作る
          </button>
        </div>
      </form>
    </aside>
  );
}
