# データベースマイグレーション管理

## 概要
このディレクトリには、データベーススキーマの変更履歴を管理するマイグレーションファイルを格納します。

## マイグレーションファイルの命名規則
```
{番号}_{変更内容の簡潔な説明}.sql
```

例：
- `001_add_order_status_values.sql`
- `002_create_stock_tables.sql`

## 実行方法

### ローカル環境での実行
```bash
cd backend/database
psql -U glasses_user -d glasses_store_db -f migrations/001_add_order_status_values.sql
```

### EC2環境での実行
```bash
ssh -i bl-glasses-01.pem ec2-user@172.19.101.201
cd glasses-store/backend/database
docker exec -i glasses_postgres psql -U glasses_user -d glasses_store_db < migrations/001_add_order_status_values.sql
```

## 重要な注意事項

1. **新しい変更を行う場合**
   - 必ず新しいマイグレーションファイルを作成
   - schema.sqlも同時に更新
   - 両方をGitにコミット

2. **環境の同期**
   - ローカルで変更 → マイグレーションファイル作成 → Git push → EC2でpull → マイグレーション実行

3. **適用済みマイグレーションの追跡**
   - applied_migrations.md で各環境の適用状況を管理

## 適用状況の確認方法

```sql
-- ENUMの値を確認
SELECT enum_range(NULL::order_status);

-- テーブル一覧を確認
\dt

-- 特定テーブルの構造を確認
\d table_name
```