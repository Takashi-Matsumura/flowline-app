import { Suspense } from "react";
import { notFound } from "next/navigation";
import { readDiagram } from "@/lib/store/diagrams";
import { Editor } from "@/components/editor/editor";

export default function EditorPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-sm text-zinc-500">読み込み中…</p>}>
      <DiagramEditor params={params} />
    </Suspense>
  );
}

async function DiagramEditor({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const { slug } = await params;
  const diagram = await readDiagram(slug);
  if (!diagram) notFound();

  return <Editor slug={diagram.slug} name={diagram.name} initial={diagram.model} />;
}
