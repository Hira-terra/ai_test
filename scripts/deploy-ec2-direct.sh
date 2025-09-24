#!/bin/bash

# EC2直接デプロイスクリプト
# EC2インスタンスにSSH接続してgit pullでデプロイ

set -e

echo "=== EC2直接デプロイ開始 ==="

# 設定値
EC2_HOST="172.19.101.51"
EC2_USER="ec2-user"
PEM_FILE="bl-glasses-01.pem"
GITHUB_REPO="https://github.com/Hira-terra/ai_test.git"
APP_DIR="/home/ec2-user/glasses-store"

# PEMファイルの存在確認
if [ ! -f "$PEM_FILE" ]; then
    echo "❌ PEMファイルが見つかりません: $PEM_FILE"
    echo "   社内共有システムからPEMファイルを取得して、このディレクトリに配置してください"
    exit 1
fi

# PEMファイルの権限設定
chmod 600 "$PEM_FILE"

echo "📥 EC2インスタンスでGitリポジトリを更新中..."

# EC2インスタンスでコマンド実行
ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" << 'ENDSSH'
echo "=== EC2インスタンス内での処理開始 ==="

# アプリケーションディレクトリの確認
APP_DIR="/home/ec2-user/glasses-store"

# Gitがインストールされているか確認
if ! command -v git &> /dev/null; then
    echo "📦 Gitをインストール中..."
    sudo yum install -y git
fi

# 既存のglasses-storeディレクトリを削除（クリーンな状態でスタート）
if [ -d "$APP_DIR" ]; then
    echo "🧹 既存ディレクトリをクリーンアップ中..."
    rm -rf "$APP_DIR"
fi

# GitHubリポジトリをクローン
echo "📦 GitHubリポジトリをクローン中..."
cd /home/ec2-user
git clone https://github.com/Hira-terra/ai_test.git glasses-store

# クローン成功確認
if [ ! -d "$APP_DIR" ]; then
    echo "❌ Gitクローンに失敗しました"
    echo "手動でクローンを試行..."
    mkdir -p glasses-store
    cd glasses-store
    git init
    git remote add origin https://github.com/Hira-terra/ai_test.git
    git fetch origin
    git checkout -b main origin/main
fi

# アプリケーションディレクトリに移動
cd "$APP_DIR"
echo "✅ 現在のディレクトリ: $(pwd)"

echo "✅ コード更新完了"

# Dockerがインストールされているか確認
if ! command -v docker &> /dev/null; then
    echo "🐳 Dockerをインストール中..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    echo "✅ Dockerインストール完了（再接続が必要な場合があります）"
fi

# Docker Composeがインストールされているか確認
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Docker Composeをインストール中..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    echo "✅ Docker Composeインストール完了"
fi

# 必要なディレクトリ作成
echo "📁 必要なディレクトリを作成中..."
mkdir -p uploads logs/app logs/nginx backups/postgres backups/redis certs

# 環境設定ファイル作成（存在しない場合）
if [ ! -f ".env.production" ]; then
    echo "⚙️ 環境設定ファイルを作成中..."
    cat > .env.production << 'EOF'
# 本番環境設定
NODE_ENV=production
COMPOSE_PROJECT_NAME=glasses_store_prod

# ポート設定
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

# JWT設定
JWT_SECRET=your_jwt_secret_here_64chars_minimum_please_change_this
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here_64chars_minimum_change
SESSION_SECRET=your_session_secret_here_64chars_minimum_please_ch

# CORS設定
CORS_ORIGIN=http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
CORS_ORIGIN_WS=ws://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com

# pgAdmin設定
PGADMIN_EMAIL=admin@glasses-store.com
PGADMIN_PASSWORD=PgAdminSecure2024!

# ログレベル
LOG_LEVEL=info
EOF
    echo "✅ 環境設定ファイル作成完了"
fi

# ファイル存在確認
echo "📋 Docker Compose設定ファイル確認中..."
ls -la docker-compose*.yml || echo "⚠️ Docker Composeファイルが見つかりません"

# 現在のディレクトリ内容確認
echo "📁 現在のディレクトリ内容:"
ls -la

# 既存のコンテナを停止（存在する場合）
echo "🛑 既存のコンテナを停止中..."
sudo docker-compose down 2>/dev/null || true

# スクリプトファイルに実行権限付与
chmod +x scripts/*.sh 2>/dev/null || true

# 新しいコンテナを起動
echo "🚀 Dockerコンテナを起動中..."
if [ -f "docker-compose.yml" ]; then
    if [ -f "docker-compose.production.yml" ]; then
        echo "本番用構成でコンテナ起動..."
        sudo docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d --build
    else
        echo "標準構成でコンテナ起動..."
        sudo docker-compose -f docker-compose.yml --env-file .env.production up -d --build
    fi
else
    echo "❌ docker-compose.yml ファイルが見つかりません"
    echo "現在のディレクトリ: $(pwd)"
    echo "ファイル一覧:"
    ls -la
    exit 1
fi

# ヘルスチェック待機
echo "⏳ サービス起動待機中..."
sleep 30

# コンテナ状態確認
echo "📊 コンテナ状態確認..."
sudo docker-compose ps

# PostgreSQL接続確認
echo "🔍 PostgreSQL接続確認..."
for i in {1..10}; do
    if sudo docker-compose exec -T postgres pg_isready -U glasses_user 2>/dev/null; then
        echo "✅ PostgreSQL接続成功"
        break
    else
        echo "   PostgreSQL接続待機中... ($i/10)"
        sleep 5
    fi
done

# Redis接続確認
echo "🔍 Redis接続確認..."
if sudo docker-compose exec -T redis redis-cli --pass RedisSecure2024! ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis接続成功"
else
    echo "⚠️ Redis接続確認失敗（パスワードなしで再試行）"
    if sudo docker-compose exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ Redis接続成功（パスワードなし）"
    fi
fi

echo "=== EC2デプロイ完了 ==="
ENDSSH

# デプロイ結果表示
echo ""
echo "=== デプロイ完了レポート ==="
echo "📅 デプロイ日時: $(date)"
echo "🌐 アクセスURL:"
echo "   ALB経由: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com"
echo "   EC2直接: http://$EC2_HOST:3000 (フロントエンド)"
echo "   EC2 API: http://$EC2_HOST:3001 (バックエンド)"
echo ""
echo "👤 ログイン情報:"
echo "   ユーザーコード: manager001"
echo "   パスワード: password"
echo "   店舗コード: STORE001"
echo ""
echo "🔧 EC2への直接接続:"
echo "   ssh -i $PEM_FILE $EC2_USER@$EC2_HOST"
echo ""
echo "📋 コンテナログ確認:"
echo "   ssh -i $PEM_FILE $EC2_USER@$EC2_HOST 'cd /home/ec2-user/glasses-store && sudo docker-compose logs -f'"
echo ""
echo "🎉 デプロイ成功！"
echo "   ブラウザでアクセスして動作確認してください。"