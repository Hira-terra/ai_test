# 環境変数設定ガイド

## 環境別設定ファイル

### ローカル開発環境
- **ファイル**: `.env`
- **用途**: ローカルDocker開発用
- **API設定**: `REACT_APP_API_BASE_URL=http://localhost:3001/api`

### EC2本番環境
- **ファイル**: `.env.production`
- **用途**: AWS EC2本番デプロイ用
- **API設定**: `REACT_APP_API_BASE_URL=/api` (相対パス)

## EC2環境でのデプロイ手順

### 1. ローカルで設定ファイルを更新
```bash
# .env.productionを編集
vim .env.production

# Git管理
git add .env.production
git commit -m "update: EC2環境設定を更新"
git push
```

### 2. EC2で設定を反映
```bash
# EC2にSSH接続
ssh -i bl-glasses-01.pem ec2-user@172.19.101.201

# 最新コードを取得
cd glasses-store
git pull

# 本番用設定を適用
cp .env.production .env

# コンテナを再起動
docker-compose down
docker-compose up -d

# 動作確認
docker-compose ps
```

## 重要な環境変数

### React App設定
```bash
REACT_APP_API_BASE_URL=/api          # API基底URL（相対パス推奨）
REACT_APP_WS_URL=ws://domain:port    # WebSocket URL
REACT_APP_USE_MOCK_API=false         # モックAPI使用フラグ
```

### データベース設定
```bash
POSTGRES_DB=glasses_store_db
POSTGRES_USER=glasses_user
POSTGRES_PASSWORD=GlassesStore2025Prod!  # EC2環境用パスワード
```

### セキュリティ設定
```bash
JWT_SECRET=production_jwt_secret_here
JWT_REFRESH_SECRET=production_refresh_secret_here
SESSION_SECRET=production_session_secret_here
```

## 注意事項

1. **機密情報の管理**
   - 本番パスワードは`.env.production`に記載
   - `.env.production`はGitで管理するが、機密情報は別途管理も検討

2. **API URL設定**
   - EC2環境では相対パス (`/api`) を使用
   - ALB経由アクセス時も同じ設定で動作

3. **環境の分離**
   - ローカル：`http://localhost:3001/api`
   - EC2開発確認：`http://172.19.101.201:3000/api` → Nginx → backend
   - 本番（ALB）：`https://domain.com/api` → Nginx → backend

## トラブルシューティング

### API接続エラー「Failed to fetch」の場合
1. REACT_APP_API_BASE_URLの設定を確認
2. Nginxプロキシ設定を確認
3. バックエンドコンテナの稼働状況を確認

### 環境変数が反映されない場合
1. .envファイルの内容を確認
2. docker-compose down && docker-compose up -d で再起動
3. フロントエンドコンテナの環境変数を確認：`docker exec glasses_frontend env | grep REACT_APP`