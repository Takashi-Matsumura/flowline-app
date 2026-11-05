import { armChain } from "./frames";
import type { Branch, ModelOp, Step } from "./types";

/**
 * 図の並び（visibleSteps の順）で index のステップを、insertAt の位置へ移す ops。
 * insertAt は「移す前の並びで、何番目のステップの手前に入れるか」（0 = 先頭、steps.length = 末尾）。
 *
 * order は実数なので、移した先の前後のステップの間の値にする（他のステップは動かさない）。
 * 入れられる場合は、前後のステップの位置で決まる（枠を 2 つに割らない場合だけ）:
 * 前後に共通する、いちばん内側の場合（どの枠にも共通しなければ枠の外）と、前のステップを囲む枠の末尾・
 * 後ろのステップを囲む枠の先頭。ただし前後が同じ枠の別の場合なら、その境目なので、どちらかの場合の中。
 * その中から、`target`（落とした点が図のどの場合の中にあったか。null = どの枠の外）を選ぶ。枠の下端の
 * 「最後のステップの直後」と「枠の直後」は同じ並びの位置なので、位置だけでは分からないため。
 * target が入れられないなら、前後が同じ場合ならその場合、元の場合に入れられるなら元のまま、
 * どちらでもなければ前後に共通する場合（枠の外へ落としたのに、枠ごと付いてこないように）。
 * branches は枠の入れ子をたどるのに使う（Branch.parentId）。位置も分岐も変わらなければ []。
 */
export function moveStepOps(
  steps: Step[],
  index: number,
  insertAt: number,
  target?: Branch | null,
  branches: readonly Branch[] = [],
): ModelOp[] {
  const step = steps[index];
  if (!step || insertAt < 0 || insertAt > steps.length) return [];
  const samePlace = insertAt === index || insertAt === index + 1;
  // 場合の指定が無ければ、同じ位置への移動は何もしない（分岐だけを変える手がかりが無い）
  if (samePlace && target === undefined) return [];

  const rest = steps.filter((_, i) => i !== index);
  const at = insertAt > index ? insertAt - 1 : insertAt;
  const prev = rest[at - 1];
  const next = rest[at];
  const order =
    prev && next ? (prev.order + next.order) / 2 : prev ? prev.order + 1 : next ? next.order - 1 : step.order;

  const byId = new Map(branches.map((b) => [b.id, b]));
  // 枠の情報が無い（古い呼び出し）ときも、ステップの場合だけは 1 段の枠として扱う
  const chainOf = (s: Step | undefined): Branch[] => {
    if (!s?.branchId) return [];
    const chain = armChain(byId, s.branchId);
    return chain.length > 0 ? chain : [{ id: s.branchId, groupId: s.branchId, kind: "alt", condition: "", index: 0 }];
  };
  const before = chainOf(prev);
  const after = chainOf(next);
  let c = 0;
  while (c < before.length && c < after.length && before[c].id === after[c].id) c += 1;
  const common = c > 0 ? before[c - 1].id : null;
  // 前後が同じ枠の別の場合: その境目には、枠の外側の場合として置けない（枠が割れる）
  const boundary = before[c] !== undefined && after[c] !== undefined && before[c].groupId === after[c].groupId;
  const allowed = new Set<string | null>([
    ...(boundary ? [] : [common]),
    ...before.slice(c).map((b) => b.id),
    ...after.slice(c).map((b) => b.id),
  ]);

  let branchId: string | null;
  const targetId = target === undefined ? undefined : (target?.id ?? null);
  if (targetId !== undefined && allowed.has(targetId)) branchId = targetId;
  else if (before.length === c && after.length === c && (prev || next)) branchId = common;
  else if (allowed.has(step.branchId)) branchId = step.branchId;
  else branchId = boundary ? before[c].id : common;

  if (samePlace && branchId === step.branchId) return [];
  if (samePlace) return [{ op: "step.update", id: step.id, patch: { branchId } }];
  return [
    {
      op: "step.update",
      id: step.id,
      patch: branchId === step.branchId ? { order } : { order, branchId },
    },
  ];
}
