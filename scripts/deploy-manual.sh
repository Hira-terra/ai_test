#!/bin/bash

# 手動デプロイメントスクリプト
# EC2インスタンス上で実行

set -e

# 設定値
APP_DIR="/home/ec2-user/glasses-store"
BACKUP_DIR="${APP_DIR}/backups"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.production.yml"
ENV_FILE="--env-file .env.production"

echo "=== 手動デプロイメント開始 $(date) ==="

# 現在のディレクトリを確認
cd "${APP_DIR}"

# 環境設定ファイルの存在確認
if [ ! -f ".env.production" ]; then
    echo "❌ エラー: .env.production ファイルが見つかりません"
    echo "   .env.production.example を参考に設定ファイルを作成してください"
    exit 1
fi

# Gitからの最新コード取得
echo "📥 最新コードを取得しています..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    echo "⚠️  警告: Gitリポジトリが初期化されていません"
    echo "   GitHub Actionsデプロイでは自動的にコードが同期されます"
fi

# 事前バックアップ（データベース）
echo "💾 デプロイ前バックアップを作成しています..."
BACKUP_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# PostgreSQLバックアップ（コンテナが動いている場合）
if docker-compose ${COMPOSE_FILES} ps postgres | grep -q "Up"; then
    echo "PostgreSQLをバックアップしています..."
    docker-compose ${COMPOSE_FILES} exec -T postgres pg_dump -U ${POSTGRES_USER:-glasses_user} ${POSTGRES_DB:-glasses_store_db} > "${BACKUP_DIR}/postgres/backup-${BACKUP_TIMESTAMP}.sql"
    echo "✅ PostgreSQLバックアップ完了: backup-${BACKUP_TIMESTAMP}.sql"
fi

# Redisバックアップ（コンテナが動いている場合）
if docker-compose ${COMPOSE_FILES} ps redis | grep -q "Up"; then
    echo "Redisをバックアップしています..."
    docker-compose ${COMPOSE_FILES} exec -T redis redis-cli BGSAVE
    sleep 5
    docker cp glasses_redis:/data/dump.rdb "${BACKUP_DIR}/redis/dump-${BACKUP_TIMESTAMP}.rdb" 2>/dev/null || echo "⚠️  Redis バックアップに失敗しました"
    echo "✅ Redisバックアップ完了: dump-${BACKUP_TIMESTAMP}.rdb"
fi

# 現在のコンテナ状態を記録
echo "📊 現在のコンテナ状態を記録しています..."
docker-compose ${COMPOSE_FILES} ps > "${BACKUP_DIR}/container-status-${BACKUP_TIMESTAMP}.txt"

# コンテナ停止
echo "🛑 既存のコンテナを停止しています..."
docker-compose ${COMPOSE_FILES} down --timeout 30

# 古いイメージの削除（ディスク容量節約）
echo "🧹 古いDockerイメージを削除しています..."
docker image prune -f --filter "until=24h"

# 新しいコンテナをビルド・起動
echo "🔨 新しいコンテナをビルド・起動しています..."
docker-compose ${COMPOSE_FILES} ${ENV_FILE} up -d --build

# ヘルスチェック待機
echo "⏳ サービスの起動を待機しています..."
sleep 30

# コンテナ状態確認
echo "📊 コンテナ状態を確認しています..."
docker-compose ${COMPOSE_FILES} ps

# ヘルスチェック実行
echo "🔍 ヘルスチェックを実行しています..."
HEALTH_CHECK_MAX_ATTEMPTS=10
HEALTH_CHECK_ATTEMPT=1

while [ $HEALTH_CHECK_ATTEMPT -le $HEALTH_CHECK_MAX_ATTEMPTS ]; do
    echo "ヘルスチェック試行 ${HEALTH_CHECK_ATTEMPT}/${HEALTH_CHECK_MAX_ATTEMPTS}..."
    
    # API ヘルスチェック
    if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
        echo "✅ API ヘルスチェック成功"
        API_HEALTHY=true
        break
    else
        echo "⏳ API が起動中..."
        API_HEALTHY=false
    fi
    
    HEALTH_CHECK_ATTEMPT=$((HEALTH_CHECK_ATTEMPT + 1))
    sleep 10
done

# フロントエンド ヘルスチェック
if curl -f -s http://localhost/ > /dev/null 2>&1; then
    echo "✅ フロントエンド ヘルスチェック成功"
    FRONTEND_HEALTHY=true
else
    echo "⚠️  フロントエンド ヘルスチェック失敗"
    FRONTEND_HEALTHY=false
fi

# データベース接続確認
if docker-compose ${COMPOSE_FILES} exec -T postgres pg_isready -U ${POSTGRES_USER:-glasses_user} > /dev/null 2>&1; then
    echo "✅ PostgreSQL 接続確認成功"
    DB_HEALTHY=true
else
    echo "⚠️  PostgreSQL 接続確認失敗"
    DB_HEALTHY=false
fi

# Redis接続確認
if docker-compose ${COMPOSE_FILES} exec -T redis redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis 接続確認成功"
    REDIS_HEALTHY=true
else
    echo "⚠️  Redis 接続確認失敗"
    REDIS_HEALTHY=false
fi

# ログ確認
echo "📋 最新のログを確認しています..."
echo "--- Backend Logs (最新20行) ---"
docker-compose ${COMPOSE_FILES} logs --tail=20 backend

echo "--- Frontend Logs (最新10行) ---"
docker-compose ${COMPOSE_FILES} logs --tail=10 frontend

echo "--- Nginx Logs (最新10行) ---"
docker-compose ${COMPOSE_FILES} logs --tail=10 nginx

# デプロイ結果サマリー
echo ""
echo "=== デプロイメント結果サマリー ==="
echo "実行日時: $(date)"
echo "バックアップ作成: ✅"
echo "コンテナ状態:"
echo "  - API ヘルス: $([ "$API_HEALTHY" = true ] && echo "✅ 正常" || echo "❌ 異常")"
echo "  - フロントエンド: $([ "$FRONTEND_HEALTHY" = true ] && echo "✅ 正常" || echo "❌ 異常")"
echo "  - PostgreSQL: $([ "$DB_HEALTHY" = true ] && echo "✅ 正常" || echo "❌ 異常")"
echo "  - Redis: $([ "$REDIS_HEALTHY" = true ] && echo "✅ 正常" || echo "❌ 異常")"

# 全体の成功判定
if [ "$API_HEALTHY" = true ] && [ "$DB_HEALTHY" = true ] && [ "$REDIS_HEALTHY" = true ]; then
    echo ""
    echo "🎉 デプロイメント成功！"
    echo "   アプリケーション URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/"
    exit 0
else
    echo ""
    echo "❌ デプロイメントに問題が発生しました"
    echo "   ログを確認して問題を解決してください"
    echo "   ロールバック方法: docker-compose ${COMPOSE_FILES} down && 前回のバックアップからリストア"
    exit 1
fi