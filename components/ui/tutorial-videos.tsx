"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/**
 * 動画の本体とサムネイルは public/videos に置く。大きいので git には入れず、
 * Docker イメージのビルド時に取り込む。
 * シークは静的配信の Range 応答に任せる（専用の配信 API は要らない）。
 */
const VIDEOS = [
  { id: "01-overview", title: "アプリの概要", length: "12分" },
  { id: "02-drawing", title: "業務フロー図の描き方", length: "16分" },
] as const;

type Video = (typeof VIDEOS)[number];

/** サムネイルの並びと、押すと開く再生ダイアログ。 */
export function TutorialVideos() {
  const ref = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [failed, setFailed] = useState(false);

  function open(video: Video) {
    setPlaying(video);
    setFailed(false);
    ref.current?.showModal();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">使い方の動画</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {VIDEOS.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="group block w-full overflow-hidden rounded-md border border-black/10 text-left hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={() => open(v)}
            >
              <span className="relative block aspect-video">
                <Image src={`/videos/${v.id}.jpg`} alt="" fill unoptimized className="object-cover" />
                <span className="absolute inset-0 flex items-start justify-end bg-black/5 p-3 group-hover:bg-black/20">
                  <span className="flex size-12 items-center justify-center rounded-full bg-black/70 pl-1 text-xl text-white">
                    ▶
                  </span>
                </span>
              </span>
              <span className="block p-3">
                <span className="block truncate font-medium">{v.title}</span>
                <span className="block text-xs text-zinc-500">約{v.length}・音声なし（字幕つき）</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* 閉じたら video ごと外して、再生とダウンロードを止める */}
      <dialog
        ref={ref}
        onClose={() => setPlaying(null)}
        className="m-auto w-[min(80rem,94vw)] rounded-lg border border-black/15 bg-white p-4 text-inherit backdrop:bg-black/60 dark:border-white/20 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate font-medium">{playing?.title}</h2>
            <button
              type="button"
              className="shrink-0 rounded-md border border-black/15 px-2.5 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              onClick={() => ref.current?.close()}
            >
              閉じる
            </button>
          </div>
          {failed ? (
            <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
              動画を読み込めませんでした。
            </p>
          ) : (
            playing && (
              <video
                key={playing.id}
                src={`/videos/${playing.id}.mp4`}
                poster={`/videos/${playing.id}.jpg`}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="max-h-[80vh] w-full rounded bg-black"
                onError={() => setFailed(true)}
              />
            )
          )}
        </div>
      </dialog>
    </section>
  );
}
