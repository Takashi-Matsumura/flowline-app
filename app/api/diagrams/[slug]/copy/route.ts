import { duplicateDiagram } from "@/lib/store/diagrams";
import { toDiagramMeta } from "@/lib/store/diagram-types";

type Ctx = { params: Promise<{ slug: string }> };

/** 保存済みの図のコピーを作る（一覧の「コピー」）。作った図の一覧用の情報を返す */
export async function POST(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const copied = await duplicateDiagram(slug);
  if (!copied) return Response.json({ error: "図が見つかりません" }, { status: 404 });
  return Response.json({ diagram: toDiagramMeta(copied) }, { status: 201 });
}
