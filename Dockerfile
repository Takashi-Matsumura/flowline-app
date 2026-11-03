# syntax=docker/dockerfile:1
#
# Flowline (Next.js 16) 本番イメージ。
# Next.js の output:"standalone" を使い、3 ステージで最小ランタイムを作る。
#   deps    : 依存インストール（lockfile ベース）
#   builder : next build → .next/standalone を生成
#   runner  : standalone 出力 + static + prompts を載せた最終イメージ
#
# 注意: llama-server と VOICEVOX はこのイメージに含めない。コンテナからは
#       host.docker.internal 経由で呼ぶ（docker-compose.yml を参照）。

# Node 24 LTS。node:sqlite（図の保存）がフラグ無しで使える。
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

# ---- deps: 依存だけを別レイヤでキャッシュ ----
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder: アプリをビルド ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# テレメトリ無効化（本番イメージビルドの外部通信を避ける）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner: 最終ランタイム ----
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# standalone の server.js をコンテナの外から届くアドレスで待ち受ける
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# 図（SQLite）の保存先。compose で同じパスに volume をマウントする。
ENV DATA_DIR=/data

# 非 root 実行ユーザ
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# standalone 出力（最小 node_modules + server.js を含む）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 静的アセットは standalone に含まれないので手動コピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public（解説動画とサムネイル）も standalone に含まれないので手動コピー
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# prompts/*.md は lib/prompts.ts が実行時に process.cwd()/prompts から読む
COPY --from=builder --chown=nextjs:nodejs /app/prompts ./prompts

# volume 初期化時の所有者を nextjs にする
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000

# next build が出力する最小サーバを起動（next start ではない）
CMD ["node", "server.js"]
