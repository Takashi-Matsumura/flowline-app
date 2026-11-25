// 実物のアプリを動かして、AI の応答を一度だけ本物で取り、録画で再生できるように保存する
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const slug = readFileSync("slug.txt", "utf8").trim();
mkdirSync("ai", { recursive: true }); mkdirSync("shots", { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1536, height: 744 }, deviceScaleFactor: 1, colorScheme: "light", locale: "ja-JP", timezoneId: "Asia/Tokyo" });
const page = await ctx.newPage();
page.on("console", m => { if (m.type() === "error") console.log("console.error:", m.text().slice(0, 200)); });
for (const [name, rx] of [["review", /\/api\/review$/], ["narrate", /\/api\/narrate$/], ["summarize", /\/api\/summarize$/]]) {
  page.on("response", async res => {
    if (rx.test(new URL(res.url()).pathname) && res.request().method() === "POST") {
      const body = await res.text();
      writeFileSync(`ai/${name}.json`, JSON.stringify({ status: res.status(), contentType: res.headers()["content-type"], body }));
      console.log(name, res.status(), body.length);
    }
  });
}
await page.goto(`http://127.0.0.1:18063/${slug}`);
await page.waitForSelector("svg .messageText");
await page.screenshot({ path: "shots/editor.png" });
const keepReview = true; await page.getByRole("button", { name: "フローを点検", exact: true }).click();
await page.getByText(/AI の指摘（/).waitFor({ timeout: 300000 });
await page.screenshot({ path: "shots/review.png" });
await page.getByRole("button", { name: "フローの再生", exact: true }).click();
await page.waitForResponse(/api\/narrate/, { timeout: 300000 }).catch(e => console.log(e.message));
await page.waitForTimeout(1500);
await page.screenshot({ path: "shots/player.png" });
await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
await page.getByRole("button", { name: "業務分掌を作る" }).click();
await page.getByRole("tab", { name: "プレビュー" }).waitFor({ timeout: 400000 }).catch(e => console.log(e.message));
await page.waitForTimeout(500);
await page.screenshot({ path: "shots/summary.png" });
await b.close();
