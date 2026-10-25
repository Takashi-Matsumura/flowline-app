/**
 * 描画前に走らせるインラインスクリプト。サーバーの HTML でだけ実行させる（クライアントの描画では text/plain にして、
 * React の「script は実行されない」警告を出さない）。node_modules/next/dist/docs の preventing-flash-before-hydration と同じ作法。
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
