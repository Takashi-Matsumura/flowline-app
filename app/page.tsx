import { Suspense } from "react";
import { connection } from "next/server";
import { listDiagrams } from "@/lib/store/diagrams";
import { DiagramList } from "./diagram-list";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-black/10 px-4 py-2 dark:border-white/15">
        <h1 className="text-lg font-semibold">Flowline</h1>
        <p className="hidden truncate text-sm text-zinc-500 sm:block">登場人物とステップを手で並べて、業務フロー図を描く</p>
      </header>
      <Suspense fallback={<p className="px-4 py-6 text-sm text-zinc-500">読み込み中…</p>}>
        <Diagrams />
      </Suspense>
      <footer className="mt-auto flex justify-end border-t border-black/10 px-4 py-2 dark:border-white/15">
        <ThemeToggle />
      </footer>
    </div>
  );
}

async function Diagrams() {
  // 保存済みの一覧は毎回読む（SQLite は Next から「外のデータ」と見えないので、明示しないとビルド時に固定される）
  await connection();
  return <DiagramList initial={await listDiagrams()} />;
}
