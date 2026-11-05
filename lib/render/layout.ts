import { branchIndex, stepChain, walkFrames } from "@/lib/model/frames";
import type { Actor, FlowModel, Step } from "@/lib/model/types";
import { actorLabel, focusActorOf, visibleSteps } from "./mermaid";

/**
 * シーケンス図の座標計算。純関数。drawio への書き出しが使う（将来の直接描画とも共用できる）。
 *
 * 縦方向は「1 ステップ = 1 行」で上から積む。alt / opt / loop の枠は、その枠の最初のステップの
 * 手前で開き、最後のステップの後で閉じる。alt の 2 つ目以降の枝は、点線の仕切りで区切る。
 */

// ── 寸法（px）──
export const LIFE_W = 120; // 箱型のライフラインの幅
export const ACTOR_W = 20; // 人型（umlActor）のライフラインの幅。名前は人型の下に出る
export const PITCH = 190; // 隣り合うライフラインの中心の間隔
export const MARGIN_X = 60;
export const TITLE_Y = 14;
export const PURPOSE_Y = 42;
export const HEAD_Y = 76; // ライフラインの上端
export const HEAD_H = 40; // 箱型のライフラインの見出しの高さ
export const FIRST_ROW_Y = 170;
export const ROW_H = 60;
export const MSG_OFFSET = 36; // 行の上端から矢印の線までの距離（文字は線の上に出る）
export const SELF_EXTRA = 26; // 自己メッセージ（コの字）が要る追加の高さ
export const SELF_OUT = 60; // 自己メッセージが右へ出る距離
export const FRAME_HEAD = 34; // 枠の上端から最初の行までの距離
export const FRAME_TAIL = 16;
export const FRAME_GAP = 14; // 枠の下端から次の行までの距離
export const ELSE_GAP = 34; // 仕切りから次の行までの距離
export const FRAME_INSET = 14; // 入れ子の枠を、外側の枠から左右に内へ寄せる幅
export const NOTE_W = 140;
export const NOTE_H = 32;
export const BOTTOM = 70;

export type LaidActor = {
  id: string;
  name: string;
  /** 名前の下に 2 段目で添える製品・サービス名 */
  product?: string;
  /** この業務の中心の登場人物か（強調して描く） */
  focus: boolean;
  kind: Actor["kind"];
  /** ライフラインの中心 x */
  cx: number;
  /** 図形の左端 x と幅 */
  x: number;
  w: number;
  /** 人型（person / role）か、箱型か */
  asActor: boolean;
};

export type LaidRow = {
  step: Step;
  /** 矢印の線の y */
  msgY: number;
  fromCx: number;
  toCx: number;
  self: boolean;
};

export type LaidFrame = {
  kind: "alt" | "opt" | "loop";
  x: number;
  y: number;
  w: number;
  h: number;
  /** 各枝の条件（[与信OK] など）と、その表示位置 y */
  conditions: { text: string; y: number }[];
  /** alt の 2 つ目以降の枝を分ける仕切りの y */
  dividers: number[];
};

export type LaidNote = { text: string; x: number; y: number; w: number; h: number };

export type Layout = {
  actors: LaidActor[];
  rows: LaidRow[];
  frames: LaidFrame[];
  notes: LaidNote[];
  width: number;
  height: number;
};

export function layoutDiagram(model: FlowModel): Layout {
  const ordered = [...model.actors].sort((a, b) => a.lane - b.lane);
  const focus = focusActorOf(ordered);
  const actors: LaidActor[] = ordered.map((a, i) => {
    const asActor = a.kind === "person" || a.kind === "role";
    const w = asActor ? ACTOR_W : LIFE_W;
    const cx = MARGIN_X + LIFE_W / 2 + i * PITCH;
    return {
      id: a.id,
      name: actorLabel(a),
      product: a.product,
      focus: a === focus,
      kind: a.kind,
      cx,
      x: cx - w / 2,
      w,
      asActor,
    };
  });
  const cxOf = new Map(actors.map((a) => [a.id, a.cx]));

  const firstCx = actors[0]?.cx ?? MARGIN_X + LIFE_W / 2;
  const lastCx = actors[actors.length - 1]?.cx ?? firstCx;
  const frameX = firstCx - LIFE_W / 2 - 10;
  const frameW = lastCx - firstCx + LIFE_W + 20;
  const noteX = frameX + frameW + 20;

  const index = branchIndex(model);
  const rows: LaidRow[] = [];
  const frames: LaidFrame[] = [];
  const notes: LaidNote[] = [];

  let y = FIRST_ROW_Y;
  /** 開いている枠（外側から順に）。入れ子の枠は、深さの分だけ左右を内へ寄せる */
  const open: LaidFrame[] = [];

  for (const ev of walkFrames(visibleSteps(model), (step) => stepChain(index, step))) {
    if (ev.type === "open") {
      const inset = ev.depth * FRAME_INSET;
      const frame: LaidFrame = {
        kind: ev.arm.kind,
        x: frameX + inset,
        y,
        w: frameW - inset * 2,
        h: 0,
        conditions: [{ text: `[${ev.arm.condition}]`, y: y + 4 }],
        dividers: [],
      };
      frames.push(frame);
      open.push(frame);
      y += FRAME_HEAD;
    } else if (ev.type === "else") {
      // 同じ枠の別の枝。else の仕切りを持てるのは alt だけ
      const frame = open[ev.depth];
      if (ev.arm.kind === "alt" && frame) {
        frame.dividers.push(y);
        frame.conditions.push({ text: `[${ev.arm.condition}]`, y: y + 4 });
        y += ELSE_GAP;
      }
    } else if (ev.type === "close") {
      const frame = open.pop();
      if (frame) frame.h = y + FRAME_TAIL - frame.y;
      y += FRAME_TAIL + FRAME_GAP;
    } else {
      const step = ev.item;
      const self = step.from === step.to;
      const msgY = y + MSG_OFFSET;
      rows.push({
        step,
        msgY,
        fromCx: cxOf.get(step.from) ?? firstCx,
        toCx: cxOf.get(step.to) ?? firstCx,
        self,
      });
      if (step.artifact) {
        notes.push({ text: step.artifact, x: noteX, y: msgY - NOTE_H / 2, w: NOTE_W, h: NOTE_H });
      }
      y += ROW_H + (self ? SELF_EXTRA : 0);
    }
  }

  const rightEdge = notes.length > 0 ? noteX + NOTE_W : lastCx + LIFE_W / 2;
  return { actors, rows, frames, notes, width: rightEdge + MARGIN_X, height: y + BOTTOM };
}
