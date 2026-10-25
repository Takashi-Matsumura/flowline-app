import { isFlowModel } from "@/lib/model/guard";
import type { FlowModel } from "@/lib/model/types";

/**
 * 業務フロー図の保存データ。純粋な部分（型・検証）。DB には触れない。
 * 保存は SQLite の `diagrams` テーブル（lib/store/diagrams.ts）。slug の形式は lib/store/slug.ts。
 */

export type DiagramFile = {
  slug: string;
  /** 一覧に出す図の名前（＝業務名。model.scope.title と揃える） */
  name: string;
  createdAt: string;
  updatedAt: string;
  model: FlowModel;
  /** 画面で畳んでいる枠（Branch.groupId）。見え方だけなので model とは別に持つ */
  collapsed: string[];
};

export type DiagramMeta = {
  slug: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  actors: number;
  steps: number;
};

/** 保存できる中身（クライアントが送ってくる部分）。 */
export type DiagramPatch = { model: FlowModel };

export function parseDiagramPatch(v: unknown): DiagramPatch | null {
  if (typeof v !== "object" || v === null) return null;
  const model = (v as Record<string, unknown>).model;
  return isFlowModel(model) ? { model } : null;
}

/** 畳んでいる枠の数の上限（枠の数より多くはならないので、十分に大きい値） */
const MAX_COLLAPSED = 200;
const GROUP_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

/** 畳んでいる枠の一覧として正しければ、重複を除いて返す。形が合わなければ null */
export function parseCollapsed(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length > MAX_COLLAPSED) return null;
  if (!v.every((id) => typeof id === "string" && GROUP_ID_RE.test(id))) return null;
  return [...new Set(v as string[])];
}

export function toDiagramMeta(file: DiagramFile): DiagramMeta {
  return {
    slug: file.slug,
    name: file.name,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    actors: file.model.actors.length,
    steps: file.model.steps.filter((s) => s.status !== "retracted").length,
  };
}
