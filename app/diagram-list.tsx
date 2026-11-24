"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TutorialVideos } from "@/components/ui/tutorial-videos";
import { ReadingDictionary } from "@/components/ui/reading-dictionary";
import type { DiagramFile, DiagramMeta } from "@/lib/store/diagram-types";
import { MAX_IMPORT_BYTES, toFlowExport } from "@/lib/store/import";
import { EXPORT_MIME, exportFileName } from "@/lib/render/export";
import { download } from "@/components/diagram/download";

const fmt = (iso: string) => new Date(iso).toLocaleString("ja-JP", { hour12: false });

type SortKey = "name" | "actors" | "steps" | "updatedAt";
type Sort = { key: SortKey; dir: "asc" | "desc" };
/** 列の見出しを初めて押したときの向き。名前は五十音順、数と日時は大きい・新しい順から */
const DEFAULT_DIR: Record<SortKey, Sort["dir"]> = { name: "asc", actors: "desc", steps: "desc", updatedAt: "desc" };

/** 全角・半角と大文字・小文字をそろえる（「ｸﾚｶ」でも「クレカ」に当たる） */
const fold = (s: string) => s.normalize("NFKC").toLowerCase();

/** 業務名で絞り込む。空白で区切った語をすべて含むものだけ残す */
function filterDiagrams(list: DiagramMeta[], query: string): DiagramMeta[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return list;
  return list.filter((d) => {
    const name = fold(d.name);
    return words.every((w) => name.includes(w));
  });
}

const collator = new Intl.Collator("ja", { numeric: true });

function sortDiagrams(list: DiagramMeta[], { key, dir }: Sort): DiagramMeta[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const c =
      key === "name"
        ? collator.compare(a.name, b.name)
        : key === "updatedAt"
          ? a.updatedAt.localeCompare(b.updatedAt)
          : a[key] - b[key];
    // 同じ値なら新しい順にそろえる（並びが毎回ぶれないように）
    return c !== 0 ? c * sign : b.updatedAt.localeCompare(a.updatedAt);
  });
}

/** 新しい図の作成フォームと、保存済みの図の表（業務名で絞り込み・列で並べ替え。削除は 2 段階）。 */
export function DiagramList({ initial }: { initial: DiagramMeta[] }) {
  const router = useRouter();
  const [diagrams, setDiagrams] = useState(initial);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "updatedAt", dir: "desc" });
  const fileInput = useRef<HTMLInputElement>(null);

  async function create(name: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/diagrams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json().catch(() => ({}))) as { slug?: string; error?: string };
      if (!res.ok || !data.slug) throw new Error(data.error ?? "作成に失敗しました");
      router.push(`/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
      setBusy(false);
    }
  }

  /** 書き出したファイル（.json）から新しい図を作って開く */
  async function importFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > MAX_IMPORT_BYTES) throw new Error("ファイルが大きすぎます");
      const res = await fetch("/api/diagrams/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await file.text(),
      });
      const data = (await res.json().catch(() => ({}))) as { diagram?: DiagramMeta; error?: string };
      if (!res.ok || !data.diagram) throw new Error(data.error ?? "読み込みに失敗しました");
      router.push(`/${data.diagram.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      setBusy(false);
    }
  }

  async function remove(slug: string) {
    setConfirming(null);
    const res = await fetch(`/api/diagrams/${slug}`, { method: "DELETE" });
    if (res.ok || res.status === 404) setDiagrams((d) => d.filter((x) => x.slug !== slug));
    else setError("削除に失敗しました");
  }

  /** コピーを作り、一覧の先頭に足す。名前は「〇〇のコピー」なので、そのまま名前の変更を始める */
  async function copy(slug: string) {
    setConfirming(null);
    setError(null);
    setCopying(slug);
    try {
      const res = await fetch(`/api/diagrams/${slug}/copy`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { diagram?: DiagramMeta; error?: string };
      if (!res.ok || !data.diagram) throw new Error(data.error ?? "コピーに失敗しました");
      const created = data.diagram;
      setDiagrams((prev) => [created, ...prev]);
      startEdit(created.slug, created.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "コピーに失敗しました");
    } finally {
      setCopying(null);
    }
  }

  /** 図のデータ（.json）を書き出す。一覧の「ファイルから読み込む」で、別の環境でも同じ図を作れる */
  async function exportJson(slug: string, name: string) {
    setConfirming(null);
    setError(null);
    setNotice(null);
    setExporting(slug);
    try {
      const res = await fetch(`/api/diagrams/${slug}`);
      const data = (await res.json().catch(() => ({}))) as Partial<DiagramFile> & { error?: string };
      if (!res.ok || !data.model) throw new Error(data.error ?? "図を読み込めませんでした");
      const file = exportFileName(name, "json");
      download(file, EXPORT_MIME.json, toFlowExport(data.model));
      setNotice(`${file} を保存しました`);
    } catch (e) {
      setError(e instanceof Error ? `エクスポートできませんでした: ${e.message}` : "エクスポートできませんでした");
    } finally {
      setExporting(null);
    }
  }

  function startEdit(slug: string, name: string) {
    setConfirming(null);
    setError(null);
    setEditingSlug(slug);
    setEditName(name);
  }

  async function saveRename(slug: string) {
    setRenaming(true);
    setError(null);
    try {
      const res = await fetch(`/api/diagrams/${slug}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const data = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
      if (!res.ok || !data.name) throw new Error(data.error ?? "名前の変更に失敗しました");
      const name = data.name;
      setDiagrams((prev) => prev.map((x) => (x.slug === slug ? { ...x, name } : x)));
      setEditingSlug(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "名前の変更に失敗しました");
    } finally {
      setRenaming(false);
    }
  }

  const input =
    "w-full rounded-md border border-black/15 bg-transparent px-3 py-1.5 text-sm dark:border-white/20";
  const btn =
    "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";

  const shown = sortDiagrams(filterDiagrams(diagrams, query), sort);
  const sortHeader = (key: SortKey, label: string, align: "left" | "right" = "left") => {
    const active = sort.key === key;
    const arrow = (
      <span aria-hidden className={`text-xs ${active ? "" : "opacity-0"}`}>
        {sort.dir === "asc" ? "▲" : "▼"}
      </span>
    );
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className={`px-3 py-2 font-medium ${key === "name" ? "" : "w-px whitespace-nowrap"} ${align === "right" ? "text-right" : "text-left"}`}
      >
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded hover:text-inherit ${active ? "text-inherit" : ""}`}
          title={`${label}で並べ替え`}
          onClick={() =>
            setSort(active ? { key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] })
          }
        >
          {/* 右寄せの列は印を左に置き、見出しの文字を数字の右端にそろえる */}
          {align === "right" && arrow}
          {label}
          {align === "left" && arrow}
        </button>
      </th>
    );
  };
  const small =
    "rounded-md border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-4">
      <TutorialVideos />

      {/* 新しく作る・読み込むと、保存済みの図を開いて直すを、近くに置く */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="font-medium">新しい図を描く</h2>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void create(title);
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
              業務名
              <input
                className={input}
                value={title}
                maxLength={60}
                required
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 月次請求書発行業務"
              />
            </label>
            <button type="submit" className={btn} disabled={busy || title.trim() === ""}>
              作成して開く
            </button>
            <span className="text-sm text-zinc-500 sm:pb-1.5">または</span>
            <button
              type="button"
              className={btn}
              disabled={busy}
              title="エクスポートした業務フロー（.json）から新しい図を作ります"
              onClick={() => fileInput.current?.click()}
            >
              ファイルから読み込む
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                // 同じファイルを選び直しても onChange が来るよう、選択を空にしておく
                e.target.value = "";
                if (file) void importFile(file);
              }}
            />
          </form>
          {error && (
            <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">保存済みの図（{diagrams.length}）</h2>
            {diagrams.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="sr-only">業務名で絞り込む</span>
                <input
                  type="search"
                  className={`${input} w-64`}
                  value={query}
                  placeholder="業務名で絞り込む"
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim() && (
                  <span className="shrink-0 tabular-nums">
                    {shown.length} / {diagrams.length} 件
                  </span>
                )}
              </label>
            )}
          </div>
          {notice && (
            <p role="status" className="text-sm text-zinc-500">
              {notice}
            </p>
          )}
          {diagrams.length === 0 ? (
            <p className="text-sm text-zinc-500">まだありません。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-black/10 dark:border-white/15">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="border-b border-black/10 bg-zinc-50 text-zinc-500 dark:border-white/15 dark:bg-white/5">
                  <tr>
                    {sortHeader("name", "業務名")}
                    {sortHeader("actors", "登場人物", "right")}
                    {sortHeader("steps", "ステップ", "right")}
                    {sortHeader("updatedAt", "更新日時")}
                    <th scope="col" className="w-px whitespace-nowrap px-3 py-2 text-right font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/15">
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                        「{query.trim()}」に一致する図はありません。
                      </td>
                    </tr>
                  )}
                  {shown.map((d) => (
                    <tr key={d.slug} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
                      <td className="max-w-0 px-3 py-2">
                        {editingSlug === d.slug ? (
                          <input
                            autoFocus
                            aria-label="新しい業務名"
                            className={input}
                            value={editName}
                            maxLength={60}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.nativeEvent.isComposing) void saveRename(d.slug);
                              if (e.key === "Escape") setEditingSlug(null);
                            }}
                          />
                        ) : (
                          <a href={`/${d.slug}`} className="block truncate font-medium hover:underline" title={d.name}>
                            {d.name}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.actors}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d.steps}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                        {fmt(d.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className="flex justify-end gap-1.5">
                          {editingSlug === d.slug ? (
                            <>
                              <button
                                className={small}
                                disabled={renaming || editName.trim() === ""}
                                onClick={() => void saveRename(d.slug)}
                              >
                                保存
                              </button>
                              <button className={small} disabled={renaming} onClick={() => setEditingSlug(null)}>
                                やめる
                              </button>
                            </>
                          ) : confirming === d.slug ? (
                            <>
                              <button className={small} onClick={() => void remove(d.slug)}>
                                削除する
                              </button>
                              <button className={small} onClick={() => setConfirming(null)}>
                                やめる
                              </button>
                            </>
                          ) : (
                            <>
                              <button className={small} onClick={() => startEdit(d.slug, d.name)}>
                                名前を変更
                              </button>
                              <button
                                className={small}
                                disabled={copying !== null}
                                title="この図を写した新しい図を作ります（元の図はそのまま）"
                                onClick={() => void copy(d.slug)}
                              >
                                {copying === d.slug ? "コピー中…" : "コピー"}
                              </button>
                              <button
                                className={small}
                                disabled={exporting !== null}
                                title="図のデータ（.json）を保存します。「ファイルから読み込む」で、別の環境でも同じ図を作れます（バックアップ・受け渡し用）"
                                onClick={() => void exportJson(d.slug, d.name)}
                              >
                                {exporting === d.slug ? "書き出し中…" : "エクスポート"}
                              </button>
                              <button className={small} onClick={() => setConfirming(d.slug)}>
                                削除
                              </button>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <ReadingDictionary />
    </div>
  );
}
