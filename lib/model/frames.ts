import type { Branch, FlowModel, Step } from "./types";

/**
 * 枠（UML の複合フラグメント）の入れ子をたどる。純粋関数で、描画には依存しない。
 *
 * 枠の場合（Branch）は、外側の枠の場合を parentId で指す。ステップは branchId でいちばん内側の場合を指し、
 * その外側の枠すべてにも属する。「場合の連なり（chain）」は、外側から内側へ並べた場合の列。
 *
 * 保存データや読み込んだファイルは信頼できないので、たどるときは循環・存在しない親で止める
 * （その手前までの連なりにする）。
 */

/** 入れ子の深さの上限（いちばん外の枠が 1）。深すぎると図が読めなくなるので、3 段までにする */
export const MAX_FRAME_DEPTH = 3;

export type BranchIndex = ReadonlyMap<string, Branch>;

export function branchIndex(model: Pick<FlowModel, "branches">): BranchIndex {
  return new Map(model.branches.map((b) => [b.id, b]));
}

/** 場合 armId とその外側の場合を、外側から順に。armId が無ければ空 */
export function armChain(index: BranchIndex, armId: string | null | undefined): Branch[] {
  const chain: Branch[] = [];
  const seenGroups = new Set<string>();
  let arm = armId ? index.get(armId) : undefined;
  while (arm && !seenGroups.has(arm.groupId)) {
    seenGroups.add(arm.groupId);
    chain.unshift(arm);
    arm = arm.parentId ? index.get(arm.parentId) : undefined;
  }
  return chain;
}

/** ステップの属する場合を、外側から順に */
export const stepChain = (index: BranchIndex, step: Pick<Step, "branchId">): Branch[] => armChain(index, step.branchId);

/** 枠（groupId）を囲む外側の場合。いちばん外の枠なら undefined */
export function parentArmOf(model: Pick<FlowModel, "branches">, groupId: string): Branch | undefined {
  const head = model.branches.find((b) => b.groupId === groupId);
  if (!head?.parentId) return undefined;
  const parent = model.branches.find((b) => b.id === head.parentId);
  return parent && parent.groupId !== groupId ? parent : undefined;
}

/** 枠（groupId）の入れ子の深さ。いちばん外の枠が 1。枠が無ければ 0 */
export function frameDepth(model: Pick<FlowModel, "branches">, groupId: string): number {
  const head = model.branches.find((b) => b.groupId === groupId);
  return head ? armChain(branchIndex(model), head.id).length : 0;
}

/** 連なりが場合 armId を通るか（ステップがその場合の中にいるか。内側の枠の中も含む） */
export const chainHasArm = (chain: readonly Branch[], armId: string) => chain.some((b) => b.id === armId);

/** 連なりが枠 groupId を通るか */
export const chainHasGroup = (chain: readonly Branch[], groupId: string) => chain.some((b) => b.groupId === groupId);

/** ステップが場合 armId の中にいるか（内側の枠の中も含む） */
export function isUnderArm(index: BranchIndex, step: Pick<Step, "branchId">, armId: string): boolean {
  return chainHasArm(stepChain(index, step), armId);
}

/** ステップが枠 groupId の中にいるか（内側の枠の中も含む） */
export function isUnderGroup(index: BranchIndex, step: Pick<Step, "branchId">, groupId: string): boolean {
  return chainHasGroup(stepChain(index, step), groupId);
}

/** 場合 armId のすぐ内側にある枠（groupId）。図の並びではなく、作った順 */
export function childGroups(model: Pick<FlowModel, "branches">, armId: string): string[] {
  return [...new Set(model.branches.filter((b) => b.parentId === armId).map((b) => b.groupId))];
}

/** 場合 armId の内側にある枠（孫以下も）の場合すべて */
export function descendantArms(model: Pick<FlowModel, "branches">, armId: string): Branch[] {
  const index = branchIndex(model);
  return model.branches.filter((b) => b.id !== armId && chainHasArm(armChain(index, b.id), armId));
}

/**
 * 図の並び（items）の、枠の開け閉め。外側の枠から順に開き、内側から順に閉じる。
 * - open: 枠を開く（arm はその枠で最初に出てくる場合）
 * - else: 開いている枠の、次の場合へ移る
 * - close: 枠を閉じる（arm は閉じる時点の場合）
 * - item: 並びの 1 つ。depth は開いている枠の数
 * 同じ枠の手順が途中で途切れていても壊れない（そこで閉じて、また開く）。
 */
export type FrameEvent<T> =
  | { type: "open"; arm: Branch; depth: number }
  | { type: "else"; arm: Branch; depth: number }
  | { type: "close"; arm: Branch; depth: number }
  | { type: "item"; item: T; depth: number };

export function walkFrames<T>(items: readonly T[], chainOf: (item: T) => readonly Branch[]): FrameEvent<T>[] {
  const events: FrameEvent<T>[] = [];
  const open: Branch[] = [];
  const closeTo = (depth: number) => {
    while (open.length > depth) {
      const arm = open.pop()!;
      events.push({ type: "close", arm, depth: open.length });
    }
  };
  for (const item of items) {
    const chain = chainOf(item);
    // 同じ場合のままの深さ
    let same = 0;
    while (same < open.length && same < chain.length && open[same].id === chain[same].id) same += 1;
    // 同じ枠の別の場合へ移るなら、その深さまで閉じて else
    if (same < open.length && same < chain.length && open[same].groupId === chain[same].groupId) {
      closeTo(same + 1);
      open[same] = chain[same];
      events.push({ type: "else", arm: chain[same], depth: same });
      same += 1;
    }
    closeTo(same);
    for (let d = open.length; d < chain.length; d += 1) {
      open.push(chain[d]);
      events.push({ type: "open", arm: chain[d], depth: d });
    }
    events.push({ type: "item", item, depth: open.length });
  }
  closeTo(0);
  return events;
}
