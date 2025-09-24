#!/bin/bash

# EC2インスタンス初期セットアップスクリプト
# Amazon Linux 2023 対応

set -e

echo "=== EC2インスタンス初期セットアップ開始 ==="

# システムアップデート
echo "システムをアップデートしています..."
sudo yum update -y

# 必要なパッケージのインストール
echo "必要なパッケージをインストールしています..."
sudo yum install -y \
    docker \
    git \
    curl \
    wget \
    unzip \
    htop \
    nano \
    rsync

# Dockerサービスの開始と自動起動設定
echo "Dockerサービスを設定しています..."
sudo systemctl start docker
sudo systemctl enable docker

# ec2-userをdockerグループに追加
sudo usermod -a -G docker ec2-user

# Docker Composeのインストール
echo "Docker Composeをインストールしています..."
DOCKER_COMPOSE_VERSION="v2.23.3"
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Docker Composeのシンボリックリンクを作成
sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

# Node.js環境のセットアップ（デバッグ用）
echo "Node.js環境をセットアップしています..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install 18
nvm use 18
nvm alias default 18

# アプリケーション用ディレクトリ作成
echo "アプリケーション用ディレクトリを作成しています..."
mkdir -p /home/ec2-user/glasses-store
mkdir -p /home/ec2-user/glasses-store/logs/nginx
mkdir -p /home/ec2-user/glasses-store/logs/app
mkdir -p /home/ec2-user/glasses-store/uploads
mkdir -p /home/ec2-user/glasses-store/backups/postgres
mkdir -p /home/ec2-user/glasses-store/backups/redis
mkdir -p /home/ec2-user/glasses-store/certs

# ディレクトリの権限設定
sudo chown -R ec2-user:ec2-user /home/ec2-user/glasses-store
chmod 755 /home/ec2-user/glasses-store

# Nginxログローテーション設定
echo "ログローテーション設定をしています..."
sudo tee /etc/logrotate.d/glasses-store > /dev/null <<EOF
/home/ec2-user/glasses-store/logs/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
    postrotate
        docker kill --signal=USR1 glasses_nginx 2>/dev/null || true
    endscript
}

/home/ec2-user/glasses-store/logs/app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 ec2-user ec2-user
}
EOF

# SSL証明書生成（自己署名証明書）
echo "SSL証明書を生成しています..."
cd /home/ec2-user/glasses-store/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout server.key \
    -out server.crt \
    -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Glasses Store/CN=localhost"

# cron設定（バックアップとログクリーンアップ）
echo "cron設定をしています..."
(crontab -l 2>/dev/null || echo "") | grep -v "glasses-store" | crontab -
(crontab -l 2>/dev/null; cat << 'CRON'
# 毎日2時にPostgreSQLバックアップ
0 2 * * * cd /home/ec2-user/glasses-store && docker-compose exec -T postgres pg_dump -U glasses_user glasses_store_db > backups/postgres/backup-$(date +\%Y\%m\%d).sql

# 毎日3時にRedisバックアップ
0 3 * * * cd /home/ec2-user/glasses-store && docker-compose exec -T redis redis-cli BGSAVE && sleep 10 && docker cp glasses_redis:/data/dump.rdb backups/redis/dump-$(date +\%Y\%m\%d).rdb

# 古いバックアップファイルの削除（30日以上古い）
0 4 * * * find /home/ec2-user/glasses-store/backups -name "*.sql" -o -name "*.rdb" -mtime +30 -delete

# 毎週日曜日にDockerクリーンアップ
0 5 * * 0 docker system prune -f

CRON
) | crontab -

# Gitの設定
echo "Git設定をしています..."
git config --global user.name "EC2 Deployment"
git config --global user.email "deploy@glasses-store.com"

# SSH設定（GitHub用）
echo "SSH設定をしています..."
mkdir -p /home/ec2-user/.ssh
chmod 700 /home/ec2-user/.ssh
touch /home/ec2-user/.ssh/known_hosts
ssh-keyscan github.com >> /home/ec2-user/.ssh/known_hosts

# セキュリティ設定
echo "セキュリティ設定を行っています..."
# SSHポート変更の推奨設定（実際の変更は手動で行う）
cat > /tmp/ssh_security_info.txt << EOF
=== セキュリティ推奨設定 ===

1. SSHポート変更の推奨:
   sudo nano /etc/ssh/sshd_config
   Port 22 → Port 2222 (お好みの番号)
   sudo systemctl restart sshd

2. ファイアウォール設定:
   sudo firewall-cmd --permanent --add-port=2222/tcp  # SSH
   sudo firewall-cmd --permanent --add-port=80/tcp    # HTTP
   sudo firewall-cmd --permanent --add-port=443/tcp   # HTTPS
   sudo firewall-cmd --reload

3. fail2ban設定（ブルートフォース攻撃対策）:
   sudo yum install -y epel-release
   sudo yum install -y fail2ban
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban

EOF

# 監視スクリプトの作成
echo "監視スクリプトを作成しています..."
cat > /home/ec2-user/glasses-store/scripts/health-check.sh << 'EOF'
#!/bin/bash

# ヘルスチェックスクリプト
cd /home/ec2-user/glasses-store

echo "=== システム状態確認 $(date) ==="

# Docker Compose状態確認
echo "--- Docker Compose Status ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml ps

# コンテナのヘルスチェック
echo "--- Container Health Status ---"
for container in glasses_postgres glasses_redis glasses_backend glasses_frontend glasses_nginx glasses_pgadmin; do
    health=$(docker inspect --format='{{.State.Health.Status}}' $container 2>/dev/null || echo "unknown")
    echo "$container: $health"
done

# ディスク使用量確認
echo "--- Disk Usage ---"
df -h /

# メモリ使用量確認
echo "--- Memory Usage ---"
free -h

# ログファイルサイズ確認
echo "--- Log File Sizes ---"
find logs -name "*.log" -exec ls -lh {} \; 2>/dev/null || echo "No log files found"

# APIヘルスチェック
echo "--- API Health Check ---"
curl -s http://localhost/api/health | jq '.' 2>/dev/null || curl -s http://localhost/api/health || echo "API health check failed"

echo "=== 確認完了 ==="
EOF

chmod +x /home/ec2-user/glasses-store/scripts/health-check.sh

# 環境設定ファイルのサンプル作成
echo "環境設定ファイルサンプルを作成しています..."
cat > /home/ec2-user/glasses-store/.env.production.example << 'EOF'
# 本番環境用設定サンプル
# このファイルをコピーして .env.production を作成し、適切な値を設定してください

# Docker Compose設定
COMPOSE_PROJECT_NAME=glasses_store_prod
COMPOSE_FILE=docker-compose.yml:docker-compose.production.yml

# Node.js環境
NODE_ENV=production

# ポート設定
FRONTEND_PORT=3000
BACKEND_PORT=3001
NGINX_PORT=80
NGINX_SSL_PORT=443

# PostgreSQL設定（本番環境では必ず変更）
POSTGRES_DB=glasses_store_db
POSTGRES_USER=glasses_user
POSTGRES_PASSWORD=your_secure_postgres_password_here

# Redis設定（本番環境では必ず変更）
REDIS_PASSWORD=your_secure_redis_password_here

# JWT設定（本番環境では必ず変更）
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# CORS設定（あなたのドメインに変更）
CORS_ORIGIN=https://your-domain.com
CORS_ORIGIN_WS=wss://your-domain.com

# pgAdmin設定
PGADMIN_EMAIL=admin@your-domain.com
PGADMIN_PASSWORD=your_pgladmin_password_here

# ログレベル
LOG_LEVEL=info
EOF

# 完了メッセージ
echo ""
echo "=== EC2セットアップ完了 ==="
echo ""
echo "次のステップ:"
echo "1. 新しいターミナルでログインし直してください（dockerグループ適用のため）"
echo "2. セキュリティ設定を確認してください: cat /tmp/ssh_security_info.txt"
echo "3. .env.production ファイルを作成し、適切な値を設定してください"
echo "4. GitHub Actions Secretsを設定してください:"
echo "   - AWS_ACCESS_KEY_ID"
echo "   - AWS_SECRET_ACCESS_KEY"
echo "   - AWS_REGION"
echo "   - EC2_PRIVATE_KEY"
echo "   - EC2_HOST"
echo "   - POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
echo "   - REDIS_PASSWORD"
echo "   - JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET"
echo "   - CORS_ORIGIN, CORS_ORIGIN_WS"
echo "   - PGADMIN_EMAIL, PGADMIN_PASSWORD"
echo ""
echo "システム監視: /home/ec2-user/glasses-store/scripts/health-check.sh"
echo "設定サンプル: /home/ec2-user/glasses-store/.env.production.example"
echo ""

# バージョン確認
echo "インストールされたバージョン:"
echo "Docker: $(docker --version)"
echo "Docker Compose: $(docker-compose --version)"
echo "Node.js: $(node --version 2>/dev/null || echo 'Node.js setup requires re-login')"
echo "Git: $(git --version)"

echo ""
echo "セットアップスクリプトの実行が完了しました。"