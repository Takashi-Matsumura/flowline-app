// frames/ と captions-<n>.json から、MP4 と字幕ファイル（SRT / VTT）を作る
// 使い方: node assemble.mjs <captions-<n>.json> <出力先フォルダ> <ファイル名（拡張子なし）>
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
const [capFile, out, base] = process.argv.slice(2);
if (!base) throw new Error("使い方: node assemble.mjs <captions-<n>.json> <出力先フォルダ> <ファイル名>");
const { captions, end, t0Wall, frames } = JSON.parse(readFileSync(capFile, "utf8"));
const endS = end / 1000;
const pts = frames.map((f) => ({ file: f.file, t: f.ts - t0Wall }));
// 開始より前の最後のコマを 0 秒のコマにする
let i0 = 0; pts.forEach((p, i) => { if (p.t <= 0) i0 = i; });
const use = pts.slice(i0).filter((p) => p.t < endS); use[0].t = 0;
// 30fps の固定枠ごとに「その時刻に映っているコマ」を選んで渡す（字幕の時刻と厳密に一致する）
const FPS = 30, total = Math.round(endS * FPS);
const mp4 = `${out}/${base}.mp4`;
const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0",
  "-vf", "scale=1920:1080:out_color_matrix=bt709:out_range=tv,format=yuv420p",
  "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-g", "60", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
  "-movflags", "+faststart", "-an", mp4], { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((f, r) => ff.on("close", (c) => (c ? r(new Error("ffmpeg " + c)) : f())));
let j = 0, curFile = null, cur = null;
for (let k = 0; k < total; k++) {
  const t = k / FPS;
  while (j + 1 < use.length && use[j + 1].t <= t) j++;
  if (use[j].file !== curFile) { curFile = use[j].file; cur = readFileSync(curFile); }
  if (!ff.stdin.write(cur)) await once(ff.stdin, "drain");
}
ff.stdin.end();
await done;
const ts = (s, sep) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, x = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`; };
const cs = captions.map((c, i) => ({ ...c, end: captions[i + 1]?.start ?? end })).filter((c) => c.text);
const range = (i, sep) => `${ts(cs[i].start / 1000, sep)} --> ${ts(cs[i].end / 1000, sep)}`;
writeFileSync(`${out}/${base}.srt`, cs.map((c, i) => `${i + 1}\n${range(i, ",")}\n${c.text}\n`).join("\n"));
writeFileSync(`${out}/${base}.vtt`, "WEBVTT\n\n" + cs.map((c, i) => `${range(i, ".")}\n${c.text}\n`).join("\n"));
console.log(`frames used ${use.length}, duration ${endS.toFixed(1)}s`);
