/**
 * 図の slug と名前の検証。純粋な関数だけで、DB には触れない。
 */

/** URL の 1 区切りになるので、パス区切りや `..` を通さない厳格な形だけを許す。 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const isValidSlug = (v: unknown): v is string => typeof v === "string" && SLUG_RE.test(v);

/** `20260921-213045-x7k2`。並べると作成順になり、衝突しにくい。 */
export function newSlug(now: Date, random: () => string = () => Math.random().toString(36).slice(2, 6)): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  const suffix = random().toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(4, "0").slice(0, 4);
  return `${stamp}-${suffix}`;
}

export const MAX_NAME_CHARS = 60;

/** 図の名前。空・長すぎるものは弾く。 */
export function parseName(v: unknown): string | null {
  const s = typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  return s !== "" && s.length <= MAX_NAME_CHARS ? s : null;
}
