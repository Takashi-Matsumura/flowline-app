// 録画スクリプト record<n>.mjs を、head.mjs（撮影台・部品）と body<n>.mjs（各回の本編）から作る。
// 使い方: node build.mjs <n>   … n = 1, 2, 3
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const n = process.argv[2];
if (!/^[123]$/.test(n ?? "")) throw new Error("使い方: node build.mjs <1|2|3>");
const body = readFileSync(here(`body${n}.mjs`), "utf8");
// 章の数は本編の chapter("…") の数から数える（進み具合の帯に使う）
const total = (body.match(/await chapter\("/g) ?? []).length;
const head = readFileSync(here("head.mjs"), "utf8").replace("__TOTAL__", String(total));
writeFileSync(here(`record${n}.mjs`), `${head}const VIDEO = ${n};\n${body}`);
console.log(`record${n}.mjs（${total} 章）`);
