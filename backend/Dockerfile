# Node.js バックエンド用 Dockerfile
# マルチステージビルドで開発環境と本番環境の両方をサポート

# =================================================================
# Base Stage - 共通設定
# =================================================================
FROM node:18-alpine AS base

# アプリケーション用ユーザーとグループの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S glasses -u 1001 -G nodejs

# 作業ディレクトリの設定
WORKDIR /app

# システムの依存関係をインストール
RUN apk add --no-cache \
    curl \
    postgresql-client \
    tini

# package.json と package-lock.json をコピー
COPY package*.json ./

# =================================================================
# Dependencies Stage - 依存関係のインストール
# =================================================================
FROM base AS deps

# 開発・本番両方の依存関係をインストール
RUN npm install --only=production && npm cache clean --force

# 開発用依存関係を別途インストール
FROM base AS deps-dev
RUN npm install && npm cache clean --force

# =================================================================
# Development Stage - 開発環境用
# =================================================================
FROM deps-dev AS development

# 開発用ポートを公開
EXPOSE 3001
EXPOSE 9229

# ソースコードをコピー
COPY . .

# ログディレクトリとアップロードディレクトリを作成
RUN mkdir -p /app/logs /app/uploads/customers && \
    chown -R glasses:nodejs /app/logs /app/uploads

# アプリケーションユーザーに切り替え
USER glasses

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# 開発サーバーを起動
CMD ["npm", "run", "dev"]

# =================================================================
# Builder Stage - TypeScript コンパイル用
# =================================================================
FROM deps-dev AS builder

# ソースコードをコピー
COPY . .

# TypeScript プロジェクトをビルド
RUN npm run build

# 不要なファイルを削除
RUN rm -rf src/ *.ts *.json.tmp

# =================================================================
# Production Stage - 本番環境用
# =================================================================
FROM base AS production

# 本番用ポートを公開
EXPOSE 3001

# 本番用依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules

# ビルド済みアプリケーションをコピー
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./

# 設定ファイルをコピー
COPY database/ ./database/

# ログディレクトリとアップロードディレクトリを作成し、権限設定
RUN mkdir -p /app/logs /app/uploads/customers && \
    chown -R glasses:nodejs /app

# アプリケーションユーザーに切り替え
USER glasses

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Tiniを使用してプロセス管理
ENTRYPOINT ["/sbin/tini", "--"]

# 本番サーバーを起動
CMD ["node", "dist/index.js"]

# =================================================================
# Test Stage - テスト実行用
# =================================================================
FROM deps-dev AS test

# テストに必要な追加ツール
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# ソースコードをコピー
COPY . .

# アプリケーションユーザーに切り替え
USER glasses

# テストを実行
CMD ["npm", "test"]