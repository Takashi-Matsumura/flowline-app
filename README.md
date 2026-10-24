# Flowline

登場人物とステップを手で並べて**業務フロー図（UML シーケンス図）**を描き、そこから**業務分掌ドキュメント**まで作るアプリ。

[grilljev-demo](https://github.com/Takashi-Matsumura/grilljev-demo) の図の編集画面（/editor）を、独立したプロジェクトとして切り出したものです。

## 何ができるか

- **図を描く**: 登場人物（人・部署・システム・社外）を並べ、ステップ・分岐（alt / opt / loop）を足す。ドラッグで並べ替え・枠へ移動、元に戻す／やり直し、枠の折りたたみ
- **付箋**: ステップ・枠・登場人物に「チームで決めること」を貼る。答えを書くと「決まりごと」になる
- **点検**: コードの規則と AI で、図の抜け（起点・終点、承認、差し戻しなど）を指摘し、直す案を出す
- **流れの再生**: 図を 1 手順ずつ字幕つきで再生する（VOICEVOX があれば読み上げ）
- **業務分掌**: 部署別の分掌・責任分担表（RACI）・統制上の確認点などを Markdown で作る
- **書き出し**: `.drawio` / `.mmd` / `.svg`

事実の部分（表・図・確認点）はモデルからコードで作り、AI（ローカル LLM）が書くのは文の言い回しと概要・改善候補だけです。
AI が動いていなくても、図の編集と文書の事実の部分は使えます。

## 必要なもの

- Node.js 22.5 以上（`node:sqlite` を使うため）
- **llama.cpp**: `llama-server` と gemma 系の instruct モデル（点検・業務分掌・字幕の言い回しに使う）
- （任意）**VOICEVOX** エンジン（流れの再生の読み上げ）

## セットアップ

```bash
npm install
cp .env.example .env.local

# ローカル LLM。ポート 8080
llama-server -m /path/to/gemma-instruct.gguf --port 8080

# （任意）VOICEVOX。ポート 50021
docker compose -f docker-compose.voicevox.yml up -d

npm run dev
```

http://localhost:3000 を開きます。

### 環境変数（`.env.local`）

| 変数 | 既定 | 用途 |
|---|---|---|
| `LLAMA_BASE_URL` | `http://localhost:8080` | llama-server |
| `LLAMA_MODEL` | `gemma` | llama-server に渡すモデル名 |
| `LLAMA_IDLE_TIMEOUT_MS` | `120000` | トークンが届かない時間がこれを超えたら打ち切る |
| `VOICEVOX_BASE_URL` | `http://127.0.0.1:50021` | VOICEVOX エンジン。起動していなければ読み上げなしで再生する |
| `VOICEVOX_SPEAKER` | `8` | 読み上げの話者（スタイル ID）。8 = 春日部つむぎ |
| `DATA_DIR` | `./data` | 図の保存先（SQLite の `flowline.db`） |

## ディレクトリ構成

```
app/
  page.tsx            図の一覧（/）
  [slug]/page.tsx     図の編集画面（/[slug]）
  api/                図の保存・点検・業務分掌・字幕・読み上げ
components/
  editor/             編集画面（パネル・登場人物・付箋・点検・再生）
  diagram/            図の描画（Mermaid）と書き出し
  summary/            業務分掌のダイアログ
  ui/                 小さな共通部品
lib/
  model/              図のモデル（型・reducer・分岐・付箋）
  render/             Mermaid / drawio / SVG への変換
  review/             点検（規則と AI）
  summary/            業務分掌の組み立て
  preview/            流れの再生の場面と字幕
  store/              SQLite への保存
prompts/              LLM のプロンプト
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバ |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |

## ライセンス

[MIT License](./LICENSE) © 2026 Takashi Matsumura
