/** WebVTT の字幕 1 件。時刻は秒 */
export type Cue = { start: number; end: number; text: string };

/** 「00:01:02.345」または「01:02.345」を秒にする */
function seconds(stamp: string): number {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})\.(\d{1,3})$/.exec(stamp.trim());
  if (!m) return NaN;
  const [, h = "0", min, s, ms] = m;
  return Number(h) * 3600 + Number(min) * 60 + Number(s) + Number(ms.padEnd(3, "0")) / 1000;
}

/**
 * 使い方の動画に付けた字幕（WebVTT）を読む。字幕の装飾タグは外し、複数行は 1 文につなぐ。
 * 時刻が読めない字幕や、中身が空の字幕は捨てる。
 */
export function parseVtt(source: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of source.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at < 0) continue;
    const [from, rest = ""] = lines[at].split("-->");
    const start = seconds(from);
    const end = seconds(rest.trim().split(/\s+/)[0] ?? "");
    const text = lines
      .slice(at + 1)
      .join("")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
