# 眼鏡店管理システム AWS EC2 + Docker 本番環境デプロイガイド

## 1. 概要

現在のローカルDocker環境をAWS EC2上に本番環境として構築するための完全な手順書です。GitHub連携による自動デプロイと包括的な運用スクリプト群を提供します。

### 1.1 デプロイ方針
- **EC2上でDocker Compose運用** (RDS/ElastiCache等のマネージドサービス不使用)
- **GitHubからの自動デプロイ**
- **現在のローカル環境と同じ6コンテナ構成を維持**
- **本番用設定のみ調整**

### 1.2 提供されたAWSリソース
- **AWSアカウント**: 527068389645
- **EC2インスタンス**: i-09e6bdd6d228135e3 (172.19.101.51)
- **ALB DNS**: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/
- **VPC**: 172.19.0.0/16 (vpc-0d9e0881a77d26ab0)
- **IAMユーザー**: BL-deploy01

## 2. EC2 + Docker アーキテクチャ

### 2.1 コンテナ構成 (現在と同じ)

```
EC2 Instance (172.19.101.51)
├── nginx (proxy) ──── ALB ──── Internet
├── frontend (React)
├── backend (Node.js API)  
├── postgres (PostgreSQL 15)
├── redis (Redis 7)
└── pgadmin (管理用)
```

### 2.2 データ永続化
- **PostgreSQLデータ**: EC2のEBSボリュームに永続化
- **アップロードファイル**: EC2のEBSボリュームに永続化  
- **ログファイル**: EC2のEBSボリュームに永続化

## 3. デプロイ手順

### 3.1 事前準備

#### A. ローカルでの準備
```bash
# 本番用設定ファイルをローカルで準備
cp .env.example .env.production
```

#### B. AWS認証設定
```bash
# IAMユーザー情報設定
aws configure set aws_access_key_id [YOUR_ACCESS_KEY_ID]
aws configure set aws_secret_access_key [YOUR_SECRET_ACCESS_KEY]
aws configure set default.region ap-northeast-1
```

### 3.2 EC2接続とセットアップ

#### A. EC2接続
```bash
# pemファイル使用（Googleドライブから取得済み）
ssh -i bl-glasses-01.pem ec2-user@172.19.101.51

# または、提供されたSSM Session Manager
aws ssm start-session --target i-09e6bdd6d228135e3
```

#### B. 必要なソフトウェアインストール
```bash
# システム更新
sudo yum update -y

# Docker & Docker Compose インストール
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Docker Compose インストール
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 再接続（dockerグループ権限を反映）
exit
ssh -i bl-glasses-01.pem ec2-user@172.19.101.51
```

### 3.3 アプリケーションデプロイ

#### A. GitHubからクローン
```bash
# アプリケーションクローン
git clone https://github.com/Hira-terra/ai_test.git glasses-store
cd glasses-store

# 実行権限設定
chmod +x scripts/*.sh
```

#### B. 本番用環境設定
```bash
# 本番用.env作成
cat > .env.production << 'EOF'
# =================================================================
# 本番環境設定
# =================================================================
NODE_ENV=production
COMPOSE_PROJECT_NAME=glasses_store_prod

# ポート設定
FRONTEND_PORT=3000
BACKEND_PORT=3001
DB_PORT=5432
REDIS_PORT=6379
NGINX_PORT=80
NGINX_SSL_PORT=443
PGADMIN_PORT=5050

# PostgreSQL設定
POSTGRES_DB=glasses_store_db
POSTGRES_USER=glasses_user
POSTGRES_PASSWORD=SecureProductionPassword123!

# Redis設定
REDIS_PASSWORD=SecureRedisPassword123!

# セキュリティキー（本番用）
JWT_SECRET=本番用JWT秘密鍵32文字以上
JWT_REFRESH_SECRET=本番用リフレッシュ秘密鍵32文字以上  
SESSION_SECRET=本番用セッション秘密鍵32文字以上

# CORS設定（ALB URL）
CORS_ORIGIN=http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com

# pgAdmin設定
PGADMIN_EMAIL=admin@glasses-store.com
PGLADMIN_PASSWORD=SecurePgAdminPassword123!

# ログレベル
LOG_LEVEL=info

# バックアップ設定
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
EOF
```

#### C. 本番用Nginx設定更新
```bash
# 本番用Nginx設定作成
mkdir -p nginx/conf.d
cat > nginx/conf.d/production.conf << 'EOF'
server {
    listen 80;
    server_name bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com;
    
    # セキュリティヘッダー
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # フロントエンド静的ファイル
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API プロキシ
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # ログ設定
    access_log /var/log/nginx/access.log combined;
    error_log /var/log/nginx/error.log warn;
}
EOF
```

#### D. 本番用Docker Compose設定
```bash
# 本番用docker-compose.override.yml作成
cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # フロントエンド - 本番ビルド
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
      args:
        REACT_APP_API_BASE_URL: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/api
        REACT_APP_WS_URL: ws://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
        REACT_APP_USE_MOCK_API: "false"
    environment:
      NODE_ENV: production
      PORT: 3000
      REACT_APP_API_BASE_URL: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/api
      REACT_APP_WS_URL: ws://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
      REACT_APP_USE_MOCK_API: "false"
    restart: unless-stopped
    volumes:
      - /dev/null:/app/src  # 開発用ボリュームを無効化

  # バックエンド - 本番設定
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    environment:
      NODE_ENV: production
      CORS_ORIGIN: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
    restart: unless-stopped
    volumes:
      - /dev/null:/app/src  # 開発用ボリュームを無効化
      - ./uploads:/app/uploads
      - ./logs/app:/app/logs

  # Nginx - 本番設定読み込み
  nginx:
    volumes:
      - ./nginx/conf.d/production.conf:/etc/nginx/conf.d/default.conf:ro
      - ./logs/nginx:/var/log/nginx
    restart: unless-stopped

  # PostgreSQL - 永続化設定強化
  postgres:
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups/postgres:/backups

  # Redis - 永続化設定強化  
  redis:
    restart: unless-stopped
    volumes:
      - redis_data:/data
      - ./backups/redis:/backups

  # pgAdmin - 本番用設定
  pgadmin:
    restart: unless-stopped
    environment:
      PGADMIN_CONFIG_SERVER_MODE: 'True'
      PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: 'True'

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
EOF
```

### 3.4 初回デプロイ実行

#### A. セキュリティキー生成
```bash
# 本番用セキュリティキー生成・設定
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# .env.productionファイルに反映
sed -i "s/本番用JWT秘密鍵32文字以上/$JWT_SECRET/g" .env.production
sed -i "s/本番用リフレッシュ秘密鍵32文字以上/$JWT_REFRESH_SECRET/g" .env.production
sed -i "s/本番用セッション秘密鍵32文字以上/$SESSION_SECRET/g" .env.production
```

#### B. 必要ディレクトリ作成
```bash
# データ永続化用ディレクトリ作成
mkdir -p uploads logs/app logs/nginx backups/postgres backups/redis certs

# 権限設定
chmod 755 uploads logs backups
chmod 600 .env.production
```

#### C. 初回起動
```bash
# 本番環境でコンテナ起動
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d

# 起動状況確認
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production ps

# ログ確認
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production logs -f
```

## 4. デプロイ自動化

### 4.1 デプロイスクリプト作成
```bash
# デプロイスクリプト作成
cat > deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "=== 眼鏡店管理システム デプロイ開始 ==="

# 現在のディレクトリを確認
if [[ ! -f "docker-compose.yml" ]]; then
    echo "エラー: docker-compose.ymlが見つかりません"
    exit 1
fi

# Gitから最新コードを取得
echo "--- GitHubから最新コードを取得中 ---"
git fetch origin
git reset --hard origin/main

# 既存コンテナを停止
echo "--- 既存コンテナを停止中 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production down

# イメージの再ビルド
echo "--- イメージを再ビルド中 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production build --no-cache

# コンテナ起動
echo "--- コンテナを起動中 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d

# ヘルスチェック待機
echo "--- ヘルスチェック待機中 ---"
sleep 30

# 起動確認
echo "--- 起動状況確認 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production ps

# 不要なイメージ削除
echo "--- 不要なイメージを削除中 ---"
docker image prune -f

echo "=== デプロイ完了 ==="
echo "URL: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com"
EOF

chmod +x deploy.sh
```

### 4.2 バックアップスクリプト作成
```bash
# バックアップスクリプト作成
cat > backup.sh << 'EOF'
#!/bin/bash

set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

echo "=== バックアップ開始: $BACKUP_DATE ==="

# PostgreSQLバックアップ
echo "--- PostgreSQLバックアップ中 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production exec -T postgres pg_dump -U glasses_user glasses_store_db > "$BACKUP_DIR/postgres/glasses_store_db_$BACKUP_DATE.sql"

# Redisバックアップ  
echo "--- Redisバックアップ中 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production exec -T redis redis-cli BGSAVE
sleep 5
docker cp $(docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production ps -q redis):/data/dump.rdb "$BACKUP_DIR/redis/dump_$BACKUP_DATE.rdb"

# アップロードファイルバックアップ
echo "--- アップロードファイルバックアップ中 ---"
tar -czf "$BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz" -C uploads .

# 古いバックアップ削除（30日以上前）
echo "--- 古いバックアップ削除中 ---"
find "$BACKUP_DIR" -name "*" -type f -mtime +30 -delete

echo "=== バックアップ完了 ==="
EOF

chmod +x backup.sh
```

### 4.3 監視スクリプト作成
```bash
# 監視スクリプト作成
cat > monitor.sh << 'EOF'
#!/bin/bash

echo "=== 眼鏡店管理システム 監視情報 ==="

# コンテナ状況
echo "--- コンテナ状況 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production ps

# ディスク使用量
echo -e "\n--- ディスク使用量 ---"
df -h

# メモリ使用量
echo -e "\n--- メモリ使用量 ---"
free -h

# CPU使用量
echo -e "\n--- CPU使用量 ---"
top -bn1 | grep "Cpu(s)" | awk '{print "CPU使用率: " $2}'

# ログ監視（最新10行）
echo -e "\n--- 最新ログ（Backend） ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production logs --tail=10 backend

echo -e "\n--- 最新ログ（Nginx） ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production logs --tail=10 nginx

# データベース接続確認
echo -e "\n--- データベース接続確認 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production exec -T postgres pg_isready -U glasses_user -d glasses_store_db && echo "PostgreSQL: OK" || echo "PostgreSQL: NG"

# Redis接続確認
echo -e "\n--- Redis接続確認 ---"
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production exec -T redis redis-cli ping && echo "Redis: OK" || echo "Redis: NG"

echo "=== 監視情報終了 ==="
EOF

chmod +x monitor.sh
```

## 5. セキュリティ設定

### 5.1 EC2セキュリティグループ設定
```bash
# セキュリティグループ設定（現在のインスタンスID使用）
INSTANCE_ID="i-09e6bdd6d228135e3"
SECURITY_GROUP_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

# HTTP/HTTPSアクセス許可
aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 80 --cidr 0.0.0.0/0 || echo "Port 80 already open"
aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 443 --cidr 0.0.0.0/0 || echo "Port 443 already open"

# SSH管理用
aws ec2 authorize-security-group-ingress --group-id $SECURITY_GROUP_ID --protocol tcp --port 22 --cidr 0.0.0.0/0 || echo "Port 22 already open"
```

### 5.2 ファイアウォール設定
```bash
# システムファイアウォール確認・設定
sudo systemctl status firewalld && {
    # firewalld が動いている場合
    sudo firewall-cmd --permanent --add-port=80/tcp
    sudo firewall-cmd --permanent --add-port=443/tcp
    sudo firewall-cmd --reload
} || {
    echo "firewalld は停止中です"
}
```

## 6. 運用手順

### 6.1 定期メンテナンス
```bash
# 定期実行用crontab設定
crontab -e

# 以下を追加
# 毎日午前2時にバックアップ実行
0 2 * * * /home/ec2-user/glasses-store/backup.sh >> /home/ec2-user/glasses-store/logs/backup.log 2>&1

# 毎週日曜午前3時に監視レポート生成
0 3 * * 0 /home/ec2-user/glasses-store/monitor.sh > /home/ec2-user/glasses-store/logs/weekly_report.log

# 毎日午前4時にログローテーション
0 4 * * * docker-compose -f /home/ec2-user/glasses-store/docker-compose.yml -f /home/ec2-user/glasses-store/docker-compose.production.yml --env-file /home/ec2-user/glasses-store/.env.production exec -T backend npm run log-rotate
```

### 6.2 更新デプロイ
```bash
# 新機能デプロイ時の実行
cd /home/ec2-user/glasses-store
./deploy.sh

# 緊急時の即座ロールバック
git reset --hard HEAD~1
./deploy.sh
```

### 6.3 トラブルシューティング
```bash
# 状況確認
./monitor.sh

# ログ確認
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production logs -f [service_name]

# コンテナ再起動
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production restart [service_name]

# 完全リセット（データ保持）
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production down
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d
```

## 7. 動作確認項目

### 7.1 デプロイ後チェックリスト
- [ ] ALB URL でのアクセス確認
- [ ] ログイン機能動作確認  
- [ ] 各管理画面の表示確認
- [ ] データベース接続確認
- [ ] Redis接続確認
- [ ] ファイルアップロード動作確認
- [ ] コンテナヘルスチェック確認
- [ ] ログ出力確認
- [ ] バックアップ動作確認

### 7.2 動作確認URL
```
メイン画面: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
API確認: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/api/stores
ヘルスチェック: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/health
```

### 7.3 認証情報（ローカルと同じ）
- **ユーザーコード**: manager001
- **パスワード**: password
- **店舗**: STORE001

## 8. 自動化スクリプト群

### 8.1 利用可能なスクリプト

#### A. セットアップ・デプロイスクリプト
```bash
scripts/setup-ec2.sh              # EC2初期セットアップ自動化
scripts/deploy-manual.sh          # 手動デプロイスクリプト
scripts/backup-restore.sh         # バックアップ・復元管理
.github/workflows/deploy-production.yml  # GitHub Actions自動デプロイ
```

#### B. 各スクリプトの実行権限設定
```bash
chmod +x scripts/*.sh
```

### 8.2 GitHub Actions自動デプロイ

#### 設定済み機能
- **自動テスト実行**: backend・frontend の TypeScript・テストスイート
- **自動デプロイ**: mainブランチへのpush時に自動実行
- **ヘルスチェック**: デプロイ後の動作確認
- **エラー通知**: デプロイ失敗時の通知機能

#### GitHub Secrets設定項目
```
AWS_ACCESS_KEY_ID         # AWS認証キー
AWS_SECRET_ACCESS_KEY     # AWS秘密鍵
AWS_REGION               # AWSリージョン
EC2_PRIVATE_KEY          # EC2接続用秘密鍵
EC2_HOST                 # EC2パブリックIP
POSTGRES_DB              # PostgreSQL DB名
POSTGRES_USER            # PostgreSQL ユーザー名
POSTGRES_PASSWORD        # PostgreSQL パスワード
REDIS_PASSWORD           # Redis パスワード
JWT_SECRET               # JWT秘密鍵
JWT_REFRESH_SECRET       # JWT更新秘密鍵
SESSION_SECRET           # セッション秘密鍵
CORS_ORIGIN             # フロントエンドURL
CORS_ORIGIN_WS          # WebSocket URL
PGADMIN_EMAIL           # pgAdmin ログイン email
PGADMIN_PASSWORD        # pgAdmin パスワード
```

### 8.3 手動デプロイスクリプト機能

#### 実行方法
```bash
# EC2上で実行
./scripts/deploy-manual.sh
```

#### 機能一覧
- 事前バックアップ自動作成
- GitHub最新コード取得
- コンテナ停止・再ビルド・起動
- ヘルスチェック実行
- ログ確認・結果レポート

### 8.4 バックアップ・復元スクリプト機能

#### 基本使用方法
```bash
./scripts/backup-restore.sh backup          # バックアップ作成
./scripts/backup-restore.sh list            # バックアップ一覧
./scripts/backup-restore.sh restore [ID]    # 指定バックアップから復元
./scripts/backup-restore.sh cleanup         # 古いファイル削除
```

#### サポートデータ
- PostgreSQL データベース
- Redis データ
- アップロードファイル
- システム設定ファイル

## 9. 監視・ヘルスチェック

### 9.1 監視スクリプト実行
```bash
# EC2上で実行
./scripts/health-check.sh
```

### 9.2 監視項目
- Docker コンテナ状態
- データベース接続状態
- API レスポンス確認
- ディスク・メモリ使用量
- ログファイル状況

### 9.3 定期監視設定
```bash
# crontab設定例
# 毎日午前2時に自動バックアップ
0 2 * * * /home/ec2-user/glasses-store/scripts/backup-restore.sh backup

# 毎週日曜日にシステムクリーンアップ
0 5 * * 0 docker system prune -f

# 毎時ヘルスチェック
0 * * * * /home/ec2-user/glasses-store/scripts/health-check.sh
```

## 10. セキュリティ・最適化設定

### 10.1 SSL証明書設定（Let's Encrypt）
```bash
# SSL証明書自動取得・更新
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# 自動更新設定
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 10.2 ファイアウォール・セキュリティ
```bash
# Fail2ban設定（ブルートフォース攻撃対策）
sudo yum install -y epel-release fail2ban
sudo systemctl enable fail2ban && sudo systemctl start fail2ban

# SSH ポート変更推奨
sudo nano /etc/ssh/sshd_config  # Port 22 → Port 2222
```

### 10.3 パフォーマンス最適化
```bash
# スワップファイル作成（メモリ不足対策）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile

# Docker ログ肥大化防止
echo '{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"5"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

## 11. トラブルシューティング

### 11.1 よくある問題と解決方法

#### Docker コンテナが起動しない
```bash
# ログ確認
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs [service-name]

# 個別再起動
docker-compose -f docker-compose.yml -f docker-compose.production.yml restart [service-name]
```

#### メモリ不足
```bash
# メモリ使用量確認
free -h && docker stats

# 不要コンテナ・イメージ削除
docker system prune -af
```

#### データベース接続エラー
```bash
# PostgreSQL 接続確認
docker-compose exec postgres pg_isready -U glasses_user

# Redis 接続確認
docker-compose exec redis redis-cli ping
```

### 11.2 緊急時復旧手順
```bash
# 1. 最新バックアップから復元
./scripts/backup-restore.sh list
./scripts/backup-restore.sh restore [最新バックアップID]

# 2. 前の安定バージョンにロールバック
git log --oneline -10
git reset --hard [前の安定コミットハッシュ]
./scripts/deploy-manual.sh
```

## 12. コスト・運用管理

### 12.1 推奨構成とコスト見積もり

#### 標準本番環境
```
EC2 t3.medium (2vCPU, 4GB RAM): ~$30/月
EBS 50GB gp3: ~$4/月
Elastic IP: ~$3.6/月
データ転送: ~$10/月
合計: ~$48/月
```

#### 最小構成（開発・テスト用）
```
EC2 t3.small (1vCPU, 2GB RAM): ~$15/月
EBS 20GB gp3: ~$1.6/月
合計: ~$17/月
```

### 12.2 コスト最適化施策
```bash
# 不要時の自動停止・起動（AWS CLI使用）
# 開発環境の夜間・週末停止設定
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

## 13. まとめ

この完全自動化されたデプロイガイドにより、現在のローカルDocker環境をAWS EC2上に本番レベルで構築・運用できます。

### 🎯 主な特徴
- **完全自動化**: GitHub Actions による CI/CD パイプライン
- **包括的バックアップ**: 自動バックアップ・復元機能
- **監視・ヘルスチェック**: 24/7 システム監視
- **セキュリティ対応**: SSL、ファイアウォール、認証強化
- **運用支援**: トラブルシューティング・復旧手順完備

### 🚀 次のステップ
1. **EC2インスタンス準備**: セキュリティグループ・Elastic IP設定
2. **GitHub Secrets設定**: 認証情報・環境変数設定
3. **自動セットアップ実行**: `scripts/setup-ec2.sh` 実行
4. **自動デプロイ**: GitHub にpush して自動デプロイ実行
5. **運用開始**: 監視・バックアップ体制確立

### 📞 サポート体制
- **技術ドキュメント**: 完全なAPI・システム仕様書
- **運用マニュアル**: 日常運用・緊急対応手順書
- **自動化スクリプト**: 保守・運用作業の完全自動化

---
**重要**: 本番環境デプロイ前に、開発環境での十分な動作テストを実施してください。