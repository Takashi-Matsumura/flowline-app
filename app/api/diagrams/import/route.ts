import { importDiagram } from "@/lib/store/diagrams";
import { toDiagramMeta } from "@/lib/store/diagram-types";
import { MAX_IMPORT_BYTES, parseFlowExport } from "@/lib/store/import";
import { MAX_NAME_CHARS, parseName } from "@/lib/store/slug";

/** 書き出したファイル（JSON 本体をそのまま送る）から新しい図を作る（一覧の「ファイルから読み込む」） */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_IMPORT_BYTES) return Response.json({ error: "ファイルが大きすぎます" }, { status: 413 });
  const text = await request.text();
  if (text.length > MAX_IMPORT_BYTES) return Response.json({ error: "ファイルが大きすぎます" }, { status: 413 });
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "JSON として読めません" }, { status: 400 });
  }
  const parsed = parseFlowExport(body, new Date().toISOString());
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const title = parsed.model.scope.title.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_CHARS);
  const name = parseName(title) ?? "読み込んだ図";
  const created = await importDiagram(name, parsed.model);
  return Response.json({ diagram: toDiagramMeta(created) }, { status: 201 });
}
