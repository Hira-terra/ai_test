# 眼鏡店顧客管理システム

眼鏡店向けの包括的な顧客管理システムです。顧客情報、処方箋管理、商品管理、在庫管理などの機能を提供します。

## 🚀 特徴

- 顧客情報管理（基本情報、処方箋履歴、購入履歴）
- 商品マスタ管理（フレーム、レンズ、コンタクトレンズ、補聴器、アクセサリー）
- 在庫管理システム
- 売上分析ダッシュボード
- マルチ店舗対応
- ロールベースアクセス制御（店長、スタッフ、管理者）

## 🛠️ 技術スタック

### フロントエンド
- React 18 + TypeScript
- Material-UI (MUI)
- Redux Toolkit
- React Router v6

### バックエンド
- Node.js + Express
- TypeScript
- PostgreSQL
- Redis (キャッシュ)
- JWT認証

### インフラ
- Docker & Docker Compose
- Nginx (リバースプロキシ)
- AWS対応準備済み

## 📋 前提条件

- Docker & Docker Compose
- Git
- Node.js 18+ (ローカル開発用)

## 🚀 クイックスタート

### 1. リポジトリのクローン
```bash
git clone https://github.com/Hira-terra/ai_test.git
cd ai_test
```

### 2. 環境変数の設定
```bash
# ルートディレクトリ
cp .env.example .env

# バックエンド
cp backend/.env.example backend/.env

# フロントエンド
cp frontend/.env.example frontend/.env.local
```

各.envファイルを編集し、適切な値を設定してください。

### 3. Dockerコンテナの起動
```bash
# 開発環境の起動
docker-compose up -d

# ログの確認
docker-compose logs -f
```

### 4. データベースの初期化
```bash
# マイグレーションとシードデータの投入
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

### 5. アプリケーションへのアクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001
- APIドキュメント: http://localhost:3001/api-docs

### デフォルト認証情報
- ユーザーコード: `manager001`
- パスワード: `password`
- 店舗コード: `STORE001`

## 📁 プロジェクト構造

```
.
├── backend/            # バックエンドAPI
├── frontend/           # Reactフロントエンド
├── nginx/              # Nginx設定
├── scripts/            # ユーティリティスクリプト
├── data/               # データボリューム（.gitignore）
├── logs/               # ログファイル（.gitignore）
├── uploads/            # アップロードファイル（.gitignore）
├── docker-compose.yml  # Docker Compose設定
├── Makefile           # 便利なコマンド集
└── README.md          # このファイル
```

## 🔧 開発

### ローカル開発サーバーの起動
```bash
# バックエンド
cd backend
npm install
npm run dev

# フロントエンド（別ターミナル）
cd frontend
npm install
npm start
```

### テストの実行
```bash
# バックエンドテスト
cd backend
npm test

# フロントエンドテスト
cd frontend
npm test
```

### ビルド
```bash
# 本番用ビルド
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
```

## 🚀 AWS移行準備

このプロジェクトはAWSへの移行を想定して設計されています。

### 必要なAWSサービス
- **ECS/Fargate**: コンテナ実行環境
- **RDS (PostgreSQL)**: データベース
- **ElastiCache (Redis)**: キャッシュ
- **S3**: ファイルストレージ
- **CloudFront**: CDN
- **ALB**: ロードバランサー
- **Route 53**: DNS
- **CloudWatch**: ログ・監視

### AWS移行手順

1. **ECRリポジトリの作成**
```bash
aws ecr create-repository --repository-name glasses-store-backend
aws ecr create-repository --repository-name glasses-store-frontend
```

2. **環境変数の設定**
`.env.example`のAWSセクションを参考に、AWS用の環境変数を設定

3. **Terraformでのインフラ構築**（予定）
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

4. **デプロイ**
```bash
# ECRへのプッシュ
make push-to-ecr

# ECSサービスの更新
make deploy-to-ecs
```

## 📝 Makefileコマンド

```bash
make help              # 利用可能なコマンド一覧
make up                # Docker環境起動
make down              # Docker環境停止
make logs              # ログ表示
make db-migrate        # DBマイグレーション実行
make db-seed           # シードデータ投入
make backup            # データベースバックアップ
make restore           # データベースリストア
```

## 🔒 セキュリティ

- 環境変数に機密情報を保存
- JWTによる認証
- ロールベースアクセス制御
- SQLインジェクション対策
- XSS対策
- HTTPS対応（本番環境）

## 📄 ライセンス

このプロジェクトは商用プロジェクトです。無断での使用・複製・配布を禁じます。

## 👥 開発チーム

- 開発リーダー: [Your Name]
- バックエンド: [Backend Developer]
- フロントエンド: [Frontend Developer]

## 📞 サポート

問題や質問がある場合は、以下までご連絡ください：
- Email: support@example.com
- Issue: https://github.com/Hira-terra/ai_test/issues