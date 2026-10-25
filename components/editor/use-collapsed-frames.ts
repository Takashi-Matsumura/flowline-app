"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 図で畳んでいる枠（Branch.groupId）。図ごとに DB（diagrams.collapsed）に覚えさせ、
 * 次に開いたとき（別のブラウザ・シークレットウィンドウでも）同じ枠を畳んで見せる。
 * 畳むのは画面の見え方だけなので、図のデータ（FlowModel）には入れない。
 *
 * 保存は 1 本ずつ順に送る（続けて押しても、古い内容が新しい内容を上書きしない）。
 * keepalive を付けて、畳んだ直後に一覧へ戻っても保存が届くようにする。
 * 保存に失敗しても、この画面の見え方はそのまま（次に開いたときに戻るだけ）。
 */
export function useCollapsedFrames(
  slug: string,
  initial: readonly string[],
): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] {
  const [collapsed, setState] = useState<ReadonlySet<string>>(() => new Set(initial));
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const setCollapsed = useCallback(
    (next: ReadonlySet<string>) => {
      setState(next);
      const body = JSON.stringify({ collapsed: [...next] });
      queue.current = queue.current
        .then(() =>
          fetch(`/api/diagrams/${slug}/collapsed`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body,
            keepalive: true,
          }),
        )
        .catch(() => {});
    },
    [slug],
  );

  return [collapsed, setCollapsed];
}
