import type {
  Actor,
  ActorKind,
  ActorRole,
  Branch,
  FlowModel,
  IssueKind,
  MessageKind,
  OpenIssue,
  Step,
  StepFlags,
  StepStatus,
} from "@/lib/model/types";
import { MAX_ACTORS } from "@/lib/model/limits";

/**
 * 書き出した業務フロー（grilljev-demo の `grilljev-flow` 形式）を、この図のモデルに直す。純粋な部分。
 *
 * ファイルは信頼できない入力なので、型に載っている項目だけを 1 つずつ確かめて作り直す。
 * 会議にしか使わない項目（出席・確度・発話の id・付箋の問いかけなど）はここで落とす。
 * 付箋の「質問済み」「保留」は、答えが無ければ「まだ決まっていない」に戻す。
 * つながりの壊れたデータ（いない登場人物へのステップなど）は、黙って欠けさせず全体を弾く。
 */

export const IMPORT_FORMAT = "grilljev-flow";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_STEPS = 500;
const MAX_BRANCHES = 100;
const MAX_ISSUES = 200;

export type ImportResult = { ok: true; model: FlowModel } | { ok: false; error: string };

const ACTOR_KINDS: readonly ActorKind[] = ["person", "role", "system", "external", "unknown"];
const ACTOR_ROLES: readonly ActorRole[] = ["trigger", "end"];
const MESSAGE_KINDS: readonly MessageKind[] = ["sync", "async", "reply", "self"];
const STEP_STATUSES: readonly StepStatus[] = ["confirmed", "provisional", "retracted"];
const BRANCH_KINDS: readonly Branch["kind"][] = ["alt", "opt", "loop"];
const ISSUE_KINDS: readonly IssueKind[] = ["purpose", "who", "when", "criteria", "exception", "tool", "handoff"];
/** Mermaid の participant id になるので英数字だけ（types.ts の ActorId） */
const ACTOR_ID_RE = /^[A-Za-z0-9]{1,16}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

type Obj = Record<string, unknown>;

class ImportError extends Error {}

const fail = (message: string): never => {
  throw new ImportError(message);
};
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const optStr = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v : undefined);
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined =>
  list.includes(v as T) ? (v as T) : undefined;
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

function list(v: unknown, what: string, max: number): unknown[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) return fail(`${what}の形式が正しくありません`);
  if (v.length > max) return fail(`${what}が多すぎます（${max} まで）`);
  return v;
}

function uniqueId(seen: Set<string>, v: unknown, re: RegExp, what: string): string {
  if (typeof v !== "string" || !re.test(v)) return fail(`${what}の id が正しくありません`);
  if (seen.has(v)) return fail(`${what}の id「${v}」が重複しています`);
  seen.add(v);
  return v;
}

function toActors(raw: unknown[]): Actor[] {
  const ids = new Set<string>();
  const roles = new Set<ActorRole>();
  let focused = false;
  return raw.map((v, i) => {
    if (!isObj(v)) return fail("登場人物の形式が正しくありません");
    const id = uniqueId(ids, v.id, ACTOR_ID_RE, "登場人物");
    const name = str(v.name).trim();
    if (name === "") return fail(`登場人物 ${id} の名前がありません`);
    const actor: Actor = {
      id,
      name,
      kind: oneOf(v.kind, ACTOR_KINDS) ?? "unknown",
      aliases: strList(v.aliases),
      lane: num(v.lane, i),
      addedAtRev: num(v.addedAtRev, 0),
    };
    // 起点・終点・中心は各 1 人。重なっていたら先の人を残す
    const role = oneOf(v.role, ACTOR_ROLES);
    if (role && !roles.has(role)) {
      roles.add(role);
      actor.role = role;
    }
    if (v.focus === true && !focused) {
      focused = true;
      actor.focus = true;
    }
    const product = optStr(v.product);
    if (product) actor.product = product;
    const note = optStr(v.note);
    if (note) actor.note = note;
    const members = strList(v.members);
    if (members.length > 0) actor.members = members;
    return actor;
  });
}

function toBranches(raw: unknown[]): Branch[] {
  const ids = new Set<string>();
  return raw.map((v) => {
    if (!isObj(v)) return fail("分岐の形式が正しくありません");
    const id = uniqueId(ids, v.id, ID_RE, "分岐");
    const kind = oneOf(v.kind, BRANCH_KINDS) ?? fail(`分岐 ${id} の種類が正しくありません`);
    const groupId = typeof v.groupId === "string" && ID_RE.test(v.groupId) ? v.groupId : fail(`分岐 ${id} の枠が正しくありません`);
    const branch: Branch = { id, kind, condition: str(v.condition), groupId, index: Math.trunc(num(v.index, 0)) };
    if (typeof v.order === "number" && Number.isFinite(v.order)) branch.order = v.order;
    return branch;
  });
}

function toSteps(raw: unknown[], actorIds: Set<string>, branchIds: Set<string>): Step[] {
  const ids = new Set<string>();
  return raw.map((v, i) => {
    if (!isObj(v)) return fail("ステップの形式が正しくありません");
    const id = uniqueId(ids, v.id, ID_RE, "ステップ");
    const actor = (a: unknown, what: string): string =>
      typeof a === "string" && actorIds.has(a) ? a : fail(`ステップ ${id} の${what}が登場人物にいません`);
    const branchId =
      v.branchId === null || v.branchId === undefined
        ? null
        : typeof v.branchId === "string" && branchIds.has(v.branchId)
          ? v.branchId
          : fail(`ステップ ${id} の分岐が見つかりません`);
    const status = oneOf(v.status, STEP_STATUSES) ?? "provisional";
    const rawFlags = isObj(v.flags) ? v.flags : {};
    const flags: StepFlags = {};
    if (rawFlags.exception === true) flags.exception = true;
    if (rawFlags.tacit === true) flags.tacit = true;
    if (rawFlags.personDependent === true) flags.personDependent = true;
    const step: Step = {
      id,
      from: actor(v.from, "送り手"),
      to: actor(v.to, "受け手"),
      label: str(v.label),
      kind: oneOf(v.kind, MESSAGE_KINDS) ?? "sync",
      branchId,
      order: num(v.order, i + 1),
      status,
      flags,
      addedAtRev: num(v.addedAtRev, 0),
    };
    const artifact = optStr(v.artifact);
    if (artifact) step.artifact = artifact;
    const assignee = optStr(v.assignee);
    if (assignee) step.assignee = assignee;
    if (typeof v.approver === "string" && actorIds.has(v.approver)) step.approver = v.approver;
    if (status === "retracted") {
      const from = oneOf(v.retractedFrom, ["confirmed", "provisional"] as const);
      if (from) step.retractedFrom = from;
    }
    return step;
  });
}

function toIssues(raw: unknown[], stepIds: Set<string>, groupIds: Set<string>, actorIds: Set<string>): OpenIssue[] {
  const ids = new Set<string>();
  return raw.map((v) => {
    if (!isObj(v)) return fail("付箋の形式が正しくありません");
    const id = uniqueId(ids, v.id, ID_RE, "付箋");
    const answer = optStr(v.answer);
    const issue: OpenIssue = {
      id,
      question: str(v.question),
      kind: oneOf(v.kind, ISSUE_KINDS) ?? "criteria",
      // 消えたステップ・枠・人を指す紐付けは外す（付箋そのものは残す）
      relatedStepIds: strList(v.relatedStepIds).filter((s) => stepIds.has(s)),
      // この形式には「質問済み」「保留」があるが、ここでは答えの有無だけで決める
      status: answer ? "answered" : "open",
      raisedAtRev: num(v.raisedAtRev, 0),
    };
    const frames = strList(v.relatedFrameIds).filter((g) => groupIds.has(g));
    if (frames.length > 0) issue.relatedFrameIds = frames;
    const actors = strList(v.relatedActorIds).filter((a) => actorIds.has(a));
    if (actors.length > 0) issue.relatedActorIds = actors;
    if (answer) issue.answer = answer;
    return issue;
  });
}

/** 書き出したファイルの中身（JSON を parse したもの）を、保存できるモデルにする。 */
export function parseFlowExport(value: unknown, at: string): ImportResult {
  try {
    if (!isObj(value) || value.format !== IMPORT_FORMAT) return fail("業務フローの書き出しファイルではありません");
    if (value.version !== 1) return fail(`対応していない版です（version ${String(value.version)}）`);
    const m = value.model;
    if (!isObj(m) || !isObj(m.scope)) return fail("業務フローの中身がありません");

    const actors = toActors(list(m.actors, "登場人物", MAX_ACTORS));
    const branches = toBranches(list(m.branches, "分岐", MAX_BRANCHES));
    const actorIds = new Set(actors.map((a) => a.id));
    const steps = toSteps(list(m.steps, "ステップ", MAX_STEPS), actorIds, new Set(branches.map((b) => b.id)));
    const issues = toIssues(
      list(m.issues, "付箋", MAX_ISSUES),
      new Set(steps.map((s) => s.id)),
      new Set(branches.map((b) => b.groupId)),
      actorIds,
    );
    const scope = m.scope;
    return {
      ok: true,
      model: {
        rev: Math.max(0, Math.trunc(num(m.rev, 0))),
        scope: {
          title: str(scope.title),
          purpose: str(scope.purpose),
          trigger: str(scope.trigger),
          frequency: str(scope.frequency),
        },
        actors,
        steps,
        branches,
        issues,
        updatedAt: at,
      },
    };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    throw e;
  }
}
