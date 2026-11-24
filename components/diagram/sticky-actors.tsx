"use client";

/**
 * 図をスクロールして、上に並ぶ登場人物が見えなくなったら、図の上端に登場人物の名前の帯を出す。
 * 名前はそれぞれのライフラインの真上に置くので、図の途中を見ていても、どの縦線が誰かが分かる。
 *
 * 帯は図と同じ座標（MermaidDiagram の relative な外枠）に置き、`sticky` で表示領域の上端に留める。
 * 横は図と一緒に動くので、横スクロール・拡大縮小しても縦線からずれない。
 */

/** 図の外枠（base）の左上から測った、登場人物 1 人ぶんの位置 */
export type ActorLabel = {
  /** ライフラインの x（外枠の左端から。px） */
  x: number;
  /** 1 段目の名前（2 段目の部署・製品名は、帯を低く保つため出さない） */
  name: string;
  kind: "person" | "box";
  /** この業務の中心の登場人物（図では橙で描く） */
  focus: boolean;
  /** 隣の登場人物との間隔から決める、名前の札の最大幅（px） */
  maxWidth: number;
};

export type ActorHeader = {
  labels: ActorLabel[];
  /** 上に並ぶ登場人物の下端（外枠の上端から。px）。ここより下までスクロールしたら帯を出す */
  bottom: number;
};

/** 中心の登場人物の色（mermaid-diagram.tsx の markFocus と同じ） */
const FOCUS_STROKE = "rgb(217, 119, 6)";

/** 図の上に並ぶ登場人物（Mermaid の .actor-top）の、名前とライフラインの位置を測る */
export function measureActors(host: HTMLElement, base: HTMLElement): ActorHeader {
  const origin = base.getBoundingClientRect();
  const found: Omit<ActorLabel, "maxWidth">[] = [];
  let bottom = 0;
  const heads = host.querySelectorAll("rect.actor-top, g.actor-man.actor-top");
  for (const head of heads) {
    const person = head.matches("g");
    // 箱の登場人物は rect の親の g に、人型は g.actor-man の中に名前（text.actor）がある
    const group = person ? head : head.parentElement;
    const name = group?.querySelector("text.actor")?.textContent?.trim();
    if (!name) continue;
    // ライフラインは、箱なら箱の、人型なら頭（circle）の真ん中を通る
    const shape = (person ? head.querySelector("circle") : head) ?? head;
    const s = shape.getBoundingClientRect();
    found.push({
      x: s.left + s.width / 2 - origin.left,
      name,
      kind: person ? "person" : "box",
      focus: shape instanceof SVGElement && getComputedStyle(shape).stroke === FOCUS_STROKE,
    });
    bottom = Math.max(bottom, (group ?? head).getBoundingClientRect().bottom - origin.top);
  }
  found.sort((a, b) => a.x - b.x);
  const labels = found.map((a, i) => {
    const left = i > 0 ? a.x - found[i - 1].x : Infinity;
    const right = i < found.length - 1 ? found[i + 1].x - a.x : Infinity;
    // 隣の札と重ならないよう、近いほうの間隔に収める（端の札は片側だけで決まる）
    const gap = Math.min(left, right);
    return { ...a, maxWidth: Number.isFinite(gap) ? Math.max(48, gap - 8) : 240 };
  });
  return { labels, bottom };
}

const PersonIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden className="shrink-0">
    <circle cx="12" cy="7" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden className="shrink-0">
    <rect x="3" y="5" width="18" height="14" rx="2" />
  </svg>
);

/**
 * 登場人物の帯。MermaidDiagram の relative な外枠の先頭に置く（高さ 0 なので図の位置は変えない）。
 * `inset` は表示領域の余白（px）。その分だけ上・左右へはみ出させ、帯を表示領域の端までぴったり付ける。
 * 押せない飾りなので、図の操作は邪魔しない。
 */
export function StickyActors({ header, visible, inset }: { header: ActorHeader; visible: boolean; inset: number }) {
  if (header.labels.length === 0) return null;
  return (
    <div className="pointer-events-none sticky z-10 h-0" style={{ top: -inset }} aria-hidden>
      <div
        style={{ left: -inset, right: -inset }}
        className={`absolute top-0 h-9 border-b border-black/10 bg-white/90 shadow-sm backdrop-blur-sm transition-opacity duration-150 motion-reduce:transition-none dark:border-white/15 dark:bg-zinc-950/90 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {header.labels.map((a) => (
          <span
            key={`${a.x}:${a.name}`}
            className={`absolute top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
              a.focus
                ? "border-amber-500/60 bg-amber-50 text-amber-800 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200"
                : "border-indigo-300/70 bg-indigo-50 text-indigo-900 dark:border-indigo-300/30 dark:bg-indigo-400/15 dark:text-indigo-100"
            }`}
            style={{ left: a.x + inset, maxWidth: a.maxWidth }}
          >
            {a.kind === "person" ? <PersonIcon /> : <BoxIcon />}
            <span className="truncate">{a.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
