/**
 * 読みの辞書。VOICEVOX が読み違える語（社内のシステム名・略語など）と、その読み（カタカナ）。
 * 置き換えるのは VOICEVOX に渡す文だけなので、画面の字幕はそのまま。
 * server・client のどちらからも使う（DB には触れない）。
 */

export type Reading = { word: string; reading: string };

export const MAX_WORD_CHARS = 40;
export const MAX_READING_CHARS = 60;
export const MAX_READINGS = 300;

/**
 * 最初から入っている読み。同じ表記を辞書に登録すれば、そちらが優先される。
 * 例: 「Flowline」はそのままだと「フローリン」と読まれる。
 */
const BUILT_IN: Reading[] = [{ word: "Flowline", reading: "フローライン" }];

/** 全角英数を半角にそろえる（「ＴＯＭＡＳ」も「TOMAS」として扱う） */
const fold = (s: string) => s.normalize("NFKC");

/** ひらがなをカタカナにする（「とーます」→「トーマス」） */
const toKatakana = (s: string) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

const KATAKANA = /^[ァ-ヺー・ヽヾ ]+$/;

/** 入力を辞書の 1 件にする。だめなら理由を返す */
export function parseReading(input: { word?: unknown; reading?: unknown }): Reading | { error: string } {
  const word = typeof input.word === "string" ? fold(input.word).trim() : "";
  if (!word) return { error: "表記を入力してください" };
  if (word.length > MAX_WORD_CHARS) return { error: `表記は ${MAX_WORD_CHARS} 文字以内にしてください` };
  if (/[\p{Cc}\p{Cf}]/u.test(word)) return { error: "表記に使えない文字が入っています" };

  const raw = typeof input.reading === "string" ? input.reading : "";
  const reading = toKatakana(fold(raw).replace(/\s+/g, " ").trim());
  if (!reading) return { error: "読みを入力してください" };
  if (reading.length > MAX_READING_CHARS) return { error: `読みは ${MAX_READING_CHARS} 文字以内にしてください` };
  if (!KATAKANA.test(reading)) return { error: "読みはカタカナかひらがなで入力してください" };
  return { word, reading };
}

const keyOf = (word: string) => fold(word).toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ASCII_WORD = /[A-Za-z0-9]/;

/**
 * 辞書の語を読みに置き換えた文を返す。
 *
 * - 英大文字・小文字は区別しない（TOMAS / Tomas）。全角英数も半角と同じに扱う
 * - 英数字で始まる・終わる語は、前後に英数字が続くときは置き換えない
 *   （「TOMAS」は「TOMAS発注入力」では置き換え、「TOMASX」では置き換えない）
 * - 長い語を先に当てる（「TOMAS」と「TOMAS2」があれば「TOMAS2」）。置き換えた読みは、もう一度は置き換えない
 */
export function toSpeech(text: string, readings: readonly Reading[]): string {
  const byKey = new Map<string, string>();
  for (const r of [...BUILT_IN, ...readings]) byKey.set(keyOf(r.word), r.reading);
  if (byKey.size === 0) return text;
  const words = [...byKey.keys()].sort((a, b) => b.length - a.length);
  const pattern = words
    .map((w) => {
      const head = ASCII_WORD.test(w[0]) ? "(?<![A-Za-z0-9])" : "";
      const tail = ASCII_WORD.test(w[w.length - 1]) ? "(?![A-Za-z0-9])" : "";
      return head + escape(w) + tail;
    })
    .join("|");
  return fold(text).replace(new RegExp(pattern, "gi"), (m) => byKey.get(m.toLowerCase()) ?? m);
}
