# 開発・デプロイワークフロー

## 基本的な作業の流れ

### 1. 機能開発（ローカル環境）
```bash
# 1. ローカル環境で開発
cd /home/h-hiramitsu/projects/test_kokyaku
docker-compose up -d

# 2. 機能実装・テスト
# フロントエンド・バックエンドの実装

# 3. データベース変更が必要な場合
# a) ローカルで実際に変更実行
# b) schema.sqlに反映
# c) マイグレーションファイル作成
```

### 2. Gitでのバージョン管理
```bash
# 変更をコミット
git add .
git commit -m "feat: 機能名の実装とデータベーススキーマ更新"

# ネットワーク切り替えが必要な場合は事前に連絡
# プッシュ
git push
```

### 3. EC2環境へのデプロイ
```bash
# EC2にSSH接続
ssh -i bl-glasses-01.pem ec2-user@172.19.101.201

# 最新コードを取得
cd glasses-store
git pull

# 新しいマイグレーションがある場合は実行
# docker exec -i glasses_postgres psql -U glasses_user -d glasses_store_db < backend/database/migrations/xxx.sql

# アプリケーションを再起動（必要に応じて）
docker-compose restart backend frontend

# 動作確認
curl http://172.19.101.201:3000
```

### 4. 環境同期の確認
```bash
# 定期的に差分をチェック
./scripts/check-db-diff.sh
```

## データベース変更時の必須作業

### ❌ やってはいけないこと
- ローカルで`ALTER TABLE`などを実行してschema.sqlを更新しない
- EC2で手動変更してローカルに反映しない
- マイグレーションファイルを作成しない

### ✅ 正しい手順
1. **ローカルで変更実行**
2. **schema.sqlを更新**
3. **マイグレーションファイル作成**
4. **applied_migrations.mdを更新**
5. **Gitコミット・プッシュ**
6. **EC2でpull & マイグレーション実行**

## 緊急時の対応

### ローカルとEC2の差分が発生した場合
```bash
# 差分確認
./scripts/check-db-diff.sh

# 必要に応じてマイグレーション作成・適用
# ローカル → EC2への同期が基本方針
```

### ロールバックが必要な場合
```bash
# 前のコミットに戻す
git log --oneline
git revert <commit_id>

# データベースの場合は手動でロールバック用SQLを実行
```

## 注意事項
- **ネットワーク切り替えが必要なGitプッシュ時は事前に連絡**
- **本番データは絶対に削除しない**
- **スキーマ変更は必ず段階的に実行**
- **バックアップは定期的に取得**