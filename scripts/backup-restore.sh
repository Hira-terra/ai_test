#!/bin/bash

# バックアップ・リストアスクリプト
# 本番環境のデータベースバックアップと復元を管理

set -e

APP_DIR="/home/ec2-user/glasses-store"
BACKUP_DIR="${APP_DIR}/backups"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.production.yml"

# 使用方法表示
usage() {
    echo "使用方法: $0 {backup|restore|list|cleanup}"
    echo ""
    echo "コマンド:"
    echo "  backup   - データベース（PostgreSQL + Redis）のバックアップを作成"
    echo "  restore  - バックアップからデータベースを復元"
    echo "  list     - 利用可能なバックアップファイルを一覧表示"
    echo "  cleanup  - 30日以上古いバックアップファイルを削除"
    echo ""
    echo "例："
    echo "  $0 backup                    # バックアップ作成"
    echo "  $0 restore 20241201_120000   # 指定日時のバックアップから復元"
    echo "  $0 list                      # バックアップファイル一覧"
    echo "  $0 cleanup                   # 古いファイル削除"
    exit 1
}

# バックアップディレクトリ作成
setup_backup_dirs() {
    mkdir -p "${BACKUP_DIR}/postgres"
    mkdir -p "${BACKUP_DIR}/redis"
}

# バックアップ作成
create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    echo "=== データベースバックアップ作成開始 $(date) ==="
    echo "バックアップID: ${timestamp}"
    
    setup_backup_dirs
    cd "${APP_DIR}"
    
    # PostgreSQLバックアップ
    echo "📊 PostgreSQLバックアップを作成中..."
    if docker-compose ${COMPOSE_FILES} ps postgres | grep -q "Up"; then
        docker-compose ${COMPOSE_FILES} exec -T postgres pg_dump \
            -U ${POSTGRES_USER:-glasses_user} \
            -d ${POSTGRES_DB:-glasses_store_db} \
            --clean --if-exists --create > "${BACKUP_DIR}/postgres/backup-${timestamp}.sql"
        
        # バックアップファイルの検証
        if [ -s "${BACKUP_DIR}/postgres/backup-${timestamp}.sql" ]; then
            echo "✅ PostgreSQL バックアップ完了 ($(du -h "${BACKUP_DIR}/postgres/backup-${timestamp}.sql" | cut -f1))"
        else
            echo "❌ PostgreSQL バックアップファイルが空です"
            exit 1
        fi
    else
        echo "⚠️  PostgreSQL コンテナが起動していません"
        exit 1
    fi
    
    # Redisバックアップ
    echo "📊 Redisバックアップを作成中..."
    if docker-compose ${COMPOSE_FILES} ps redis | grep -q "Up"; then
        # RDB保存を実行
        docker-compose ${COMPOSE_FILES} exec -T redis redis-cli BGSAVE
        
        # BGSAVE完了まで待機
        echo "⏳ Redis BGSAVE完了を待機中..."
        while [ "$(docker-compose ${COMPOSE_FILES} exec -T redis redis-cli LASTSAVE)" = "$(docker-compose ${COMPOSE_FILES} exec -T redis redis-cli LASTSAVE)" ]; do
            sleep 2
        done
        
        # RDBファイルをコピー
        docker cp glasses_redis:/data/dump.rdb "${BACKUP_DIR}/redis/dump-${timestamp}.rdb"
        
        if [ -s "${BACKUP_DIR}/redis/dump-${timestamp}.rdb" ]; then
            echo "✅ Redis バックアップ完了 ($(du -h "${BACKUP_DIR}/redis/dump-${timestamp}.rdb" | cut -f1))"
        else
            echo "⚠️  Redis バックアップファイルが空です"
        fi
    else
        echo "⚠️  Redis コンテナが起動していません"
    fi
    
    # バックアップメタデータ作成
    cat > "${BACKUP_DIR}/backup-${timestamp}.info" << EOF
# バックアップ情報
BACKUP_ID=${timestamp}
BACKUP_DATE=$(date)
POSTGRES_BACKUP=${BACKUP_DIR}/postgres/backup-${timestamp}.sql
REDIS_BACKUP=${BACKUP_DIR}/redis/dump-${timestamp}.rdb
POSTGRES_SIZE=$(du -h "${BACKUP_DIR}/postgres/backup-${timestamp}.sql" 2>/dev/null | cut -f1 || echo "N/A")
REDIS_SIZE=$(du -h "${BACKUP_DIR}/redis/dump-${timestamp}.rdb" 2>/dev/null | cut -f1 || echo "N/A")
EOF
    
    echo "✅ バックアップ作成完了: ${timestamp}"
}

# バックアップからの復元
restore_backup() {
    local backup_id="$1"
    
    if [ -z "${backup_id}" ]; then
        echo "❌ エラー: バックアップIDを指定してください"
        echo "利用可能なバックアップ:"
        list_backups
        exit 1
    fi
    
    local postgres_file="${BACKUP_DIR}/postgres/backup-${backup_id}.sql"
    local redis_file="${BACKUP_DIR}/redis/dump-${backup_id}.rdb"
    
    # バックアップファイル存在確認
    if [ ! -f "${postgres_file}" ]; then
        echo "❌ エラー: PostgreSQL バックアップファイルが見つかりません: ${postgres_file}"
        exit 1
    fi
    
    echo "=== データベース復元開始 $(date) ==="
    echo "復元対象: ${backup_id}"
    
    cd "${APP_DIR}"
    
    # 確認プロンプト
    echo "⚠️  警告: 現在のデータベースが上書きされます。"
    echo "復元前に現在のデータをバックアップすることを強く推奨します。"
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "復元をキャンセルしました。"
        exit 0
    fi
    
    # 現在のバックアップを作成
    echo "📊 復元前バックアップを作成中..."
    create_backup
    
    # PostgreSQL復元
    echo "📥 PostgreSQL データを復元中..."
    if docker-compose ${COMPOSE_FILES} ps postgres | grep -q "Up"; then
        cat "${postgres_file}" | docker-compose ${COMPOSE_FILES} exec -T postgres psql \
            -U ${POSTGRES_USER:-glasses_user} \
            -d ${POSTGRES_DB:-glasses_store_db}
        echo "✅ PostgreSQL 復元完了"
    else
        echo "❌ PostgreSQL コンテナが起動していません"
        exit 1
    fi
    
    # Redis復元（ファイルが存在する場合）
    if [ -f "${redis_file}" ]; then
        echo "📥 Redis データを復元中..."
        if docker-compose ${COMPOSE_FILES} ps redis | grep -q "Up"; then
            # Redisを停止してファイル復元
            docker-compose ${COMPOSE_FILES} stop redis
            docker cp "${redis_file}" glasses_redis:/data/dump.rdb
            docker-compose ${COMPOSE_FILES} start redis
            
            # Redis起動待機
            echo "⏳ Redis 起動待機中..."
            sleep 10
            
            if docker-compose ${COMPOSE_FILES} exec -T redis redis-cli ping | grep -q "PONG"; then
                echo "✅ Redis 復元完了"
            else
                echo "⚠️  Redis 復元後の接続確認に失敗しました"
            fi
        else
            echo "⚠️  Redis コンテナが起動していません"
        fi
    else
        echo "⚠️  Redis バックアップファイルが見つかりません: ${redis_file}"
    fi
    
    echo "✅ データベース復元完了: ${backup_id}"
}

# バックアップファイル一覧表示
list_backups() {
    echo "=== 利用可能なバックアップファイル ==="
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        echo "バックアップディレクトリが存在しません: ${BACKUP_DIR}"
        return 1
    fi
    
    # PostgreSQLバックアップファイル一覧
    echo "PostgreSQL バックアップ:"
    if ls "${BACKUP_DIR}/postgres/"backup-*.sql 1> /dev/null 2>&1; then
        for file in "${BACKUP_DIR}/postgres/"backup-*.sql; do
            local filename=$(basename "$file")
            local backup_id=$(echo "$filename" | sed 's/backup-\(.*\)\.sql/\1/')
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -c %y "$file" | cut -d. -f1)
            echo "  ${backup_id} (${size}) - ${date}"
        done
    else
        echo "  PostgreSQL バックアップファイルが見つかりません"
    fi
    
    echo ""
    echo "Redis バックアップ:"
    if ls "${BACKUP_DIR}/redis/"dump-*.rdb 1> /dev/null 2>&1; then
        for file in "${BACKUP_DIR}/redis/"dump-*.rdb; do
            local filename=$(basename "$file")
            local backup_id=$(echo "$filename" | sed 's/dump-\(.*\)\.rdb/\1/')
            local size=$(du -h "$file" | cut -f1)
            local date=$(stat -c %y "$file" | cut -d. -f1)
            echo "  ${backup_id} (${size}) - ${date}"
        done
    else
        echo "  Redis バックアップファイルが見つかりません"
    fi
}

# 古いバックアップファイルの削除
cleanup_backups() {
    local days=${1:-30}
    
    echo "=== バックアップファイルクリーンアップ開始 ==="
    echo "削除対象: ${days}日以上古いファイル"
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        echo "バックアップディレクトリが存在しません: ${BACKUP_DIR}"
        return 1
    fi
    
    # 削除対象ファイルを表示
    echo "削除対象ファイル:"
    find "${BACKUP_DIR}" -name "backup-*.sql" -o -name "dump-*.rdb" -o -name "backup-*.info" | while read file; do
        if [ $(find "$file" -mtime +${days} 2>/dev/null | wc -l) -gt 0 ]; then
            echo "  $(basename "$file") ($(du -h "$file" | cut -f1))"
        fi
    done
    
    # 確認プロンプト
    read -p "これらのファイルを削除しますか？ (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local deleted_count=$(find "${BACKUP_DIR}" -name "backup-*.sql" -o -name "dump-*.rdb" -o -name "backup-*.info" -mtime +${days} -delete -print | wc -l)
        echo "✅ ${deleted_count} 個のファイルを削除しました"
    else
        echo "クリーンアップをキャンセルしました"
    fi
}

# メイン処理
case "${1:-}" in
    backup)
        create_backup
        ;;
    restore)
        restore_backup "$2"
        ;;
    list)
        list_backups
        ;;
    cleanup)
        cleanup_backups "$2"
        ;;
    *)
        usage
        ;;
esac