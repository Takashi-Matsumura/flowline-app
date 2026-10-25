import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

/**
 * 保存先の SQLite（`data/flowline.db`。`DATA_DIR` で場所を変えられる。.gitignore 済み）。server 専用。
 *
 * - `diagrams`: 業務フロー図（lib/store/diagrams.ts）。`collapsed` は画面で畳んでいる枠
 *
 * テーブルは起動時に `CREATE TABLE IF NOT EXISTS` で作る（マイグレーションの仕組みは持たず、足した列だけ下で足す）。
 */

let cached: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (cached) return cached;
  // DATA_DIR は実行時のデータ置き場で、バンドルに含めるものは無い。turbopack の静的解析は
  // ここを「プロジェクト全体をトレースする動的アクセス」と見なすため、明示的に対象外にする
  // （付けないと public を含む全ソースがサーバ出力に入る）。絶対パス指定を許すので cwd 配下には固定できない。
  const dir = path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
  mkdirSync(dir, { recursive: true });
  const conn = new DatabaseSync(path.join(dir, "flowline.db"));
  conn.exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      model TEXT NOT NULL,
      collapsed TEXT NOT NULL DEFAULT '[]'
    );
  `);
  // 画面で畳んでいる枠（collapsed）は後から足した列。それより前に作った DB には足す
  const columns = conn.prepare("PRAGMA table_info(diagrams)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "collapsed")) {
    conn.exec(`ALTER TABLE diagrams ADD COLUMN collapsed TEXT NOT NULL DEFAULT '[]'`);
  }
  cached = conn;
  return conn;
}
