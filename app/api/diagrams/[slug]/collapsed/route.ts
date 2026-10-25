import { saveCollapsed } from "@/lib/store/diagrams";
import { parseCollapsed } from "@/lib/store/diagram-types";

type Ctx = { params: Promise<{ slug: string }> };

/** 編集画面で畳んでいる枠を保存する。次に開いたときも同じ枠を畳んで見せる */
export async function PUT(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const body: unknown = await request.json().catch(() => null);
  const collapsed = parseCollapsed((body as { collapsed?: unknown } | null)?.collapsed);
  if (!collapsed) return Response.json({ error: "保存内容の形式が正しくありません" }, { status: 400 });
  const ok = await saveCollapsed(slug, collapsed);
  return ok ? new Response(null, { status: 204 }) : Response.json({ error: "図が見つかりません" }, { status: 404 });
}
