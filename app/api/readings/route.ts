import { connection } from "next/server";
import { MAX_READINGS, parseReading } from "@/lib/readings";
import { deleteReading, listReadings, saveReading } from "@/lib/store/readings";

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  return (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
}

/** 読みの辞書の一覧 */
export async function GET() {
  // SQLite は Next から「外のデータ」と見えないので、明示しないとビルド時の結果に固定される
  await connection();
  return Response.json({ readings: listReadings() }, { headers: { "Cache-Control": "no-store" } });
}

/** 1 件の追加・上書き。`{ word, reading }`。同じ表記（大文字・小文字は区別しない）があれば上書き */
export async function PUT(request: Request) {
  const parsed = parseReading(await bodyOf(request));
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  if (!saveReading(parsed)) {
    return Response.json({ error: `登録できるのは ${MAX_READINGS} 件までです` }, { status: 409 });
  }
  return Response.json({ readings: listReadings() });
}

/** 1 件の削除。`{ word }` */
export async function DELETE(request: Request) {
  const { word } = await bodyOf(request);
  if (typeof word !== "string" || !word.trim()) return Response.json({ error: "word がありません" }, { status: 400 });
  deleteReading(word.normalize("NFKC").trim());
  return Response.json({ readings: listReadings() });
}
