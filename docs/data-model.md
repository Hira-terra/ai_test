# 眼鏡店顧客管理システム データモデル設計書

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 設計中  

## 1. エンティティ関連図（ER図）

### 1.1 コアエンティティ関係

```
Store (店舗)
├── User (ユーザー) [1:N]
├── Customer (顧客) [M:N] ※全店舗共通
├── Frame (フレーム在庫) [1:N]
├── StockItem (数量在庫) [1:N]
├── Order (受注) [1:N]
└── CashRegister (レジ) [1:N]

Customer (顧客) 
├── Prescription (処方箋) [1:N]
├── Order (受注) [1:N]
├── CustomerImage (顧客画像) [1:N]
└── CustomerMemo (顧客メモ) [1:N]

Order (受注)
├── OrderItem (受注明細) [1:N]
├── Payment (入金) [1:N]
└── CashTransaction (現金取引) [1:1]

Product (商品)
├── Frame (フレーム) [1:N]
├── StockItem (在庫商品) [1:N]
└── OrderItem (受注明細) [1:N]

CashRegister (レジ)
└── CashTransaction (現金取引) [1:N]

CustomerImage (顧客画像)
└── ImageAnnotation (画像注釈) [1:N]
```

### 1.2 データフロー概要

1. **顧客管理フロー**: Customer → Prescription → Order → Payment
2. **在庫管理フロー**: Product → Frame/StockItem → OrderItem
3. **売上計上フロー**: Order → CashTransaction → CashRegister
4. **画像管理フロー**: CustomerImage → ImageAnnotation

## 2. 詳細エンティティ定義

### 2.1 基本マスタエンティティ

#### Store（店舗）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 店舗ID（主キー） |
| store_code | VARCHAR(10) | ✓ | 店舗コード（ユニーク） |
| name | VARCHAR(100) | ✓ | 店舗名 |
| address | TEXT | ✓ | 住所 |
| phone | VARCHAR(20) |  | 電話番号 |
| manager_name | VARCHAR(50) |  | 店長名 |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### User（ユーザー）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | ユーザーID（主キー） |
| store_id | UUID | ✓ | 店舗ID（外部キー） |
| user_code | VARCHAR(20) | ✓ | ユーザーコード（ユニーク） |
| name | VARCHAR(50) | ✓ | 氏名 |
| email | VARCHAR(100) |  | メールアドレス |
| password_hash | VARCHAR(255) | ✓ | パスワードハッシュ |
| role | ENUM | ✓ | 権限（staff/manager/admin） |
| is_active | BOOLEAN | ✓ | 有効フラグ |
| last_login_at | TIMESTAMP |  | 最終ログイン日時 |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### Product（商品）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 商品ID（主キー） |
| product_code | VARCHAR(30) | ✓ | 商品コード（ユニーク） |
| name | VARCHAR(100) | ✓ | 商品名 |
| brand | VARCHAR(50) |  | ブランド名 |
| category | ENUM | ✓ | 商品カテゴリ（frame/lens/contact/accessory） |
| management_type | ENUM | ✓ | 管理タイプ（individual/quantity） |
| cost_price | DECIMAL(10,2) |  | 原価（権限制御対象） |
| retail_price | DECIMAL(10,2) | ✓ | 販売価格 |
| supplier | VARCHAR(100) |  | 仕入先 |
| is_active | BOOLEAN | ✓ | 販売可能フラグ |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

### 2.2 顧客関連エンティティ

#### Customer（顧客）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 顧客ID（主キー） |
| customer_code | VARCHAR(20) | ✓ | 顧客コード（ユニーク） |
| last_name | VARCHAR(50) | ✓ | 姓 |
| first_name | VARCHAR(50) | ✓ | 名 |
| last_name_kana | VARCHAR(50) |  | 姓（カナ） |
| first_name_kana | VARCHAR(50) |  | 名（カナ） |
| gender | ENUM |  | 性別（male/female/other） |
| birth_date | DATE |  | 生年月日 |
| phone | VARCHAR(20) |  | 電話番号 |
| mobile | VARCHAR(20) |  | 携帯番号 |
| email | VARCHAR(100) |  | メールアドレス |
| postal_code | VARCHAR(10) |  | 郵便番号 |
| address | TEXT |  | 住所 |
| first_visit_date | DATE |  | 初回来店日 |
| last_visit_date | DATE |  | 最終来店日 |
| visit_count | INTEGER | ✓ | 来店回数（デフォルト0） |
| total_purchase_amount | DECIMAL(12,2) | ✓ | 累計購入額（デフォルト0） |
| notes | TEXT |  | 特記事項 |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### Prescription（処方箋）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 処方箋ID（主キー） |
| customer_id | UUID | ✓ | 顧客ID（外部キー） |
| measured_date | DATE | ✓ | 測定日 |
| right_eye_sphere | DECIMAL(4,2) |  | 右眼球面度数 |
| right_eye_cylinder | DECIMAL(4,2) |  | 右眼円柱度数 |
| right_eye_axis | INTEGER |  | 右眼軸度 |
| right_eye_vision | DECIMAL(3,1) |  | 右眼矯正視力 |
| left_eye_sphere | DECIMAL(4,2) |  | 左眼球面度数 |
| left_eye_cylinder | DECIMAL(4,2) |  | 左眼円柱度数 |
| left_eye_axis | INTEGER |  | 左眼軸度 |
| left_eye_vision | DECIMAL(3,1) |  | 左眼矯正視力 |
| pupil_distance | DECIMAL(4,1) |  | 瞳孔間距離 |
| notes | TEXT |  | 備考 |
| created_by | UUID | ✓ | 測定者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |

#### CustomerImage（顧客画像）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 画像ID（主キー） |
| customer_id | UUID | ✓ | 顧客ID（外部キー） |
| file_name | VARCHAR(255) | ✓ | ファイル名 |
| file_path | VARCHAR(500) | ✓ | ファイルパス |
| file_size | INTEGER | ✓ | ファイルサイズ（バイト） |
| mime_type | VARCHAR(50) | ✓ | MIMEタイプ |
| image_type | ENUM | ✓ | 画像タイプ（face/glasses/prescription/other） |
| title | VARCHAR(100) |  | タイトル |
| description | TEXT |  | 説明 |
| captured_date | DATE |  | 撮影日 |
| uploaded_by | UUID | ✓ | アップロード者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |

#### ImageAnnotation（画像注釈）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 注釈ID（主キー） |
| customer_image_id | UUID | ✓ | 顧客画像ID（外部キー） |
| annotation_data | JSON | ✓ | 注釈データ（Fabric.js形式） |
| version | INTEGER | ✓ | バージョン（楽観的排他制御） |
| created_by | UUID | ✓ | 作成者ID（外部キー） |
| updated_by | UUID | ✓ | 更新者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### CustomerMemo（顧客メモ）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | メモID（主キー） |
| customer_id | UUID | ✓ | 顧客ID（外部キー） |
| memo_text | TEXT | ✓ | メモ内容 |
| memo_type | ENUM | ✓ | メモタイプ（handwritten/text） |
| created_by | UUID | ✓ | 作成者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |

### 2.3 受注・売上関連エンティティ

#### Order（受注）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 受注ID（主キー） |
| order_number | VARCHAR(30) | ✓ | 受注番号（ユニーク） |
| customer_id | UUID | ✓ | 顧客ID（外部キー） |
| store_id | UUID | ✓ | 店舗ID（外部キー） |
| order_date | DATE | ✓ | 受注日 |
| delivery_date | DATE |  | 納品予定日 |
| status | ENUM | ✓ | ステータス（ordered/in_production/ready/delivered/cancelled） |
| subtotal_amount | DECIMAL(10,2) | ✓ | 小計金額 |
| tax_amount | DECIMAL(10,2) | ✓ | 税額 |
| total_amount | DECIMAL(10,2) | ✓ | 総額 |
| paid_amount | DECIMAL(10,2) | ✓ | 入金済額（デフォルト0） |
| balance_amount | DECIMAL(10,2) | ✓ | 売掛残高 |
| payment_method | ENUM | ✓ | 支払方法（cash/credit/electronic/receivable） |
| notes | TEXT |  | 備考 |
| created_by | UUID | ✓ | 受注者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### OrderItem（受注明細）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 受注明細ID（主キー） |
| order_id | UUID | ✓ | 受注ID（外部キー） |
| product_id | UUID | ✓ | 商品ID（外部キー） |
| frame_id | UUID |  | フレームID（外部キー、個品管理の場合） |
| quantity | INTEGER | ✓ | 数量 |
| unit_price | DECIMAL(10,2) | ✓ | 単価 |
| total_price | DECIMAL(10,2) | ✓ | 小計 |
| prescription_id | UUID |  | 処方箋ID（外部キー、度付きの場合） |
| notes | TEXT |  | 明細備考 |

#### Payment（入金）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 入金ID（主キー） |
| order_id | UUID | ✓ | 受注ID（外部キー） |
| payment_date | DATE | ✓ | 入金日 |
| payment_amount | DECIMAL(10,2) | ✓ | 入金額 |
| payment_method | ENUM | ✓ | 入金方法（cash/credit/electronic/bank_transfer） |
| notes | TEXT |  | 備考 |
| created_by | UUID | ✓ | 記録者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |

### 2.4 在庫管理エンティティ

#### Frame（フレーム）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | フレームID（主キー） |
| product_id | UUID | ✓ | 商品ID（外部キー） |
| store_id | UUID | ✓ | 現在店舗ID（外部キー） |
| serial_number | VARCHAR(50) | ✓ | 個品番号（ユニーク） |
| color | VARCHAR(30) |  | カラー |
| size | VARCHAR(20) |  | サイズ |
| purchase_date | DATE | ✓ | 仕入日 |
| purchase_price | DECIMAL(10,2) |  | 仕入価格 |
| status | ENUM | ✓ | 状態（in_stock/reserved/sold/damaged/transferred） |
| location | VARCHAR(50) |  | 保管場所 |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### StockItem（在庫商品）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 在庫商品ID（主キー） |
| product_id | UUID | ✓ | 商品ID（外部キー） |
| store_id | UUID | ✓ | 店舗ID（外部キー） |
| current_stock | INTEGER | ✓ | 現在庫数 |
| min_stock | INTEGER | ✓ | 発注点 |
| max_stock | INTEGER |  | 最大在庫数 |
| last_updated | TIMESTAMP | ✓ | 最終更新日時 |

### 2.5 レジ精算関連エンティティ

#### CashRegister（レジ）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | レジID（主キー） |
| store_id | UUID | ✓ | 店舗ID（外部キー） |
| business_date | DATE | ✓ | 営業日 |
| opening_cash | DECIMAL(10,2) | ✓ | 釣銭準備金 |
| carry_over | DECIMAL(10,2) | ✓ | 前日繰越金（デフォルト0） |
| cash_sales | DECIMAL(10,2) | ✓ | 現金売上（デフォルト0） |
| credit_sales | DECIMAL(10,2) | ✓ | クレジット売上（デフォルト0） |
| electronic_sales | DECIMAL(10,2) | ✓ | 電子マネー売上（デフォルト0） |
| receivable_collection | DECIMAL(10,2) | ✓ | 売掛回収（デフォルト0） |
| expected_cash | DECIMAL(10,2) | ✓ | 現金予定額（計算値） |
| actual_cash | DECIMAL(10,2) |  | 実査現金額 |
| difference | DECIMAL(10,2) |  | 過不足金額 |
| difference_reason | TEXT |  | 差異理由 |
| status | ENUM | ✓ | 状態（closed/opened/settled） |
| opened_at | TIMESTAMP |  | 開設日時 |
| opened_by | UUID |  | 開設者ID（外部キー） |
| settled_at | TIMESTAMP |  | 精算日時 |
| settled_by | UUID |  | 精算者ID（外部キー） |
| approved_by | UUID |  | 承認者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |
| updated_at | TIMESTAMP | ✓ | 更新日時 |

#### CashTransaction（現金取引）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 現金取引ID（主キー） |
| cash_register_id | UUID | ✓ | レジID（外部キー） |
| order_id | UUID |  | 受注ID（外部キー、売上の場合） |
| transaction_type | ENUM | ✓ | 取引種別（sales/collection/expense/adjustment） |
| payment_method | ENUM | ✓ | 支払方法（cash/credit/electronic） |
| amount | DECIMAL(10,2) | ✓ | 金額 |
| description | VARCHAR(100) |  | 摘要 |
| created_by | UUID | ✓ | 記録者ID（外部キー） |
| created_at | TIMESTAMP | ✓ | 作成日時 |

#### CashDenomination（金種実査）
| 属性名 | 型 | 必須 | 説明 |
|-------|---|------|-----|
| id | UUID | ✓ | 金種実査ID（主キー） |
| cash_register_id | UUID | ✓ | レジID（外部キー） |
| denomination | INTEGER | ✓ | 金種（10000/5000/2000/1000/500/100/50/10/5/1） |
| count | INTEGER | ✓ | 枚数 |
| amount | DECIMAL(10,2) | ✓ | 金額 |

## 3. インデックス設計

### 3.1 プライマリインデックス
- 全テーブルのid（UUID）にクラスタードインデックス

### 3.2 ユニークインデックス
- Store: store_code
- User: user_code
- Product: product_code
- Customer: customer_code
- Order: order_number
- Frame: serial_number

### 3.3 検索用インデックス
- Customer: (last_name, first_name), (last_name_kana, first_name_kana), phone, mobile
- Order: (store_id, order_date), (customer_id, order_date)
- Prescription: (customer_id, measured_date)
- CashRegister: (store_id, business_date)
- Frame: (store_id, status), (product_id, status)

## 4. データ整合性制約

### 4.1 外部キー制約
- 全ての外部キー参照にCASCADE DELETE/UPDATE制約
- ただし、Order → Customer は RESTRICT（顧客削除を制限）

### 4.2 チェック制約
- 金額フィールド: >= 0
- 数量フィールド: >= 0
- 度数フィールド: -20.00 ≤ value ≤ +20.00
- メールアドレス: 正規表現チェック

### 4.3 トリガー制約
- Customer.visit_count, total_purchase_amount の自動更新
- Order作成時のCashTransaction自動生成
- 在庫数の自動更新

## 5. セキュリティ考慮事項

### 5.1 権限制御
- Product.cost_price: admin権限のみ参照可能
- User.password_hash: 暗号化必須（bcrypt推奨）
- 顧客個人情報: 適切なアクセス制御

### 5.2 データ暗号化
- 顧客個人情報（住所、電話番号等）の暗号化検討
- 画像データの安全な保存

### 5.3 監査ログ
- 重要な操作（顧客情報変更、売上計上等）の監査ログ
- ログイン・ログアウトの記録

## 6. パフォーマンス考慮事項

### 6.1 パーティション設計
- Order, CashRegister: 営業日による月次パーティション
- CashTransaction: 営業日による月次パーティション

### 6.2 アーカイブ戦略
- 3年以上前のデータの別ストレージへの移行
- 画像データの階層ストレージ管理

### 6.3 読み取り専用レプリカ
- 分析用クエリ専用のレプリカDB構築検討