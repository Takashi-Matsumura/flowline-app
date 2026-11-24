import { MAX_READINGS, type Reading } from "@/lib/readings";
import { db } from "./db";

/**
 * 読みの辞書の保存（SQLite の `readings` テーブル）。server 専用。
 * アプリ全体で 1 つ（図ごと・ブラウザごとではない）。表記は大文字・小文字を区別せず 1 件にする。
 */

const keyOf = (word: string) => word.toLowerCase();

export function listReadings(): Reading[] {
  return db().prepare("SELECT word, reading FROM readings ORDER BY word_key").all() as Reading[];
}

/** 追加か上書き。件数の上限を超える追加なら false */
export function saveReading(r: Reading): boolean {
  const conn = db();
  const exists = conn.prepare("SELECT 1 FROM readings WHERE word_key = ?").get(keyOf(r.word));
  if (!exists) {
    const { n } = conn.prepare("SELECT COUNT(*) AS n FROM readings").get() as { n: number };
    if (n >= MAX_READINGS) return false;
  }
  conn
    .prepare(
      `INSERT INTO readings (word_key, word, reading, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(word_key) DO UPDATE SET word = excluded.word, reading = excluded.reading, updated_at = excluded.updated_at`,
    )
    .run(keyOf(r.word), r.word, r.reading, new Date().toISOString());
  return true;
}

/** 消せたら true（無かったら false） */
export function deleteReading(word: string): boolean {
  return db().prepare("DELETE FROM readings WHERE word_key = ?").run(keyOf(word)).changes > 0;
}
