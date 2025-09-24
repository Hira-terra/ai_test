# 眼鏡店管理システム AWS本番環境デプロイ計画書

## 1. 概要

現在のローカルDocker環境（開発環境）をAWS上に本番運用環境として構築するための詳細計画書です。

### 1.1 現在のローカル環境構成
- **フロントエンド**: React + TypeScript (ポート3000)
- **バックエンド**: Node.js + Express (ポート3001)  
- **データベース**: PostgreSQL 15 (ポート5432)
- **キャッシュ**: Redis 7 (ポート6379)
- **リバースプロキシ**: Nginx (ポート80/443)
- **管理ツール**: pgAdmin (ポート5050)

### 1.2 提供されたAWSリソース情報
- **AWSアカウント**: 527068389645
- **リージョン**: ap-northeast-1
- **VPC**: 172.19.0.0/16 (vpc-0d9e0881a77d26ab0)
- **EC2インスタンス**: i-09e6bdd6d228135e3 (172.19.101.51)
- **ALB DNS**: http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com/

## 2. AWS環境でのアーキテクチャ設計

### 2.1 推奨構成

```
[Internet] → [ALB] → [EC2] → [RDS(PostgreSQL)] + [ElastiCache(Redis)]
                      ↓
                 [S3(アップロード)]
```

### 2.2 各コンポーネントの移行方針

#### A. フロントエンド (React)
- **現在**: Docker container (glasses_frontend)
- **AWS**: EC2上でNginx配信または S3 + CloudFront
- **推奨**: EC2上のNginxで配信（既存ALBを活用）

#### B. バックエンドAPI (Node.js)  
- **現在**: Docker container (glasses_backend)
- **AWS**: EC2上でPM2またはDocker運用
- **推奨**: EC2上でPM2運用（管理しやすさ重視）

#### C. データベース (PostgreSQL)
- **現在**: Docker container (glasses_postgres)
- **AWS**: Amazon RDS for PostgreSQL
- **推奨**: RDS Multi-AZ構成（高可用性）

#### D. キャッシュ (Redis)
- **現在**: Docker container (glasses_redis)  
- **AWS**: Amazon ElastiCache for Redis
- **推奨**: ElastiCache Cluster Mode Disabled（シンプル構成）

#### E. ファイルストレージ
- **現在**: ローカルボリューム (./uploads)
- **AWS**: Amazon S3
- **推奨**: S3 + CloudFront（CDN効果）

#### F. ログ管理
- **現在**: ローカルファイル (./logs)
- **AWS**: CloudWatch Logs
- **推奨**: CloudWatch Logs + 長期保管はS3

## 3. デプロイ手順

### 3.1 事前準備

#### A. AWS認証設定
```bash
# IAMユーザー情報設定
aws configure set aws_access_key_id [YOUR_ACCESS_KEY_ID]
aws configure set aws_secret_access_key [YOUR_SECRET_ACCESS_KEY]
aws configure set default.region ap-northeast-1
```

#### B. EC2接続確認
```bash
# pemファイル取得（Googleドライブから）
# https://drive.google.com/drive/folders/12_IFXqoN1KZnpRO9QtobC29e9nc9NlEz?usp=drive_link

# EC2接続テスト
ssh -i bl-glasses-01.pem ec2-user@172.19.101.51
```

### 3.2 データベース構築 (Amazon RDS)

#### A. RDSインスタンス作成
```bash
# RDS PostgreSQL作成（推奨設定）
aws rds create-db-instance \
  --db-instance-identifier glasses-store-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username glasses_user \
  --master-user-password "SecurePassword123!" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default-vpc-0d9e0881a77d26ab0 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted
```

#### B. データベース初期化
```bash
# スキーマ・シードデータ投入
psql -h glasses-store-prod.xxxxx.ap-northeast-1.rds.amazonaws.com \
     -U glasses_user -d glasses_store_db \
     -f backend/database/schema.sql

psql -h glasses-store-prod.xxxxx.ap-northeast-1.rds.amazonaws.com \
     -U glasses_user -d glasses_store_db \
     -f backend/database/seed.sql
```

### 3.3 キャッシュ構築 (ElastiCache)

```bash
# ElastiCache Redis作成
aws elasticache create-cache-cluster \
  --cache-cluster-id glasses-store-cache \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --cache-subnet-group-name default-vpc-0d9e0881a77d26ab0 \
  --security-group-ids sg-xxxxxxxxx
```

### 3.4 S3バケット構築

```bash
# アップロード用S3バケット作成
aws s3 mb s3://glasses-store-uploads-prod --region ap-northeast-1

# パブリックアクセス設定（必要に応じて）
aws s3api put-public-access-block \
  --bucket glasses-store-uploads-prod \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 3.5 EC2アプリケーションデプロイ

#### A. 必要なソフトウェア導入
```bash
# EC2にSSH接続後実行
sudo yum update -y
sudo yum install -y git docker nginx

# Node.js 18 導入
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
npm install -g pm2

# Docker起動
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

#### B. アプリケーションコードデプロイ
```bash
# GitHubからクローン
git clone https://github.com/Hira-terra/ai_test.git /home/ec2-user/glasses-store
cd /home/ec2-user/glasses-store

# バックエンドビルド
cd backend
npm install --production
npm run build

# フロントエンドビルド  
cd ../frontend
npm install
npm run build
```

#### C. 本番環境設定ファイル作成
```bash
# 本番用.env作成
cat > /home/ec2-user/glasses-store/.env.prod << 'EOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# RDS接続情報
DB_HOST=glasses-store-prod.xxxxx.ap-northeast-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=glasses_store_db
DB_USER=glasses_user  
DB_PASSWORD=SecurePassword123!

# ElastiCache接続情報
REDIS_HOST=glasses-store-cache.xxxxx.cache.amazonaws.com
REDIS_PORT=6379

# セキュリティキー（本番用に新規生成）
JWT_SECRET=本番用秘密鍵
JWT_REFRESH_SECRET=本番用リフレッシュ秘密鍵
SESSION_SECRET=本番用セッション秘密鍵

# S3設定
AWS_ACCESS_KEY_ID=[YOUR_ACCESS_KEY_ID]
AWS_SECRET_ACCESS_KEY=[YOUR_SECRET_ACCESS_KEY]
S3_BUCKET_NAME=glasses-store-uploads-prod
S3_REGION=ap-northeast-1

# CORS設定
CORS_ORIGIN=http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com
EOF
```

#### D. PM2でバックエンド起動
```bash
# PM2設定ファイル作成
cat > /home/ec2-user/glasses-store/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'glasses-store-api',
    script: './backend/dist/index.js',
    cwd: '/home/ec2-user/glasses-store',
    env_file: '/home/ec2-user/glasses-store/.env.prod',
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    log_file: '/var/log/glasses-store/combined.log',
    out_file: '/var/log/glasses-store/out.log',
    error_file: '/var/log/glasses-store/error.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# ログディレクトリ作成
sudo mkdir -p /var/log/glasses-store
sudo chown ec2-user:ec2-user /var/log/glasses-store

# PM2で起動
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### E. Nginxでフロントエンド配信
```bash
# Nginx設定
sudo tee /etc/nginx/conf.d/glasses-store.conf << 'EOF'
server {
    listen 80;
    server_name bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com;
    
    # フロントエンド静的ファイル配信
    location / {
        root /home/ec2-user/glasses-store/frontend/build;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # APIプロキシ
    location /api/ {
        proxy_pass http://localhost:3001;
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
}
EOF

# Nginx起動
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 4. セキュリティ設定

### 4.1 セキュリティグループ設定

#### A. EC2用セキュリティグループ
```bash
# HTTP/HTTPS許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp --port 443 --cidr 0.0.0.0/0

# SSH許可（管理用）
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxxxxxx \
  --protocol tcp --port 22 --cidr 0.0.0.0/0
```

#### B. RDS用セキュリティグループ
```bash
# EC2からのPostgreSQL接続のみ許可
aws ec2 authorize-security-group-ingress \
  --group-id sg-rds-xxxxxxxxx \
  --protocol tcp --port 5432 \
  --source-group sg-ec2-xxxxxxxxx
```

### 4.2 本番用環境変数生成

```bash
# 本番用セキュリティキー生成
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32) 
SESSION_SECRET=$(openssl rand -hex 32)

echo "JWT_SECRET=${JWT_SECRET}"
echo "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}"
echo "SESSION_SECRET=${SESSION_SECRET}"
```

## 5. 運用・監視設定

### 5.1 CloudWatch監視設定

#### A. ログ監視
```bash
# CloudWatchエージェント設定
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/glasses-store/combined.log",
            "log_group_name": "glasses-store-app",
            "log_stream_name": "{instance_id}-app"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "glasses-store-nginx",
            "log_stream_name": "{instance_id}-access"
          }
        ]
      }
    }
  }
}
EOF
```

#### B. アラート設定
```bash
# CPU使用率アラート
aws cloudwatch put-metric-alarm \
  --alarm-name glasses-store-high-cpu \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-09e6bdd6d228135e3
```

### 5.2 バックアップ設定

#### A. RDSスナップショット
```bash
# 毎日午前3時にスナップショット
aws events put-rule \
  --name glasses-store-daily-snapshot \
  --schedule-expression "cron(0 3 * * ? *)"
```

#### B. S3バックアップ
```bash
# アプリケーションファイルバックアップ
aws s3 sync /home/ec2-user/glasses-store \
  s3://glasses-store-backups-prod/$(date +%Y%m%d)/ \
  --exclude "node_modules/*" --exclude ".git/*"
```

## 6. デプロイ後のテスト項目

### 6.1 動作確認
- [ ] フロントエンド画面表示
- [ ] ログイン機能
- [ ] 顧客管理機能  
- [ ] 受注管理機能
- [ ] 値引きマスタ管理機能
- [ ] API動作確認
- [ ] データベース接続確認
- [ ] Redis接続確認

### 6.2 パフォーマンステスト
- [ ] レスポンス時間測定
- [ ] 同時接続数テスト
- [ ] メモリ使用量確認
- [ ] CPU使用量確認

### 6.3 セキュリティ確認
- [ ] HTTPS動作確認
- [ ] 認証機能テスト
- [ ] セッション管理確認
- [ ] ファイルアップロード制限

## 7. 運用手順

### 7.1 アプリケーション更新
```bash
# コード更新
cd /home/ec2-user/glasses-store
git pull origin main

# バックエンド更新
cd backend
npm run build
pm2 restart glasses-store-api

# フロントエンド更新  
cd ../frontend
npm run build
sudo systemctl reload nginx
```

### 7.2 ログ確認
```bash
# アプリケーションログ
pm2 logs glasses-store-api

# Nginxログ
sudo tail -f /var/log/nginx/access.log

# システムログ
sudo journalctl -u nginx -f
```

### 7.3 データベースメンテナンス
```bash
# RDS接続
psql -h glasses-store-prod.xxxxx.ap-northeast-1.rds.amazonaws.com \
     -U glasses_user -d glasses_store_db

# バックアップ確認
aws rds describe-db-snapshots --db-instance-identifier glasses-store-prod
```

## 8. トラブルシューティング

### 8.1 よくある問題と解決方法

#### A. アプリケーション起動失敗
```bash
# PM2ログ確認
pm2 logs glasses-store-api --lines 50

# 環境変数確認
pm2 show glasses-store-api
```

#### B. データベース接続エラー
```bash
# RDS接続テスト
pg_isready -h glasses-store-prod.xxxxx.ap-northeast-1.rds.amazonaws.com -p 5432

# セキュリティグループ確認  
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
```

#### C. Redis接続エラー
```bash
# ElastiCache接続テスト
redis-cli -h glasses-store-cache.xxxxx.cache.amazonaws.com ping
```

## 9. コスト最適化

### 9.1 推奨構成でのコスト見積もり

- **EC2 t3.small**: $15/月
- **RDS t3.micro**: $13/月  
- **ElastiCache t3.micro**: $11/月
- **S3**: ~$3/月（100GB想定）
- **データ転送**: ~$5/月
- **合計**: 約$47/月

### 9.2 コスト削減案

- 開発・テスト時はスケジュール停止
- Reserved Instancesの検討
- 不要なログの削除設定
- CloudWatchメトリクス見直し

## 10. 注意事項

### 10.1 セキュリティ
- 本番用パスワードは必ず変更
- SSH keyの適切な管理
- 定期的なセキュリティアップデート
- WAFの導入検討

### 10.2 可用性
- Multi-AZ RDS設定推奨
- ELB health check設定
- 監視・アラート設定必須
- 定期的なバックアップテスト

### 10.3 パフォーマンス
- インスタンスサイズの定期見直し
- データベースパフォーマンス監視  
- CloudFront導入でCDN効果
- Auto Scaling設定検討

---

## 次のステップ

1. **リソース作成**: RDS、ElastiCache、S3の作成
2. **アプリケーションデプロイ**: EC2へのコードデプロイ
3. **動作確認**: 全機能の動作テスト
4. **監視設定**: CloudWatch、アラート設定
5. **本番運用開始**: 運用手順書に従った運用

このデプロイ計画書に従って作業を進めることで、現在のローカル環境と同等の機能を持つAWS本番環境を構築できます。