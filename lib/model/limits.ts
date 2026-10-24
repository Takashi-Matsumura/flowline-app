/** 登場人物の入力の上限。編集画面の入力欄で使う。 */
export const MAX_ACTORS = 20;
export const MAX_ACTOR_CHARS = 30;
export const MAX_MEMBERS = 20;
export const MAX_ALIASES = 10;
export const MAX_PRODUCT_CHARS = 40;
export const MAX_NOTE_CHARS = 200;

/** 「営業、経理, 与信部」のような 1 行の入力を、名前の配列にする（登場人物をまとめて足すとき）。 */
export function splitNames(input: string): string[] {
  return input.split(/[、,，\n]/).map((s) => s.trim()).filter((s) => s !== "");
}
