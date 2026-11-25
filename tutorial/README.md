# 使い方の動画の制作ファイル

一覧画面の「使い方の動画」3 本を作るためのスクリプト一式です。動画には音声がなく、画面の下の帯に字幕を出します。アプリの再生ダイアログでは、字幕（`.vtt`）を VOICEVOX で読み上げます。

| 回 | 題名 | 台本 | 題材の図 |
|---|---|---|---|
| 1 | アプリの概要 | `body1.mjs` | `sample.json`（請求書受領業務（改）） |
| 2 | 業務フロー図の描き方 | `body2.mjs` | 白紙から描く（一覧には `sample.json` を置く） |
| 3 | 枠を組み合わせる | `body3.mjs` | `../samples/combined-fragments.json` |

できあがった `.mp4` とサムネイル（`.jpg`）は大きいので git には入れません。字幕（`.vtt`）だけを `public/videos/` に入れています。

## しくみ

- `stage.mjs` … 撮影台（1920×1080）。上にアプリを iframe で 1.25 倍に出し、下 150px を字幕の帯にする。カーソル・強調枠・章カードは iframe の外に重ねる。
- `head.mjs` … 3 本に共通する部品（字幕を出す `say`、強調枠の `spot`、クリックの `click` など）と、CDP の screencast での録画。
- `body<n>.mjs` … 各回の本編（台本と操作）。
- `build.mjs` … `head.mjs` と `body<n>.mjs` をつないで `record<n>.mjs` を作る（作ったものは git に入れない）。
- `assemble.mjs` … 録ったコマと字幕の時刻から、30fps の `.mp4` と `.srt` / `.vtt` を作る。
- `seed.mjs` … 録画用のコンテナに題材の図を入れ、その slug を `slug.txt` に書く。
- `ai/` … 点検・再生の言い回し・業務分掌の AI 応答の控え（第 1 回で使う）。録画では毎回これを返すので、字幕と画面の中身がずれない。取り直すときは `capture-ai.mjs`（llama-server が要る）。

## 作り方

前提: Docker（Colima）、Node.js 22 以上、ffmpeg。VOICEVOX をホストの `:50021` で動かしておくと、再生ダイアログが「読み上げ」付きの見た目で撮れます。

1. アプリのイメージを最新にする（リポジトリの直下で）

   ```sh
   docker-compose build
   ```

2. 録画用の一時コンテナを立てる。稼働中のアプリ（:8062）では撮らない（自動保存で本物の図が変わるため）。図はコンテナの中だけに置き、終わったら消す。

   ```sh
   docker run -d --name flowline-rec -p 127.0.0.1:18063:3000 \
     --add-host host.docker.internal:host-gateway \
     -e DATA_DIR=/tmp/data -e LLAMA_BASE_URL=http://127.0.0.1:9 \
     -e VOICEVOX_BASE_URL=http://host.docker.internal:50021 \
     -e NO_PROXY=localhost,127.0.0.1,host.docker.internal -e no_proxy=localhost,127.0.0.1,host.docker.internal \
     flowline-app:latest
   ```

3. このフォルダで準備する

   ```sh
   cd tutorial
   npm install                 # playwright-core（Chromium は npx playwright-core install chromium で入る）
   node build.mjs 1 && node build.mjs 2 && node build.mjs 3
   ```

4. まず `--fast` で通して、強調枠の位置を確かめる。字幕ごとの静止画が `shots/` に出る（録画はしない）。画面が変わって部品が見つからないと、8 秒で止まって場所を教えてくれる。

   ```sh
   node seed.mjs sample.json
   node record1.mjs --fast
   ```

5. 実時間で録って組み立てる（1 本 10〜17 分かかる）

   ```sh
   node seed.mjs sample.json
   node record1.mjs && node assemble.mjs captions-1.json out Flowline_01_アプリの概要
   node record2.mjs && node assemble.mjs captions-2.json out Flowline_02_業務フロー図の描き方
   node seed.mjs ../samples/combined-fragments.json "請求書受領業務（複合フラグメントの見本）"
   SAMPLE=../samples/combined-fragments.json node record3.mjs && node assemble.mjs captions-3.json out Flowline_03_枠を組み合わせる
   ```

6. アプリに置く。サムネイルは最初の 3 秒目のコマ。

   ```sh
   for p in "01-overview:Flowline_01_アプリの概要" "02-drawing:Flowline_02_業務フロー図の描き方" "03-nesting:Flowline_03_枠を組み合わせる"; do
     id=${p%%:*}; base=${p#*:}
     cp "out/$base.mp4" "../public/videos/$id.mp4"
     cp "out/$base.vtt" "../public/videos/$id.vtt"
     ffmpeg -y -loglevel error -ss 3 -i "out/$base.mp4" -frames:v 1 -vf scale=1280:-1 -q:v 3 "../public/videos/$id.jpg"
   done
   ```

   長さが変わったら `components/ui/tutorial-videos.tsx` の `VIDEOS` も直す。動画はイメージに焼き込むので、置いたら `docker-compose up -d --build` で作り直す。

7. 片付け: `docker rm -f flowline-rec`

## 画面が変わったとき

- ボタンは名前（`aria-label` かボタンの文字）で探しています。名前が変わったら `body<n>.mjs` の `btn(...)` や `getByRole(...)` を直します。ツールバーの「ステップを追加」「分岐を追加」は、パネルの「＋ この中に分岐を追加」などと区別するため `exact: true` で探しています。
- 図の上の部品は Mermaid の SVG のクラス（`.messageText`、`.sequenceNumber`、`rect.actor-top` など）で探しています。
- 直したら `--fast` で通し、`shots/` の静止画で強調枠と字幕が合っているかを見てから録ります。
