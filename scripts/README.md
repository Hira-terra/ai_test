# 本番環境デプロイ・運用スクリプト群

## 📁 スクリプト概要

| スクリプト名 | 目的 | 実行場所 | 実行タイミング |
|------------|------|---------|---------------|
| `setup-ec2.sh` | EC2初期セットアップ自動化 | EC2インスタンス | 初回のみ |
| `deploy-manual.sh` | 手動デプロイ実行 | EC2インスタンス | 任意 |
| `backup-restore.sh` | バックアップ・復元管理 | EC2インスタンス | 定期・必要時 |

## 🚀 クイックスタート

### 1. EC2初期セットアップ
```bash
# EC2インスタンスで実行
chmod +x setup-ec2.sh
./setup-ec2.sh

# 再ログインが必要（dockerグループ適用のため）
exit
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. 手動デプロイ実行
```bash
# アプリケーションディレクトリで実行
cd /home/ec2-user/glasses-store
./scripts/deploy-manual.sh
```

### 3. バックアップ操作
```bash
# バックアップ作成
./scripts/backup-restore.sh backup

# バックアップ一覧確認
./scripts/backup-restore.sh list

# 復元実行（例：20241201_120000）
./scripts/backup-restore.sh restore 20241201_120000

# 古いバックアップ削除
./scripts/backup-restore.sh cleanup
```

## 📋 setup-ec2.sh の機能

### 自動インストール項目
- Docker & Docker Compose
- Node.js (NVM経由)
- Git, curl, wget等の基本ツール
- SSL自己署名証明書生成

### 自動設定項目
- アプリケーション用ディレクトリ構造作成
- ログローテーション設定
- 定期バックアップ用cron設定
- SSH設定（GitHub用）
- セキュリティ推奨設定の準備

### 実行後の確認項目
```bash
# Docker動作確認
docker --version
docker-compose --version

# ディレクトリ構造確認
ls -la /home/ec2-user/glasses-store/

# cron設定確認
crontab -l
```

## 📦 deploy-manual.sh の機能

### デプロイフロー
1. **事前バックアップ作成** - 失敗時のロールバック用
2. **最新コード取得** - GitHubから最新のmainブランチ
3. **コンテナ停止** - 既存サービスの安全な停止
4. **イメージ再ビルド** - 新しいコードでのイメージ作成
5. **コンテナ起動** - 本番設定でのサービス開始
6. **ヘルスチェック** - API・DB・Redis接続確認
7. **結果レポート** - デプロイ成功・失敗の詳細報告

### 失敗時の自動対応
- バックアップからの復元方法表示
- エラーログの詳細出力
- 復旧手順の提示

## 💾 backup-restore.sh の機能

### バックアップ対象
- **PostgreSQL** - 完全なデータベースダンプ
- **Redis** - RDBスナップショット
- **アップロードファイル** - tar.gz形式
- **設定ファイル** - メタデータ情報

### 自動実行設定
```bash
# crontab設定例
# 毎日午前2時に自動バックアップ
0 2 * * * /home/ec2-user/glasses-store/scripts/backup-restore.sh backup

# 30日以上古いバックアップの自動削除
0 3 * * * /home/ec2-user/glasses-store/scripts/backup-restore.sh cleanup
```

### 復元機能
- **事前確認** - 復元前の現在データ自動バックアップ
- **段階復元** - PostgreSQL → Redis → ファイルの順番
- **検証機能** - 復元後の整合性確認

## 🔧 トラブルシューティング

### よくあるエラーと対処法

#### 1. setup-ec2.sh実行時のエラー
```bash
# 権限エラーの場合
sudo chown -R ec2-user:ec2-user /home/ec2-user/glasses-store

# Docker権限エラーの場合
sudo usermod -a -G docker ec2-user
# 再ログインが必要
```

#### 2. deploy-manual.sh実行時のエラー
```bash
# .env.production ファイルが見つからない場合
cp .env.production.example .env.production
nano .env.production  # 適切な値を設定

# Docker Compose ファイルが見つからない場合
ls -la docker-compose*.yml  # ファイル確認
```

#### 3. backup-restore.sh実行時のエラー
```bash
# バックアップディレクトリが存在しない場合
mkdir -p backups/{postgres,redis}

# コンテナが停止している場合
docker-compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

### ログ確認方法
```bash
# スクリプト実行ログの確認
tail -f logs/app/*.log
tail -f logs/nginx/*.log

# Docker コンテナログの確認
docker-compose logs -f [service-name]
```

## 📞 緊急時対応

### 即座復旧手順
```bash
# 1. 最新の動作バックアップを特定
./scripts/backup-restore.sh list

# 2. 即座復元実行
./scripts/backup-restore.sh restore [最新バックアップID]

# 3. サービス状態確認
docker-compose ps
curl http://localhost/api/health
```

### 完全リセット（最終手段）
```bash
# 全コンテナ・ボリューム削除
docker-compose down -v
docker system prune -af

# 初期状態から再デプロイ
./scripts/deploy-manual.sh
```

## 🔐 セキュリティ注意事項

### ファイル権限
- `.env.production`: 600 (所有者のみ読み書き)
- `*.sh`: 755 (所有者実行、グループ・その他読み実行)
- バックアップファイル: 640 (所有者読み書き、グループ読み)

### 秘密情報管理
- データベースパスワードは20文字以上
- JWT秘密鍵は64文字以上
- バックアップファイルの定期暗号化推奨

---

**📝 注意**: 本番環境での初回実行前に、必ず開発環境でのテストを実施してください。