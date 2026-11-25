// 録画用の一時コンテナに、題材の図を 1 枚入れて、その slug を slug.txt に書く（稼働中のアプリには触れない）。
// 使い方: node seed.mjs <図の .json> [図の名前]
//   図の .json は、一覧の「エクスポート」で書き出した形式か、保存データそのもの（name と model を持つ）
import { readFileSync, writeFileSync } from "node:fs";
const BASE = process.env.APP_BASE ?? "http://127.0.0.1:18063";
const [file = "sample.json", nameArg] = process.argv.slice(2);
const s = JSON.parse(readFileSync(file, "utf8"));
const name = nameArg ?? s.name;
if (!name) throw new Error("図の名前を 2 つ目の引数で渡してください");
const r = await fetch(`${BASE}/api/diagrams`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
const { slug } = await r.json();
const p = await fetch(`${BASE}/api/diagrams/${slug}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: s.model }) });
if (!p.ok) throw new Error(`PUT ${p.status}`);
writeFileSync("slug.txt", slug);
console.log(slug, name);
