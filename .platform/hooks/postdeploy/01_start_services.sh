#!/bin/bash

# Elastic Beanstalk デプロイ後の自動起動スクリプト
# 眼鏡店管理システム用

set -e

echo "=== EB Post Deploy Hook: 眼鏡店管理システム起動開始 ==="

# 環境変数設定
export APP_DIR="/var/app/current"
export LOG_FILE="/var/log/eb-hooks.log"

# ログ出力関数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "Post Deploy Hook開始"

# アプリケーションディレクトリに移動
cd $APP_DIR

# Docker が動作しているか確認
if ! systemctl is-active --quiet docker; then
    log "Dockerサービスを開始中..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Docker Composeがインストールされているか確認
if ! command -v docker-compose &> /dev/null; then
    log "Docker Composeをインストール中..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 必要ディレクトリの作成
log "必要ディレクトリを作成中..."
mkdir -p uploads logs/app logs/nginx backups/postgres backups/redis certs

# .env.production ファイルの存在確認
if [ ! -f ".env.production" ]; then
    log ".env.production ファイルを作成中..."
    cat > .env.production << 'EOF'
# EB本番環境設定
NODE_ENV=production
COMPOSE_PROJECT_NAME=glasses_store_prod

# ポート設定（EB環境用）
FRONTEND_PORT=3000
BACKEND_PORT=3001
DB_PORT=5432
REDIS_PORT=6379
NGINX_PORT=80

# PostgreSQL設定
POSTGRES_DB=glasses_store_db
POSTGRES_USER=glasses_user
POSTGRES_PASSWORD=GlassesStoreSecure2024!

# Redis設定
REDIS_PASSWORD=RedisSecure2024!

# JWT設定（本番用ランダム生成）
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# CORS設定（ALB URL）
CORS_ORIGIN=http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
CORS_ORIGIN_WS=ws://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com

# pgAdmin設定
PGADMIN_EMAIL=admin@glasses-store.com
PGADMIN_PASSWORD=PgAdminSecure2024!

# ログレベル
LOG_LEVEL=info
EOF
fi

# Docker Composeでサービス起動
log "Docker Composeでサービスを起動中..."
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d

# ヘルスチェック待機
log "ヘルスチェック待機中..."
sleep 30

# サービス状態確認
log "サービス状態確認中..."
docker-compose -f docker-compose.yml -f docker-compose.production.yml ps

# PostgreSQL接続確認
log "PostgreSQL接続確認中..."
for i in {1..10}; do
    if docker-compose -f docker-compose.yml -f docker-compose.production.yml exec -T postgres pg_isready -U glasses_user; then
        log "PostgreSQL接続成功"
        break
    else
        log "PostgreSQL接続待機中... (${i}/10)"
        sleep 5
    fi
done

# Redis接続確認
log "Redis接続確認中..."
for i in {1..10}; do
    if docker-compose -f docker-compose.yml -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q "PONG"; then
        log "Redis接続成功"
        break
    else
        log "Redis接続待機中... (${i}/10)"
        sleep 5
    fi
done

# API ヘルスチェック
log "API ヘルスチェック中..."
for i in {1..20}; do
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log "API ヘルスチェック成功"
        break
    else
        log "API 起動待機中... (${i}/20)"
        sleep 10
    fi
done

# 最終確認
log "最終サービス状態確認..."
docker-compose -f docker-compose.yml -f docker-compose.production.yml ps

log "=== Post Deploy Hook完了 ==="
log "アクセスURL: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/"

exit 0