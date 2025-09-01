#!/bin/bash
# 眼鏡店顧客管理システム - 環境変数生成スクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 眼鏡店顧客管理システム 環境変数生成スクリプト ===${NC}"
echo ""

# 必要なコマンドの確認
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}エラー: $1 コマンドが見つかりません${NC}"
        exit 1
    fi
}

check_command openssl
check_command date

# 安全な秘密鍵の生成
generate_secret() {
    openssl rand -hex 32
}

generate_base64_secret() {
    openssl rand -base64 32
}

# 強力なパスワード生成
generate_password() {
    openssl rand -base64 24 | tr -d "=+/" | cut -c1-16
}

echo -e "${BLUE}新しい環境変数を生成しています...${NC}"

# 秘密鍵の生成
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)
SESSION_SECRET=$(generate_secret)
DB_ENCRYPTION_KEY=$(generate_base64_secret)

# パスワードの生成
DB_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)

# 現在の日時
GENERATED_DATE=$(date '+%Y-%m-%d %H:%M:%S')

# .env ファイル生成
cat > .env << EOF
# 眼鏡店顧客管理システム - 自動生成された環境変数
# 生成日時: ${GENERATED_DATE}
# ⚠️  このファイルには機密情報が含まれています。適切に管理してください。

# =================================================================
# Docker Compose 設定
# =================================================================
COMPOSE_PROJECT_NAME=glasses_store
NODE_ENV=development

# ポート設定
FRONTEND_PORT=3000
BACKEND_PORT=3001
DB_PORT=5432
REDIS_PORT=6379
NGINX_PORT=80
NGINX_SSL_PORT=443

# =================================================================
# PostgreSQL設定
# =================================================================
POSTGRES_DB=glasses_store_db
POSTGRES_USER=glasses_user
POSTGRES_PASSWORD=${DB_PASSWORD}

# =================================================================
# Redis設定
# =================================================================
REDIS_PASSWORD=${REDIS_PASSWORD}

# =================================================================
# セキュリティ設定（自動生成）
# =================================================================
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
SESSION_SECRET=${SESSION_SECRET}
DB_ENCRYPTION_KEY=${DB_ENCRYPTION_KEY}

# =================================================================
# ネットワーク設定
# =================================================================
DOCKER_NETWORK_NAME=glasses_network
EOF

# バックエンド用 .env ファイル生成
cat > backend/.env << EOF
# バックエンド用環境変数 - 自動生成
# 生成日時: ${GENERATED_DATE}

# =================================================================
# アプリケーション設定
# =================================================================
NODE_ENV=development
PORT=3001
APP_NAME=眼鏡店顧客管理システム

# =================================================================
# データベース設定
# =================================================================
DB_HOST=postgres
DB_PORT=5432
DB_NAME=${POSTGRES_DB:-glasses_store_db}
DB_USER=${POSTGRES_USER:-glasses_user}
DB_PASSWORD=${DB_PASSWORD}
DB_ENCRYPTION_KEY=${DB_ENCRYPTION_KEY}

# =================================================================
# Redis設定
# =================================================================
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# =================================================================
# JWT認証設定
# =================================================================
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# =================================================================
# セッション管理設定
# =================================================================
SESSION_SECRET=${SESSION_SECRET}
SESSION_MAX_AGE=1800000

# =================================================================
# セキュリティ設定
# =================================================================
BCRYPT_SALT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =================================================================
# ファイル設定
# =================================================================
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=10485760
CORS_ORIGIN=http://localhost:3000

# =================================================================
# ログ設定
# =================================================================
LOG_LEVEL=debug
LOG_FILE_PATH=/app/logs/app.log
EOF

# フロントエンド用 .env.local ファイル生成
cat > frontend/.env.local << EOF
# フロントエンド用環境変数 - 自動生成
# 生成日時: ${GENERATED_DATE}

# =================================================================
# アプリケーション設定
# =================================================================
REACT_APP_APP_NAME=眼鏡店顧客管理システム
REACT_APP_VERSION=1.0.0

# =================================================================
# API設定
# =================================================================
REACT_APP_API_BASE_URL=http://localhost:3001/api
REACT_APP_WS_URL=ws://localhost:3001

# =================================================================
# 開発設定
# =================================================================
REACT_APP_DEBUG_MODE=true
CHOKIDAR_USEPOLLING=true
WATCHPACK_POLLING=true

# =================================================================
# 機能フラグ
# =================================================================
REACT_APP_FEATURE_ANALYTICS_ENABLED=true
REACT_APP_FEATURE_EXPORT_ENABLED=true
REACT_APP_ANNOTATION_ENABLED=true
EOF

echo -e "${GREEN}✅ 環境変数ファイルが生成されました：${NC}"
echo -e "  📁 .env"
echo -e "  📁 backend/.env"
echo -e "  📁 frontend/.env.local"
echo ""

echo -e "${BLUE}📋 生成された認証情報：${NC}"
echo -e "${YELLOW}データベース：${NC}"
echo -e "  ユーザー: ${POSTGRES_USER:-glasses_user}"
echo -e "  パスワード: ${DB_PASSWORD}"
echo ""
echo -e "${YELLOW}Redis：${NC}"
echo -e "  パスワード: ${REDIS_PASSWORD}"
echo ""

echo -e "${RED}⚠️  重要な注意事項：${NC}"
echo -e "1. 生成された認証情報は安全な場所に保管してください"
echo -e "2. 本番環境では必ずパスワードを変更してください"
echo -e "3. .env ファイルは Git にコミットしないでください"
echo ""

echo -e "${BLUE}🚀 次のステップ：${NC}"
echo -e "1. ${GREEN}make setup${NC} - 初回セットアップを実行"
echo -e "2. ${GREEN}make dev${NC} - 開発環境を起動"
echo ""

# .gitignore に環境変数ファイルを追加
if [ ! -f .gitignore ]; then
    touch .gitignore
fi

if ! grep -q ".env" .gitignore; then
    echo "" >> .gitignore
    echo "# 環境変数ファイル" >> .gitignore
    echo ".env" >> .gitignore
    echo "backend/.env" >> .gitignore
    echo "frontend/.env.local" >> .gitignore
    echo -e "${GREEN}✅ .gitignore に環境変数ファイルを追加しました${NC}"
fi

echo -e "${GREEN}🎉 環境変数生成が完了しました！${NC}"