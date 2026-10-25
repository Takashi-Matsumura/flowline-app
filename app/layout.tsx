import type { Metadata } from "next";
import localFont from "next/font/local";
import { InlineScript } from "@/components/ui/inline-script";
import { THEME_INIT_SCRIPT } from "@/lib/theme-script";
import "./globals.css";

/**
 * フォントは同梱する（next/font/local）。
 *
 * next/font/google は **ビルド時に fonts.googleapis.com へ取りに行く**ため、
 * 社内プロキシ越しのイメージビルドが断続的に
 * 「Failed to fetch Geist from Google Fonts」で落ちていた。
 * ファイルを app/fonts に置けば、ビルドに外部通信が要らなくなる。
 *
 * 置いてあるのは Google Fonts が配信している latin サブセットの可変フォントそのもの
 * （Geist v5 / Geist Mono v6、weight 100〜900 を 1 ファイルで賄う）。
 * 日本語はもともと Geist に字が無く、従来どおりシステムフォントにフォールバックする。
 */
const geistSans = localFont({
  src: "./fonts/Geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowline",
  description: "登場人物とステップを並べて業務フロー図を描き、業務分掌まで作る",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // 配色の dark クラスは、描画前のスクリプトが付ける（サーバーの描画とは食い違って当然）
      suppressHydrationWarning
    >
      <head>
        {/* 選んだ配色（無ければ OS の設定）を、最初の描画より前に当てる。lib/theme-script.ts */}
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
