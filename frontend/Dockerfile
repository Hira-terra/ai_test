# React フロントエンド用 Dockerfile
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
    git \
    tini

# package.json と package-lock.json をコピー
COPY package*.json ./

# =================================================================
# Dependencies Stage - 依存関係のインストール
# =================================================================
FROM base AS deps

# 本番用依存関係のインストール
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# 開発用依存関係を別途インストール
FROM base AS deps-dev
RUN npm install --legacy-peer-deps && npm cache clean --force

# =================================================================
# Development Stage - 開発環境用
# =================================================================
FROM deps-dev AS development

# 開発用ポートを公開
EXPOSE 3000

# ソースコードをコピー
COPY . .

# 環境変数を設定（開発時のホットリロード対応）
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
ENV FAST_REFRESH=true

# ビルドディレクトリを作成
RUN mkdir -p /app/build && \
    chown -R glasses:nodejs /app

# アプリケーションユーザーに切り替え
USER glasses

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# 開発サーバーを起動
CMD ["npm", "start"]

# =================================================================
# Builder Stage - React アプリケーションビルド用
# =================================================================
FROM deps-dev AS builder

# 環境変数の設定
ARG REACT_APP_API_BASE_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_APP_NAME="眼鏡店顧客管理システム"
ARG REACT_APP_VERSION="1.0.0"

ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
ENV REACT_APP_APP_NAME=${REACT_APP_APP_NAME}
ENV REACT_APP_VERSION=${REACT_APP_VERSION}

# ソースコードをコピー
COPY . .

# React アプリケーションをビルド
RUN npm run build

# ビルド結果の権限設定
RUN chown -R glasses:nodejs /app/build

# =================================================================
# Production Stage - 本番環境用（Nginx）
# =================================================================
FROM nginx:1.25-alpine AS production

# Nginx設定ファイルをコピー
COPY nginx.conf /etc/nginx/nginx.conf

# ビルド済みReactアプリをNginxに配置
COPY --from=builder /app/build /usr/share/nginx/html

# アプリケーション用ユーザーとグループの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S glasses -u 1001 -G nodejs

# ログディレクトリの作成
RUN mkdir -p /var/log/nginx && \
    chown -R glasses:nodejs /var/log/nginx

# 本番用ポートを公開
EXPOSE 80
EXPOSE 443

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Nginx を起動
CMD ["nginx", "-g", "daemon off;"]

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

# Puppeteer 用の環境変数
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# ソースコードをコピー
COPY . .

# アプリケーションユーザーに切り替え
USER glasses

# テストを実行
CMD ["npm", "test"]

# =================================================================
# Build-only Stage - ビルドのみ実行用
# =================================================================
FROM builder AS build-only

# ビルド結果のみを出力用
VOLUME ["/app/build"]

CMD ["echo", "Build completed. Check /app/build for output."]