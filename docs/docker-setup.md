# Docker環境構築ガイド

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 完成  

## 1. 概要

このドキュメントでは、眼鏡店顧客管理システムをローカルPCのDockerコンテナ環境で実装・運用する方法を詳しく説明します。

### 1.1 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker コンテナ環境                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Nginx    │  │  Frontend   │  │   Backend   │        │
│  │(Proxy/LB)   │  │   (React)   │  │  (Node.js)  │        │
│  │   :80/443   │  │    :3000    │  │    :3001    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            glasses_network                          │    │
│  └─────────────────────────────────────────────────────┘    │
│         │                                     │              │
│  ┌─────────────┐                      ┌─────────────┐        │
│  │ PostgreSQL  │                      │    Redis    │        │
│  │    :5432    │                      │    :6379    │        │
│  └─────────────┘                      └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 使用技術

| コンポーネント | 技術/イメージ | 説明 |
|---------------|---------------|------|
| **プロキシ** | Nginx 1.25-alpine | リバースプロキシ・SSL終端 |
| **フロントエンド** | Node.js 18-alpine + React | ユーザーインターフェース |
| **バックエンド** | Node.js 18-alpine + Express | REST API サーバー |
| **データベース** | PostgreSQL 15-alpine | メインデータストア |
| **キャッシュ** | Redis 7-alpine | セッション・キャッシュ |

## 2. 前提条件

### 2.1 必要なソフトウェア

**必須要件**:
- **Docker**: 20.10.0 以上
- **Docker Compose**: 2.0.0 以上
- **Git**: 2.30.0 以上

**推奨要件**:
- **Make**: GNU Make 4.0以上（開発効率向上）
- **curl**: ヘルスチェック用
- **jq**: JSON処理用

### 2.2 システム要件

**最小要件**:
- **CPU**: 2コア以上
- **メモリ**: 4GB以上
- **ディスク**: 10GB以上の空き容量

**推奨要件**:
- **CPU**: 4コア以上
- **メモリ**: 8GB以上
- **ディスク**: 20GB以上の空き容量

### 2.3 ポート要件

以下のポートが利用可能である必要があります：

| ポート | サービス | 説明 |
|--------|---------|------|
| 80 | Nginx | HTTP アクセス |
| 443 | Nginx | HTTPS アクセス（本番時） |
| 3000 | React | フロントエンド開発サーバー |
| 3001 | Express | バックエンド API サーバー |
| 5432 | PostgreSQL | データベース |
| 6379 | Redis | キャッシュサーバー |

## 3. セットアップ手順

### 3.1 プロジェクトのクローン

```bash
# プロジェクトをクローン
git clone <repository-url> glasses-store
cd glasses-store

# ブランチを確認
git branch -a
```

### 3.2 自動セットアップ（推奨）

**最も簡単な方法** - 一括セットアップ：

```bash
# 1. 自動環境構築
make setup

# 2. 開発環境を起動
make dev
```

### 3.3 手動セットアップ

**段階的にセットアップしたい場合**：

#### ステップ 1: 環境変数の設定

```bash
# 環境変数を自動生成
bash scripts/generate-env.sh

# または手動で設定
cp .env.docker .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 必要に応じて環境変数を編集
nano .env
```

#### ステップ 2: ディレクトリ作成

```bash
# 必要なディレクトリを作成
mkdir -p data/postgresql data/redis logs/nginx logs/app uploads/customers backups certs

# 権限設定
chmod 755 data/postgresql data/redis uploads/customers
```

#### ステップ 3: コンテナビルドと起動

```bash
# コンテナをビルド
docker-compose build

# サービスを起動
docker-compose up -d

# 起動状況を確認
docker-compose ps
```

## 4. 開発用コマンド集

### 4.1 基本コマンド

```bash
# 開発環境起動
make dev

# サービス状態確認
make status

# ログ表示（全サービス）
make logs

# サービス停止
make down

# 完全クリーンアップ
make clean
```

### 4.2 個別サービス制御

```bash
# 個別サービスのログ
make logs-backend
make logs-frontend
make logs-db

# 個別サービス再起動
docker-compose restart backend
docker-compose restart frontend
```

### 4.3 データベース操作

```bash
# データベースに接続
make db-connect

# 初期データ投入
make db-seed

# データベースリセット（危険）
make db-reset

# バックアップ作成
make backup

# バックアップから復元
make restore
```

### 4.4 テスト・品質管理

```bash
# 全テスト実行
make test

# 静的解析
make lint

# コードフォーマット
make format

# セキュリティ監査
make audit
```

## 5. トラブルシューティング

### 5.1 よくある問題と解決策

#### 問題: コンテナが起動しない

**症状**: `docker-compose up` でエラーが発生

**解決策**:
```bash
# ポート競合を確認
make ports

# 既存コンテナを停止
docker-compose down

# イメージを再ビルド
docker-compose build --no-cache

# 再起動
docker-compose up -d
```

#### 問題: データベース接続エラー

**症状**: `database connection failed` エラー

**解決策**:
```bash
# データベースコンテナの状態確認
docker-compose logs postgres

# データベースに直接接続テスト
make db-connect

# 環境変数を確認
docker-compose exec backend env | grep DB_
```

#### 問題: フロントエンドが表示されない

**症状**: ブラウザで `localhost:3000` にアクセスできない

**解決策**:
```bash
# フロントエンドコンテナの状態確認
docker-compose logs frontend

# Nginxプロキシ設定確認
curl http://localhost/health

# ポート確認
netstat -tlnp | grep 3000
```

#### 問題: ヘルスチェックが失敗する

**症状**: `make health` でエラーが表示される

**解決策**:
```bash
# 各サービスの詳細状態確認
docker-compose ps

# 個別にヘルスチェック
curl -f http://localhost/health
curl -f http://localhost:3001/health
curl -f http://localhost:3000/

# コンテナログを確認
make logs
```

### 5.2 パフォーマンス最適化

#### メモリ使用量の調整

```bash
# 現在のリソース使用量確認
docker stats --no-stream

# 不要なコンテナ・イメージ削除
docker system prune -f

# Node.js メモリ制限設定
# docker-compose.yml で environment に追加:
NODE_OPTIONS=--max-old-space-size=1024
```

#### ディスク容量の管理

```bash
# ディスク使用量確認
docker system df

# 古いログファイル削除
find logs/ -name "*.log" -mtime +7 -delete

# 古いバックアップ削除
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

### 5.3 デバッグモード

#### コンテナ内部の調査

```bash
# バックエンドコンテナに接続
make debug-backend

# フロントエンドコンテナに接続
make debug-frontend

# データベースコンテナに接続
make debug-db

# Nginxコンテナに接続
make debug-nginx
```

#### ログレベルの変更

```bash
# 詳細ログを有効化（backend/.env）
LOG_LEVEL=debug
VERBOSE_LOGGING=true
DB_LOGGING=true

# フロントエンド詳細ログ（frontend/.env.local）
REACT_APP_DEBUG_MODE=true
REACT_APP_VERBOSE_LOGGING=true
```

## 6. 本番環境への移行

### 6.1 本番環境設定

#### 環境変数の変更

```bash
# 本番用環境変数設定
NODE_ENV=production
DEBUG=false

# セキュリティ強化
JWT_SECRET=<本番用強力な秘密鍵>
DB_PASSWORD=<本番用強力なパスワード>
REDIS_PASSWORD=<本番用強力なパスワード>
```

#### SSL/TLS 証明書の配置

```bash
# 証明書を配置
cp your-certificate.crt certs/server.crt
cp your-private-key.key certs/server.key

# 権限設定
chmod 600 certs/server.key
chmod 644 certs/server.crt
```

### 6.2 本番デプロイ

```bash
# 本番用ビルド
make prod-build

# 本番デプロイ
make prod-deploy

# 状態確認
make status
make health
```

## 7. 監視・メンテナンス

### 7.1 定期監視

```bash
# 日次チェックスクリプト
#!/bin/bash
# daily-check.sh

echo "=== 日次システムチェック ==="
make status
make health
make backup

# ディスク容量チェック
df -h

# ログサイズチェック
du -sh logs/
```

### 7.2 定期メンテナンス

#### 週次メンテナンス

```bash
# 週次メンテナンス（毎日曜日実行推奨）
#!/bin/bash

# システム更新
docker-compose pull
make build

# 古いデータクリーンアップ
docker system prune -f --volumes

# パフォーマンステスト
make test
```

#### 月次メンテナンス

```bash
# 月次メンテナンス

# セキュリティ監査
make audit

# 証明書期限確認
openssl x509 -in certs/server.crt -text -noout | grep "Not After"

# データベース最適化
make db-connect
# VACUUM ANALYZE; を実行
```

## 8. セキュリティ考慮事項

### 8.1 コンテナセキュリティ

- 全コンテナで非特権ユーザーを使用
- 読み取り専用ファイルシステム
- 最小限の権限（capabilities）のみ付与
- 定期的なベースイメージ更新

### 8.2 ネットワークセキュリティ

- 内部ネットワーク分離
- 不要なポートの非公開
- レート制限とファイアウォール設定

### 8.3 データ保護

- データベース暗号化
- 機密情報の環境変数管理
- 定期的なバックアップ
- アクセスログ監視

## 9. FAQ（よくある質問）

**Q: Docker環境の動作が遅いのですが？**

A: 以下を確認してください：
- Docker Desktop の CPU・メモリ制限設定を調整
- 不要なコンテナ・イメージを削除（`docker system prune -f`）
- WSL2（Windows）の場合、リソース設定を確認

**Q: 他のポートでサービスを起動したいのですが？**

A: `.env`ファイルで以下を変更：
```bash
FRONTEND_PORT=4000
BACKEND_PORT=4001
NGINX_PORT=8080
```

**Q: 本番環境でのバックアップ自動化は？**

A: cron を使用して定期実行：
```bash
# crontab -e で追加
0 2 * * * cd /path/to/project && make backup
```

**Q: 開発中にデータベースをリセットしたいのですが？**

A: 注意深く以下を実行：
```bash
make db-reset  # 全データが削除されます
make db-seed   # 初期データを再投入
```

このガイドに従って、安全で効率的なDocker環境での開発・運用を実現してください。