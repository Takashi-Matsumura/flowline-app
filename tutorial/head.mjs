// 撮影スクリプトの共通部分。build.mjs が body<n>.mjs とつないで record<n>.mjs を作る。
// 使い方: SAMPLE=<図の .json> node record<n>.mjs [--fast]
//   --fast  待ち時間を縮め、字幕ごとの静止画を shots/ に出す（強調枠の位置の確認用。録画はしない）
// 既定      実時間で走らせ、frames/ に画面を、captions-<n>.json に字幕の時刻を書く
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { stageHtml, STAGE_W, STAGE_H } from "./stage.mjs";

const FAST = process.argv.includes("--fast");
const BASE = process.env.APP_BASE ?? "http://127.0.0.1:18063";
const slug = readFileSync("slug.txt", "utf8").trim();
const sample = JSON.parse(readFileSync(process.env.SAMPLE ?? "sample.json", "utf8"));
const ai = (n) => JSON.parse(readFileSync(`ai/${n}.json`, "utf8"));

await fetch(`${BASE}/api/diagrams/${slug}`, {
  method: "PUT",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: sample.model }),
}).then((r) => { if (!r.ok) throw new Error(`reset ${r.status}`); });

rmSync("frames", { recursive: true, force: true });
rmSync("shots", { recursive: true, force: true });
mkdirSync("frames", { recursive: true });
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: STAGE_W, height: STAGE_H },
  deviceScaleFactor: 1,
  colorScheme: "light",
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
});
// --fast では、見つからない部品で長く待たずに止める（直す場所をすぐ知るため）
if (FAST) ctx.setDefaultTimeout(8000);
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await ctx.route(`${BASE}/__stage`, (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: stageHtml }));
// AI の応答は、一度本物で取ったものを返す（字幕と画面の内容を確実に合わせるため）
for (const [name, delay] of [["review", 4000], ["narrate", 200], ["summarize", 3000]]) {
  await ctx.route(new RegExp(`/api/${name}$`), async (r) => {
    if (r.request().method() !== "POST") return r.continue();
    const a = ai(name);
    await new Promise((f) => setTimeout(f, FAST ? 100 : delay));
    await r.fulfill({ status: a.status, contentType: a.contentType, body: a.body });
  });
}

await page.goto(`${BASE}/__stage`);
await page.evaluate(() => document.fonts.ready);
const app = page.frame({ name: "app" });

// ── 録画 ──
const frames = [];
let t0 = null;
let session = null;
if (!FAST) {
  session = await ctx.newCDPSession(page);
  let n = 0;
  session.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    const file = `frames/${String(n++).padStart(6, "0")}.jpg`;
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, ts: metadata.timestamp });
    await session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
}

// ── 部品 ──
const sleep = (ms) => new Promise((f) => setTimeout(f, FAST ? Math.min(ms, 120) : ms));
const stage = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
const captions = [];
let shot = 0;
const clock = () => performance.now();
const holdFor = (t) => Math.min(13000, Math.max(3800, (t.replace(/\*\*/g, "").length / 6.5 + 1.6) * 1000));

/** 字幕を出して、読む時間だけ待つ */
async function say(text, { spots, hold, extra = 0 } = {}) {
  if (spots !== undefined) await stage("spots", spots);
  await showCap(text);
  await sleep(hold ?? holdFor(text) + extra);
  if (FAST) await snap();
}
async function showCap(text) {
  captions.push({ start: clock() - (t0 ?? clock()), text: text.replace(/\*\*/g, "") });
  await stage("caption", text);
}
async function snap() {
  await sleep(0);
  await new Promise((f) => setTimeout(f, 260));
  await page.screenshot({ path: `shots/${String(shot++).padStart(3, "0")}.jpg`, quality: 70, type: "jpeg" });
}
const clear = () => stage("spots", []);

let chapNo = 0;
const TOTAL = __TOTAL__;
async function chapter(name) {
  chapNo += 1;
  await stage("cursorHide");
  await clear();
  await showCap("");
  await stage("chapter", `第${chapNo}章`, name, Math.round(((chapNo - 1) / TOTAL) * 100));
  await stage("card", `<div class="eyebrow">第${chapNo}章</div><h2>${name}</h2>`);
}
const hideCard = async () => { await stage("card", null); await sleep(500); };

/** 図の要素などの、撮影台の座標での外枠。複数なら全部を囲む */
async function box(...locs) {
  const bs = (await Promise.all(locs.map((l) => l.boundingBox()))).filter(Boolean);
  if (!bs.length) throw new Error("no box");
  const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y));
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.width)) - x, h: Math.max(...bs.map((b) => b.y + b.height)) - y };
}
const spot = async (locs, opt = {}) => ({ ...(await box(...[locs].flat())), ...opt });
const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

async function moveTo(loc, ms = 800) {
  const c = center(await box(loc));
  await stage("cursor", c.x, c.y, FAST ? 1 : ms);
  await sleep(ms + 80);
  return c;
}
async function click(loc, { ms = 800, pause = 350 } = {}) {
  const c = await moveTo(loc, ms);
  await sleep(pause);
  await stage("ripple", c.x, c.y);
  await page.mouse.click(c.x, c.y);
}

/** 図のスクロール（ゆっくり動かす）。スクロールしている箱を内側から探す */
async function scrollDiagram(to, ms = 1400, scope = app) {
  await scope.evaluate(
    ([to, ms]) =>
      new Promise((done) => {
        const dlg = document.querySelector("dialog[open]");
        let el = (dlg ?? document).querySelector("svg .messageText, .summary-scroll") ;
        if (!el && dlg) el = dlg.querySelector("article, h1, table");
        while (el && !(el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement;
        if (!el) return done();
        const from = el.scrollTop, target = Math.max(0, Math.min(to, el.scrollHeight - el.clientHeight));
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          el.scrollTop = from + (target - from) * e;
          k < 1 ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [to, FAST ? 1 : ms],
  );
  await sleep(150);
}
/** 手順 n の番号の丸（図の上の位置） */
const num = (n) => app.locator("svg .sequenceNumber").filter({ hasText: new RegExp(`^${n}$`) }).first();
const msg = (i) => app.locator("svg .messageText").nth(i);
const btn = (name, opts = {}) => app.getByRole("button", { name, ...opts });
/** 手順 n が図の上から 1/4 くらいに来るようにスクロール */
async function scrollToStep(n, offset = 180) {
  const y = await app.evaluate(
    ([n]) => {
      const t = [...document.querySelectorAll("svg .sequenceNumber")].find((e) => e.textContent.trim() === String(n));
      let el = t;
      while (el && !(el.scrollHeight > el.clientHeight + 4 && getComputedStyle(el).overflowY !== "visible")) el = el.parentElement;
      return el.scrollTop + t.getBoundingClientRect().top - el.getBoundingClientRect().top;
    },
    [n],
  );
  await scrollDiagram(y - offset);
}

