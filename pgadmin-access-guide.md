# pgAdmin アクセスガイド

## 📍 アクセス情報

### pgAdmin Web Interface
- **URL**: http://localhost:5050
- **Email**: admin@glasses.com
- **Password**: pgadmin123

## 🔗 PostgreSQL 接続情報

### データベース接続設定
- **Server Name**: 眼鏡店顧客管理システム - PostgreSQL
- **Host**: postgres (コンテナ名)
- **Port**: 5432
- **Database**: glasses_store_db
- **Username**: glasses_user
- **Password**: glasses_pass

## 📋 アクセス手順

### 1. pgAdminにログイン
1. ブラウザで http://localhost:5050 を開く
2. Email: `admin@glasses.com`
3. Password: `pgadmin123`
4. 「Login」ボタンをクリック

### 2. PostgreSQLサーバーに接続
1. 左側のサーバーツリーで「眼鏡店顧客管理システム - PostgreSQL」を展開
2. パスワードを求められた場合は `glasses_pass` を入力
3. データベース `glasses_store_db` を展開
4. `Schemas` > `public` > `Tables` でテーブル一覧を確認

## 🗃️ 主要テーブル

### 顧客管理関連
- `customers` - 顧客基本情報
- `prescriptions` - 処方箋データ
- `customer_images` - 顧客画像
- `customer_memos` - 顧客メモ

### 受注管理関連
- `orders` - 受注情報
- `order_items` - 受注明細

### マスタデータ
- `stores` - 店舗マスタ
- `users` - ユーザー（スタッフ）マスタ
- `products` - 商品マスタ
- `frames` - フレーム在庫

### システム管理
- `user_sessions` - ユーザーセッション
- `login_attempts` - ログイン試行履歴

## 🔍 便利なクエリ例

### 顧客数の確認
```sql
SELECT COUNT(*) FROM customers;
```

### 店舗別ユーザー数
```sql
SELECT s.name as store_name, COUNT(u.id) as user_count
FROM stores s
LEFT JOIN users u ON s.id = u.store_id
GROUP BY s.id, s.name
ORDER BY s.name;
```

### 最新の受注情報
```sql
SELECT 
    c.name as customer_name,
    o.total_amount,
    o.status,
    o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.id
ORDER BY o.created_at DESC
LIMIT 10;
```

## 🛠️ トラブルシューティング

### 接続できない場合
1. Docker コンテナが起動しているか確認: `docker-compose ps`
2. ポートが使用中でないか確認: `netstat -ln | grep 5050`
3. pgAdmin ログを確認: `docker logs glasses_pgadmin`

### パスワードを忘れた場合
1. `.env` ファイルで `PGADMIN_PASSWORD` を確認
2. pgAdminコンテナを再起動: `docker-compose restart pgadmin`

## 🚀 高度な機能

### バックアップ作成
1. データベースを右クリック → 「Backup...」
2. Format を「Custom」に設定
3. 「Backup」ボタンでダウンロード

### クエリ実行
1. データベースを右クリック → 「Query Tool」
2. SQLクエリを入力
3. F5 または「Execute」ボタンで実行