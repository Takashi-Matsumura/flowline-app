"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowModel } from "@/lib/model/types";

export type SaveStatus = "saved" | "saving" | "error";

const DEBOUNCE_MS = 1_500;

/**
 * 図を、変更のあとしばらく静かになってから自動保存する。
 * - 保存は 1 本ずつ（前の保存が終わってから次を送る。古い内容が新しい内容を上書きしない）
 * - 保存済みの内容（開いた直後に読み込んだ内容を含む）と同じなら保存しない。
 *   「初回の effect だけ飛ばす」作りにすると、開発時の Strict Mode が effect を 2 回走らせるため、
 *   開いただけで保存され更新日時（一覧の並び順）が変わってしまう
 * - 失敗したら「保存できていない」を表示し、次の変更でまた試す
 */
export function useDiagramAutosave(slug: string, model: FlowModel) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  /** 最後に保存した（または読み込んだ）モデル。モデルは不変なので参照で比べる */
  const saved = useRef(model);
  const latest = useRef(model);
  const inflight = useRef(false);

  useEffect(() => {
    latest.current = model;
    // 元に戻すなどで保存済みの内容に戻ったら、送るものは無い（送っている最中なら、終わったあと戻した内容を送る）
    if (model === saved.current && !inflight.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");

    async function flush() {
      if (inflight.current) return; // 送っている保存が終わったら、最新の内容まで続けて送る
      inflight.current = true;
      try {
        while (latest.current !== saved.current) {
          const sending = latest.current;
          const res = await fetch(`/api/diagrams/${slug}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ model: sending }),
          });
          if (!res.ok) throw new Error(String(res.status));
          saved.current = sending;
        }
        setStatus("saved");
      } catch {
        setStatus("error");
      } finally {
        inflight.current = false;
      }
    }

    const timer = setTimeout(() => void flush(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [slug, model]);

  return status;
}
