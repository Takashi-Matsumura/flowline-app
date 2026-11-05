import { visibleSteps } from "@/lib/render/mermaid";
import {
  armChain,
  branchIndex,
  chainHasArm,
  isUnderArm,
  MAX_FRAME_DEPTH,
  stepChain,
} from "./frames";
import type { Branch, FlowModel, ModelOp, Step, StepId } from "./types";

/**
 * 分岐（枠）を手で組み立てる ops。純粋関数（編集画面の分岐の操作）。
 * 枠は先に空で作り（addFrameOps）、あとから場合ごとにステップを足す（add-step.ts の into）。
 *
 * 枠は「図の並びで連続しているステップ」を囲んで描かれる（toMermaid）。同じ枠（groupId）の
 * ステップが途中で途切れると枠が 2 つに割れるので、枠に出し入れするときは order も動かして、
 * 枠の中身が連続したままになるようにする。場合（alt の else）は index の順に並べる。
 *
 * 枠は入れ子にできる（Branch.parentId。lib/model/frames.ts）。場合の「中身」は、内側の枠の中の
 * ステップと、中身の無い内側の枠の位置も含む。外側の枠の中身も連続したままになるように動かす。
 */

export const BRANCH_KINDS: { kind: Branch["kind"]; label: string; hint: string }[] = [
  { kind: "alt", label: "場合分け", hint: "条件によってやることが変わる（もし〜なら / そうでなければ）" },
  { kind: "opt", label: "やるときだけ", hint: "条件を満たすときだけやる" },
  { kind: "loop", label: "繰り返し", hint: "条件を満たす間、繰り返す" },
];

export const branchKindLabel = (kind: Branch["kind"]) => BRANCH_KINDS.find((k) => k.kind === kind)?.label ?? kind;

function nextId(prefix: string, ids: string[]): string {
  const used = ids.map((id) => Number(new RegExp(`^${prefix}(\\d+)$`).exec(id)?.[1] ?? 0));
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

/** 枠（groupId）の場合を index 順に */
export function groupArms(model: FlowModel, groupId: string): Branch[] {
  return model.branches.filter((b) => b.groupId === groupId).sort((a, b) => a.index - b.index);
}

/** 中にステップが 1 つも無い（内側の枠の中にも無い）枠。図の上の位置は、場合の order で決まる */
function emptyFrames(model: FlowModel, steps: Step[]): Branch[][] {
  const index = branchIndex(model);
  const filled = new Set(steps.flatMap((s) => stepChain(index, s).map((b) => b.groupId)));
  const groups = new Map<string, Branch[]>();
  for (const b of model.branches) groups.set(b.groupId, [...(groups.get(b.groupId) ?? []), b]);
  return [...groups.entries()].filter(([g]) => !filled.has(g)).map(([, arms]) => arms);
}

/** 中にステップが 1 つも無い枠の、置き場所（order）。図の並びの中で、ステップと同じ物差しで数える */
function emptyFrameOrders(model: FlowModel, steps: Step[]): number[] {
  return emptyFrames(model, steps).flatMap((arms) => arms.flatMap((b) => (b.order !== undefined ? [b.order] : [])));
}

/** 場合 armId の中身の位置（中のステップ・内側の枠の中のステップ・中身の無い内側の枠） */
function armPositions(model: FlowModel, steps: Step[], armId: string): number[] {
  const index = branchIndex(model);
  const own = steps.filter((s) => isUnderArm(index, s, armId)).map((s) => s.order);
  const empty = emptyFrames(model, steps)
    .filter((arms) => chainHasArm(armChain(index, arms[0].parentId), armId))
    .flatMap((arms) => arms.flatMap((b) => (b.order !== undefined ? [b.order] : [])));
  return [...own, ...empty];
}

/** 枠 groupId の中身の位置（すべての場合） */
function groupPositions(model: FlowModel, steps: Step[], groupId: string): number[] {
  return groupArms(model, groupId).flatMap((b) => armPositions(model, steps, b.id));
}

/** o より後ろで、いちばん近い位置（ステップか、空の枠）。無ければ undefined */
function nextOrderAfter(model: FlowModel, steps: Step[], o: number): number | undefined {
  const later = [...steps.map((s) => s.order), ...emptyFrameOrders(model, steps)].filter((x) => x > o);
  return later.length > 0 ? Math.min(...later) : undefined;
}

/** o より前で、いちばん近い位置（ステップか、空の枠）。無ければ undefined */
function prevOrderBefore(model: FlowModel, steps: Step[], o: number): number | undefined {
  const earlier = [...steps.map((s) => s.order), ...emptyFrameOrders(model, steps)].filter((x) => x < o);
  return earlier.length > 0 ? Math.max(...earlier) : undefined;
}

/** a と b の間（b が無ければ a の 1 つ後ろ） */
const between = (a: number, b: number | undefined) => (b === undefined ? a + 1 : (a + b) / 2);

/** o の直後で、次のステップ・空の枠とのあいだの位置 */
export function orderJustAfter(model: FlowModel, o: number): number {
  const steps = visibleSteps(model);
  return between(o, nextOrderAfter(model, steps, o));
}

/** 図のいちばん最後の位置（空の枠も含めて数える） */
export function endOrder(model: FlowModel): number {
  const steps = visibleSteps(model);
  return Math.max(0, ...steps.map((s) => s.order), ...emptyFrameOrders(model, steps)) + 1;
}

/**
 * afterStepId のステップの直後の位置で、場合 container の中（null = どの枠の外）。
 * ステップが container の内側の枠の中にいるなら、その枠の直後（container の中で、枠を割らない位置）。
 * container がステップのいちばん内側の場合なら、ステップのすぐ後ろ。
 * container がステップの外側の場合でなければ、どの枠の外として扱う。afterStepId が無い・見つからないときは図の最後。
 */
export function orderAfterStep(
  model: FlowModel,
  afterStepId: StepId | null | undefined,
  container: string | null = null,
): number {
  const steps = visibleSteps(model);
  const at = afterStepId ? steps.find((s) => s.id === afterStepId) : undefined;
  if (!at) return endOrder(model);
  const chain = stepChain(branchIndex(model), at);
  const depth = container === null ? -1 : chain.findIndex((b) => b.id === container);
  // container の中で、ステップを囲んでいる枠（無ければステップそのもの）
  const frame = chain[depth + 1];
  const last = frame ? Math.max(at.order, ...groupPositions(model, steps, frame.groupId)) : at.order;
  return between(last, nextOrderAfter(model, steps, last));
}

/**
 * afterStepId の直後に枠を作るとき、どの場合の中に作れるか。null（どの枠の外）と、ステップを囲む場合を
 * 外側から順に。入れ子の深さが上限に届く場合（その中には作れない）は除く。
 */
export function frameContainers(model: FlowModel, afterStepId: StepId | null): (Branch | null)[] {
  const at = afterStepId ? visibleSteps(model).find((s) => s.id === afterStepId) : undefined;
  const chain = at ? stepChain(branchIndex(model), at) : [];
  return [null, ...chain.filter((_, i) => i + 1 < MAX_FRAME_DEPTH)];
}

/** 場合 armId の中に、さらに枠を作れるか（入れ子の深さの上限） */
export function canNestIn(model: FlowModel, armId: string): boolean {
  return armChain(branchIndex(model), armId).length < MAX_FRAME_DEPTH;
}

/**
 * 場合（branchId）の最後にステップ（や枠）を足すときの order。場合が空なら、同じ枠の前の場合の後ろ
 * （無ければ後ろの場合の手前、枠がまるごと空なら枠の位置）。中身は内側の枠も含めて数える。
 */
export function orderInArm(model: FlowModel, branchId: string): number | undefined {
  const branch = model.branches.find((b) => b.id === branchId);
  if (!branch) return undefined;
  const steps = visibleSteps(model);
  const own = armPositions(model, steps, branchId);
  if (own.length > 0) {
    const last = Math.max(...own);
    return between(last, nextOrderAfter(model, steps, last));
  }
  const arms = groupArms(model, branch.groupId);
  const i = arms.findIndex((b) => b.id === branchId);
  for (const b of arms.slice(0, i).reverse()) {
    const pos = armPositions(model, steps, b.id);
    if (pos.length > 0) {
      const last = Math.max(...pos);
      return between(last, nextOrderAfter(model, steps, last));
    }
  }
  for (const b of arms.slice(i + 1)) {
    const pos = armPositions(model, steps, b.id);
    if (pos.length > 0) {
      const first = Math.min(...pos);
      const prev = prevOrderBefore(model, steps, first);
      return prev === undefined ? first - 1 : (prev + first) / 2;
    }
  }
  return arms.find((b) => b.order !== undefined)?.order;
}

/**
 * 空の枠を新しく作る（「＋ 分岐を追加」）。conditions の数だけ場合を作る（場合分け以外は 1 つ）。
 * parentId（外側の枠の場合）を渡すと、その中に作る（入れ子）。置き場所は afterStepId の直後
 * （parentId の中で、枠を割らない位置。orderAfterStep）。afterStepId が無ければ、parentId の最後
 * （parentId も無ければ図の最後）。中のステップは、あとから場合ごとに足す。
 * 作った場合の id を、上から順に返す。入れ子の深さが上限を超えるなら作らない。
 */
export function addFrameOps(
  model: FlowModel,
  kind: Branch["kind"],
  conditions: string[],
  afterStepId: StepId | null,
  parentId: string | null = null,
): { ops: ModelOp[]; armIds: string[] } {
  const texts = conditions.map((c) => c.replace(/\s+/g, " ").trim()).filter((c) => c !== "");
  const used = kind === "alt" ? texts : texts.slice(0, 1);
  const parent = parentId ? model.branches.find((b) => b.id === parentId) : undefined;
  if (used.length === 0 || (parentId && (!parent || !canNestIn(model, parentId)))) return { ops: [], armIds: [] };
  const order =
    afterStepId === null && parent ? (orderInArm(model, parent.id) ?? endOrder(model)) : orderAfterStep(model, afterStepId, parentId);
  const groupId = nextId("G", model.branches.map((b) => b.groupId));
  const ids = model.branches.map((b) => b.id);
  const arms: Branch[] = used.map((condition, index) => {
    const id = nextId("B", ids);
    ids.push(id);
    return { id, kind, condition, groupId, index, order, ...(parent ? { parentId: parent.id } : {}) };
  });
  return { ops: arms.map((branch) => ({ op: "branch.add", branch })), armIds: arms.map((b) => b.id) };
}

/** 場合分けに、空の場合を 1 つ足す（「そうでなければ」）。いちばん下に入る。 */
export function addEmptyArmOps(model: FlowModel, groupId: string, condition: string): ModelOp[] {
  const arms = groupArms(model, groupId);
  const text = condition.replace(/\s+/g, " ").trim();
  if (arms.length === 0 || arms[0].kind !== "alt" || text === "") return [];
  const order = arms.find((b) => b.order !== undefined)?.order;
  const branch: Branch = {
    id: nextId("B", model.branches.map((b) => b.id)),
    kind: "alt",
    condition: text,
    groupId,
    index: Math.max(...arms.map((b) => b.index)) + 1,
    ...(order !== undefined ? { order } : {}),
    // 同じ枠の場合は、同じ外側の枠の中にいる
    ...(arms[0].parentId ? { parentId: arms[0].parentId } : {}),
  };
  return [{ op: "branch.add", branch }];
}

/** 場合に中身（ステップ・内側の枠）があるか */
export function armHasContent(model: FlowModel, armId: string): boolean {
  return armPositions(model, visibleSteps(model), armId).length > 0 || model.branches.some((b) => b.parentId === armId);
}

/**
 * ステップを、いまいる枠の 1 つ外に出す（外側の枠の場合へ。いちばん外の枠なら枠の外へ）。
 * 枠の中身の先頭か末尾ならその場で外し、途中なら枠の直後へ動かす（途中で外すと、枠が 2 つに割れるため）。
 */
export function leaveBranchOps(model: FlowModel, stepId: StepId): ModelOp[] {
  const steps = visibleSteps(model);
  const step = steps.find((s) => s.id === stepId);
  const branch = step?.branchId ? model.branches.find((b) => b.id === step.branchId) : undefined;
  if (!step || !branch) return [];
  const parent = branch.parentId && model.branches.some((b) => b.id === branch.parentId) ? branch.parentId : null;
  const rest = steps.filter((s) => s.id !== stepId);
  const others = groupPositions(model, rest, branch.groupId);
  const patch: Extract<ModelOp, { op: "step.update" }>["patch"] = { branchId: parent };
  const inMiddle = others.some((o) => o < step.order) && others.some((o) => o > step.order);
  if (inMiddle) {
    const last = Math.max(...others);
    patch.order = between(last, nextOrderAfter(model, rest, last));
  }
  // 場合が空になっても枠は残す（空になった位置は reducer が覚える）
  return [{ op: "step.update", id: stepId, patch }];
}

/**
 * 作ってあるステップを、場合（branchId）に入れる。ほかの枠・場合からの移し替えもこれ。
 * - 枠に中身があれば、その場合の最後へ動かす（枠の中身が連続したままになるように）
 * - 枠がまるごと空なら、place で決める
 *   - "step"（編集パネルから）: ステップは動かさず、枠のほうがステップの位置に来る。先に枠を作って、
 *     あとから既存のステップを入れるときに、手順が枠を作った場所（図の最後など）へ飛んでいかないように。
 *     ただし枠を囲む場合の外にいるステップや、別の枠の中のステップは、枠を割らない位置へ動かす
 *     （外側の枠の外へ空の枠を連れ出さない・元の枠を 2 つに割らないため）
 *   - "frame"（図の上で枠へドラッグ）: 落とした場所に入れたいので、ステップのほうを枠の位置へ動かす
 */
export function enterBranchOps(
  model: FlowModel,
  stepId: StepId,
  branchId: string,
  place: "step" | "frame" = "step",
): ModelOp[] {
  const step = visibleSteps(model).find((s) => s.id === stepId);
  const branch = model.branches.find((b) => b.id === branchId);
  if (!step || !branch || step.branchId === branchId) return [];
  const rest: FlowModel = { ...model, steps: model.steps.filter((s) => s.id !== stepId) };
  const frameEmpty = groupPositions(rest, visibleSteps(rest), branch.groupId).length === 0;
  const container = branch.parentId ?? null;
  let order: number | undefined;
  if (!frameEmpty || place === "frame") order = orderInArm(rest, branchId);
  else if (step.branchId === container) order = step.order;
  else if (container === null) order = orderAfterStep(model, stepId, null);
  else order = orderInArm(rest, branchId);
  if (order === undefined) return [];
  return [{ op: "step.update", id: stepId, patch: order === step.order ? { branchId } : { branchId, order } }];
}

/** 枠を消す（中のステップは残して、枠の外に出す）。 */
export function removeGroupOps(model: FlowModel, groupId: string): ModelOp[] {
  return groupArms(model, groupId).map((b) => ({ op: "branch.remove", id: b.id }));
}

/** 枠の種類を変える（場合が 2 つ以上あるのは場合分けだけなので、そのときは変えない）。 */
export function setGroupKindOps(model: FlowModel, groupId: string, kind: Branch["kind"]): ModelOp[] {
  const arms = groupArms(model, groupId);
  if (arms.length !== 1 || arms[0].kind === kind) return [];
  return [{ op: "branch.update", id: arms[0].id, patch: { kind } }];
}

/**
 * 枠の条件の書き出し。直前のステップの結果で分かれることが多いので、そのステップ名を主語にする
 * （「［不備なし］」だけだと、図を渡された人には何の不備か分からない）。
 */
export const conditionPrefix = (label: string) => `「${label}」の結果：`;

/** 場合分けに場合を足すときの書き出し。最初の場合が conditionPrefix で始まっていれば、同じものを使う。 */
export function armConditionPrefix(model: FlowModel, groupId: string): string {
  const first = groupArms(model, groupId)[0];
  return first ? (/^「.+」の結果：/.exec(first.condition)?.[0] ?? "") : "";
}

/**
 * 場合分けの場合の順番を入れ替える（dir: -1 = 上へ、1 = 下へ）。隣の場合と index を入れ替え、
 * 中身（内側の枠の中のステップ・中身の無い内側の枠）も新しい順番で並べ直す。枠の中で使っていた order の値を
 * そのまま配り直すので、枠の外のステップは動かない。
 */
export function moveArmOps(model: FlowModel, branchId: string, dir: -1 | 1): ModelOp[] {
  const branch = model.branches.find((b) => b.id === branchId);
  if (!branch) return [];
  const arms = groupArms(model, branch.groupId);
  const i = arms.findIndex((b) => b.id === branchId);
  const other = arms[i + dir];
  if (!other) return [];
  const swapped = arms.map((b) => (b.id === branch.id ? other : b.id === other.id ? branch : b));
  const steps = visibleSteps(model);
  const index = branchIndex(model);
  const empties = emptyFrames(model, steps);
  /** 場合の中身。ステップか、中身の無い内側の枠 */
  type Entry = { order: number; step?: string; frame?: Branch[] };
  const entriesOf = (armId: string): Entry[] =>
    [
      ...steps.filter((s) => isUnderArm(index, s, armId)).map((s) => ({ order: s.order, step: s.id })),
      ...empties
        .filter((g) => g[0].order !== undefined && chainHasArm(armChain(index, g[0].parentId), armId))
        .map((g) => ({ order: g[0].order!, frame: g })),
    ].sort((a, b) => a.order - b.order);
  const orders = arms.flatMap((b) => entriesOf(b.id).map((e) => e.order)).sort((a, b) => a - b);
  const reordered = swapped.flatMap((b) => entriesOf(b.id));
  const ops: ModelOp[] = [
    { op: "branch.update", id: branch.id, patch: { index: other.index } },
    { op: "branch.update", id: other.id, patch: { index: branch.index } },
  ];
  reordered.forEach((e, k) => {
    if (e.order === orders[k]) return;
    if (e.step) ops.push({ op: "step.update", id: e.step, patch: { order: orders[k] } });
    for (const b of e.frame ?? []) ops.push({ op: "branch.update", id: b.id, patch: { order: orders[k] } });
  });
  return ops;
}
