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

/** 再生速度の選択肢。字幕を読む時間が要るので 1.5 倍までにする */
const RATES = [1, 1.25, 1.5] as const;

/** 残り秒数を「12:07」の形にする */
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** サムネイルの並びと、押すと開く再生ダイアログ。 */
export function TutorialVideos() {
  const ref = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [failed, setFailed] = useState(false);
  /** 動画の終わりまでの秒数（今の速度で再生したときの実時間）。長さが分かるまでは null */
  const [remaining, setRemaining] = useState<number | null>(null);
  /** 選んだ速度は、ダイアログを閉じても次の動画に引き継ぐ */
  const [rate, setRate] = useState<number>(1);

  function open(video: Video) {
    setPlaying(video);
    setFailed(false);
    setRemaining(null);
    ref.current?.showModal();
  }

  function updateRemaining(v: HTMLVideoElement) {
    if (!Number.isFinite(v.duration)) return;
    setRemaining(Math.max(0, Math.ceil((v.duration - v.currentTime) / v.playbackRate)));
  }

  function changeRate(next: number) {
    setRate(next);
    // ratechange で残り時間も更新される
    if (videoRef.current) videoRef.current.playbackRate = next;
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
            <span className="ml-auto flex shrink-0 items-center gap-3">
              {playing && !failed && (
                <span role="group" aria-label="再生速度" className="flex gap-1 rounded-md bg-zinc-100 p-0.5 text-xs dark:bg-white/10">
                  {RATES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={rate === r}
                      className={`rounded px-2 py-1 tabular-nums ${
                        rate === r ? "bg-white shadow-sm dark:bg-zinc-700" : "text-zinc-500 hover:text-inherit"
                      }`}
                      onClick={() => changeRate(r)}
                    >
                      x{r}
                    </button>
                  ))}
                </span>
              )}
              {remaining !== null && !failed && (
                <span className="text-sm tabular-nums text-zinc-500" title="今の速度で再生したときの、終わりまでの時間">
                  残り {clock(remaining)}
                </span>
              )}
              <button
                type="button"
                className="rounded-md border border-black/15 px-2.5 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                onClick={() => ref.current?.close()}
              >
                閉じる
              </button>
            </span>
          </div>
          {failed ? (
            <p role="alert" className="text-sm text-amber-600 dark:text-amber-400">
              動画を読み込めませんでした。
            </p>
          ) : (
            playing && (
              <video
                key={playing.id}
                ref={videoRef}
                src={`/videos/${playing.id}.mp4`}
                poster={`/videos/${playing.id}.jpg`}
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="max-h-[80vh] w-full rounded bg-black"
                onError={() => setFailed(true)}
                onLoadedMetadata={(e) => {
                  // 新しい video は速度 1 で始まるので、選んである速度に合わせる
                  e.currentTarget.playbackRate = rate;
                  updateRemaining(e.currentTarget);
                }}
                onRateChange={(e) => {
                  // ブラウザの操作バー（⋮）から変えた場合も、ボタンの表示を合わせる
                  setRate(e.currentTarget.playbackRate);
                  updateRemaining(e.currentTarget);
                }}
                onTimeUpdate={(e) => updateRemaining(e.currentTarget)}
              />
            )
          )}
        </div>
      </dialog>
    </section>
  );
}
