# 環境変数設定ガイド

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 設定完了  

## 1. 環境変数設定概要

このドキュメントでは、眼鏡店顧客管理システムを本番環境で動作させるために必要な環境変数の設定方法を詳しく説明します。

### 1.1 設定ファイル一覧

| ファイル | 用途 | 場所 |
|---------|------|------|
| `backend/.env.example` | バックエンドAPI用設定テンプレート | `/backend/.env.example` |
| `frontend/.env.example` | フロントエンドReactアプリ用設定テンプレート | `/frontend/.env.example` |
| `.env.docker` | Docker Compose用設定テンプレート | `/.env.docker` |

### 1.2 設定の優先順位

1. 環境変数（最優先）
2. `.env.local`ファイル（ローカル開発用）
3. `.env.production`ファイル（本番環境用）
4. `.env`ファイル（基本設定）
5. デフォルト値（コード内定義）

## 2. 初期設定手順

### 2.1 バックエンド環境設定

```bash
# 1. テンプレートファイルをコピー
cd backend
cp .env.example .env

# 2. エディタで .env ファイルを開き、必要な値を設定
nano .env
```

### 2.2 フロントエンド環境設定

```bash
# 1. テンプレートファイルをコピー
cd frontend
cp .env.example .env.local

# 2. エディタで .env.local ファイルを開き、必要な値を設定
nano .env.local
```

### 2.3 Docker環境設定

```bash
# 1. テンプレートファイルをコピー
cp .env.docker .env

# 2. エディタで .env ファイルを開き、必要な値を設定
nano .env
```

## 3. 重要な環境変数詳細設定

### 3.1 セキュリティ関連（必須変更）

#### JWT認証キー
```bash
# 本番環境では必ず独自の値に変更
JWT_SECRET=fee476d365a8121563f73089e9e0bfb8c63478336e82157c4e7e0b7cc692873d
JWT_REFRESH_SECRET=b6c64c1ba17ddf7a4000b1dc7b1bc3afc3f31fc3370ea41089cc7ffa8155f2b6
```

**生成方法**:
```bash
# 新しいJWT秘密鍵を生成
openssl rand -hex 32
```

#### セッション管理
```bash
SESSION_SECRET=76d5a8b0ee2106d6d9980b90a691eb182f72da72f9ca27ff483605911dc49b57
```

#### データベース暗号化
```bash
DB_ENCRYPTION_KEY=1cMyEb/njTMLHyYG9oxRPKx3QHLeDF1tg0fBGZNTm04=
```

**生成方法**:
```bash
# データベース暗号化キーを生成
openssl rand -base64 32
```

### 3.2 データベース設定

#### PostgreSQL接続設定
```bash
DB_HOST=localhost                    # データベースホスト
DB_PORT=5432                        # データベースポート
DB_NAME=glasses_store_db            # データベース名
DB_USER=glasses_user                # データベースユーザー
DB_PASSWORD=<STRONG_PASSWORD>       # 強力なパスワードに変更
```

#### 接続プール設定
```bash
DB_POOL_MIN=2                       # 最小接続数
DB_POOL_MAX=10                      # 最大接続数
DB_POOL_IDLE_TIMEOUT=10000         # アイドルタイムアウト（ミリ秒）
DB_POOL_ACQUIRE_TIMEOUT=60000      # 接続取得タイムアウト（ミリ秒）
```

### 3.3 Redis設定

```bash
REDIS_HOST=localhost                # Redisホスト
REDIS_PORT=6379                    # Redisポート
REDIS_PASSWORD=<REDIS_PASSWORD>    # Redis認証パスワード
REDIS_DB=0                         # 使用するRedisデータベース番号
```

### 3.4 ファイルアップロード設定

```bash
UPLOAD_DIR=./uploads               # アップロードディレクトリ
MAX_FILE_SIZE=10485760            # 最大ファイルサイズ（10MB）
CUSTOMER_IMAGES_DIR=./uploads/customers  # 顧客画像保存ディレクトリ
```

## 4. 環境別設定例

### 4.1 開発環境設定

```bash
# 基本設定
NODE_ENV=development
DEBUG=true
VERBOSE_LOGGING=true
DB_LOGGING=true

# フロントエンド設定
REACT_APP_API_BASE_URL=http://localhost:3001/api
REACT_APP_USE_MOCK_API=false
REACT_APP_DEBUG_MODE=true
```

### 4.2 ステージング環境設定

```bash
# 基本設定
NODE_ENV=staging
DEBUG=false
VERBOSE_LOGGING=false
DB_LOGGING=false

# セキュリティ設定
SSL_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=200
```

### 4.3 本番環境設定

```bash
# 基本設定
NODE_ENV=production
DEBUG=false
VERBOSE_LOGGING=false
DB_LOGGING=false

# セキュリティ設定
SSL_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_MAX_ATTEMPTS=5

# パフォーマンス設定
CACHE_ENABLED=true
IMAGE_RESIZE_ENABLED=true
```

## 5. セキュリティベストプラクティス

### 5.1 パスワード強度要件

- **最小長**: 12文字以上
- **文字種**: 大文字・小文字・数字・記号を含む
- **予測可能性**: 辞書単語や連続文字列を避ける

### 5.2 秘密鍵管理

```bash
# ❌ 悪い例：弱い鍵
JWT_SECRET=secret123

# ✅ 良い例：強力なランダム鍵
JWT_SECRET=fee476d365a8121563f73089e9e0bfb8c63478336e82157c4e7e0b7cc692873d
```

### 5.3 本番環境での注意事項

1. **デフォルト値の変更**: 全てのセキュリティ関連設定をデフォルトから変更
2. **権限管理**: 環境変数ファイルの読み取り権限を制限（600推奨）
3. **バックアップ**: 設定ファイルを安全な場所にバックアップ
4. **監査**: 定期的な設定値の監査・ローテーション

## 6. トラブルシューティング

### 6.1 よくある設定エラー

#### データベース接続エラー
```bash
# 症状: "database connection failed" エラー
# 原因: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD の設定ミス

# 確認方法
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

#### JWT認証エラー
```bash
# 症状: "Invalid token" エラー
# 原因: JWT_SECRET の設定ミス

# 確認方法
echo $JWT_SECRET | wc -c  # 64文字であることを確認
```

#### ファイルアップロードエラー
```bash
# 症状: "File upload failed" エラー
# 原因: ディレクトリの権限不足

# 修正方法
mkdir -p $UPLOAD_DIR
chmod 755 $UPLOAD_DIR
chown app:app $UPLOAD_DIR
```

### 6.2 設定値の検証

```bash
# 環境変数の設定確認スクリプト
#!/bin/bash
echo "=== 環境変数設定確認 ==="
echo "NODE_ENV: $NODE_ENV"
echo "DB_HOST: $DB_HOST"
echo "REDIS_HOST: $REDIS_HOST"
echo "JWT_SECRET length: $(echo -n $JWT_SECRET | wc -c)"
echo "UPLOAD_DIR exists: $(test -d $UPLOAD_DIR && echo "Yes" || echo "No")"
```

## 7. 環境変数の分類

### 7.1 必須設定項目（本番環境では必ず変更）

| 項目 | 説明 | セキュリティリスク |
|------|------|-------------------|
| `JWT_SECRET` | JWT署名用秘密鍵 | **高** |
| `JWT_REFRESH_SECRET` | リフレッシュトークン用秘密鍵 | **高** |
| `SESSION_SECRET` | セッション管理用秘密鍵 | **高** |
| `DB_PASSWORD` | データベースパスワード | **高** |
| `REDIS_PASSWORD` | Redis認証パスワード | **中** |

### 7.2 推奨変更項目

| 項目 | 説明 | 理由 |
|------|------|------|
| `DB_ENCRYPTION_KEY` | フィールド暗号化キー | データ保護強化 |
| `ADMIN_EMAIL` | 管理者メールアドレス | 通知先の正確性 |
| `COMPANY_NAME` | 会社名 | ブランディング |

### 7.3 オプション設定項目

| 項目 | 説明 | デフォルト値 |
|------|------|-------------|
| `CACHE_TTL_PRODUCTS` | 商品情報キャッシュ時間 | 3600秒 |
| `IMAGE_THUMBNAIL_SIZE` | サムネイルサイズ | 200px |
| `BACKUP_RETENTION_DAYS` | バックアップ保持日数 | 30日 |

## 8. 環境変数テンプレート生成

開発チーム用に、新しい環境変数テンプレートを生成するスクリプトを提供します：

```bash
#!/bin/bash
# generate-env-template.sh

echo "=== 環境変数テンプレート生成 ==="

# JWT秘密鍵生成
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
DB_ENCRYPTION_KEY=$(openssl rand -base64 32)

# テンプレート出力
cat > .env.generated << EOF
# 自動生成された環境変数テンプレート
# 生成日時: $(date)

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET
DB_ENCRYPTION_KEY=$DB_ENCRYPTION_KEY

# その他の設定項目は .env.example を参照してください
EOF

echo "テンプレートファイル '.env.generated' を作成しました"
echo "⚠️  本ファイルには機密情報が含まれています。適切に管理してください"
```

## 9. セキュリティ監査チェックリスト

### 9.1 初回セットアップ時
- [ ] 全てのデフォルトパスワードを変更
- [ ] JWT秘密鍵をランダム生成した値に変更
- [ ] データベース認証情報を設定
- [ ] ファイルパーミッションを制限（600）
- [ ] SSL証明書を配置

### 9.2 定期監査項目
- [ ] パスワードの強度確認（3ヶ月毎）
- [ ] 秘密鍵のローテーション（6ヶ月毎）
- [ ] 不要な環境変数の削除
- [ ] アクセスログの確認
- [ ] バックアップファイルのセキュリティ確認

## 10. 本番デプロイメント用チェックリスト

### 10.1 デプロイ前確認事項
- [ ] NODE_ENV=production に設定
- [ ] DEBUG=false に設定
- [ ] 全ての <CHANGE_THIS_*> 項目を実際の値に変更
- [ ] SSL証明書の有効期限確認
- [ ] データベース接続テスト実行
- [ ] Redis接続テスト実行
- [ ] ファイルアップロード権限確認

### 10.2 デプロイ後確認事項
- [ ] アプリケーション起動確認
- [ ] ログイン機能テスト
- [ ] API エンドポイントテスト
- [ ] ファイルアップロード機能テスト
- [ ] セキュリティスキャン実行

この環境変数設定ガイドに従って、安全で正確なシステム構築を行ってください。