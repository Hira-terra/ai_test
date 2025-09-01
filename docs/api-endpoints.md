# API エンドポイント仕様書

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 設計中  

## 1. 認証・認可

### 1.1 認証エンドポイント

#### POST /api/auth/login
ユーザーログイン

**リクエスト**:
```json
{
  "user_code": "staff001",
  "password": "password123",
  "store_code": "STORE001"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "田中太郎",
      "role": "staff",
      "store": {
        "id": "uuid",
        "name": "新宿本店",
        "code": "STORE001"
      }
    },
    "token": "jwt_token_here",
    "expires_in": 3600
  }
}
```

#### POST /api/auth/logout
ログアウト

#### POST /api/auth/refresh
トークンリフレッシュ

## 2. 顧客管理API

### 2.1 顧客検索・一覧

#### GET /api/customers
顧客一覧取得・検索

**クエリパラメータ**:
- `search`: 検索キーワード（名前、カナ、電話番号）
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 20）
- `sort`: ソート順（name/kana/last_visit_date）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "customer_code": "C-00001",
        "full_name": "山田太郎",
        "full_name_kana": "ヤマダタロウ",
        "phone": "090-1234-5678",
        "last_visit_date": "2024-07-15",
        "visit_count": 8,
        "total_purchase_amount": 126500
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### 2.2 顧客詳細

#### GET /api/customers/:id
顧客詳細取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "uuid",
      "customer_code": "C-00001",
      "last_name": "山田",
      "first_name": "太郎",
      "last_name_kana": "ヤマダ",
      "first_name_kana": "タロウ",
      "gender": "male",
      "birth_date": "1980-05-15",
      "age": 44,
      "phone": "03-1234-5678",
      "mobile": "090-1234-5678",
      "email": "yamada@example.com",
      "postal_code": "160-0023",
      "address": "東京都新宿区西新宿1-1-1",
      "first_visit_date": "2022-03-10",
      "last_visit_date": "2024-07-15",
      "visit_count": 8,
      "total_purchase_amount": 126500,
      "notes": "特記事項"
    },
    "latest_prescription": {
      "id": "uuid",
      "measured_date": "2024-07-15",
      "right_eye_sphere": -2.50,
      "right_eye_cylinder": -0.75,
      "right_eye_axis": 90,
      "right_eye_vision": 1.2,
      "left_eye_sphere": -2.25,
      "left_eye_cylinder": -1.00,
      "left_eye_axis": 85,
      "left_eye_vision": 1.0,
      "pupil_distance": 62.0
    }
  }
}
```

#### PUT /api/customers/:id
顧客情報更新

### 2.3 処方箋管理

#### GET /api/customers/:id/prescriptions
顧客の処方箋履歴取得

#### POST /api/customers/:id/prescriptions
新規処方箋登録

#### GET /api/prescriptions/:id
処方箋詳細取得

#### PUT /api/prescriptions/:id
処方箋更新

### 2.4 顧客画像管理

#### GET /api/customers/:id/images
顧客画像一覧取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "uuid",
        "file_name": "customer_photo.jpg",
        "file_path": "/uploads/customers/uuid/customer_photo.jpg",
        "image_type": "face",
        "title": "顔写真",
        "captured_date": "2024-07-15",
        "has_annotations": true
      }
    ]
  }
}
```

#### POST /api/customers/:id/images
顧客画像アップロード

**リクエスト**: multipart/form-data
- `file`: 画像ファイル
- `image_type`: 画像タイプ（face/glasses/prescription/other）
- `title`: タイトル
- `description`: 説明

#### DELETE /api/customers/:id/images/:imageId
顧客画像削除

#### GET /api/customers/:id/images/:imageId/annotations
画像注釈取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "annotation": {
      "id": "uuid",
      "annotation_data": {
        "version": "5.3.0",
        "objects": []
      },
      "version": 3,
      "updated_at": "2024-07-15T10:30:00Z"
    }
  }
}
```

#### PUT /api/customers/:id/images/:imageId/annotations
画像注釈更新

**リクエスト**:
```json
{
  "annotation_data": {
    "version": "5.3.0",
    "objects": []
  },
  "version": 3
}
```

### 2.5 顧客メモ管理

#### GET /api/customers/:id/memos
顧客メモ一覧取得

#### POST /api/customers/:id/memos
顧客メモ追加

#### PUT /api/customers/:id/memos/:memoId
顧客メモ更新

#### DELETE /api/customers/:id/memos/:memoId
顧客メモ削除

## 3. 受注管理API

### 3.1 受注CRUD

#### GET /api/orders
受注一覧取得

**クエリパラメータ**:
- `status`: ステータスフィルタ
- `customer_id`: 顧客IDフィルタ
- `start_date`, `end_date`: 受注日期間フィルタ
- `page`, `limit`: ページネーション

#### GET /api/orders/:id
受注詳細取得

#### POST /api/orders
新規受注作成

**リクエスト**:
```json
{
  "customer_id": "uuid",
  "order_date": "2024-07-15",
  "delivery_date": "2024-07-22",
  "payment_method": "cash",
  "items": [
    {
      "product_id": "uuid",
      "frame_id": "uuid",
      "quantity": 1,
      "unit_price": 45800,
      "prescription_id": "uuid",
      "notes": "遠近両用レンズ"
    }
  ],
  "notes": "受注備考"
}
```

#### PUT /api/orders/:id
受注更新

#### DELETE /api/orders/:id
受注キャンセル

### 3.2 入金管理

#### GET /api/orders/:id/payments
受注の入金履歴取得

#### POST /api/orders/:id/payments
入金記録

## 4. 在庫管理API

### 4.1 フレーム在庫（個品管理）

#### GET /api/inventory/frames
フレーム在庫一覧取得

**クエリパラメータ**:
- `store_id`: 店舗IDフィルタ
- `product_id`: 商品IDフィルタ
- `status`: 在庫ステータス
- `serial_number`: 個品番号検索

#### GET /api/inventory/frames/:serialNumber
個品情報取得

#### PUT /api/inventory/frames/:serialNumber/status
フレーム状態更新

**リクエスト**:
```json
{
  "status": "sold",
  "notes": "販売済み"
}
```

### 4.2 数量在庫管理

#### GET /api/inventory/products
数量管理商品在庫一覧取得

#### PUT /api/inventory/products/:id/stock
在庫数更新

## 5. レジ精算API

### 5.1 レジ状態管理

#### GET /api/cash-register/status
本日のレジ状態取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "register": {
      "id": "uuid",
      "business_date": "2025-08-08",
      "status": "opened",
      "opening_cash": 50000,
      "expected_cash": 207800,
      "opened_at": "2025-08-08T09:00:00Z",
      "opened_by": "田中太郎"
    }
  }
}
```

#### POST /api/cash-register/open
レジ開設

**リクエスト**:
```json
{
  "opening_cash": 50000,
  "carry_over": 0
}
```

#### POST /api/cash-register/close
レジ精算

**リクエスト**:
```json
{
  "actual_cash": 207800,
  "denominations": [
    {"denomination": 10000, "count": 10},
    {"denomination": 5000, "count": 8},
    {"denomination": 1000, "count": 67},
    {"denomination": 500, "count": 1},
    {"denomination": 100, "count": 3}
  ],
  "difference_reason": "差異理由（過不足がある場合）",
  "approver_password": "店長パスワード"
}
```

### 5.2 売上集計

#### GET /api/cash-register/sales-summary
本日の売上集計取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "business_date": "2025-08-08",
      "cash_sales": 125800,
      "credit_sales": 238600,
      "electronic_sales": 45200,
      "receivable_collection": 32000,
      "total_sales": 441600,
      "order_count": 15
    }
  }
}
```

### 5.3 レポート

#### GET /api/cash-register/report/:date
精算レポート取得

## 6. 商品・マスタ管理API

### 6.1 商品マスタ

#### GET /api/products
商品一覧取得

#### GET /api/products/:id
商品詳細取得

#### POST /api/products
商品登録（admin権限必要）

#### PUT /api/products/:id
商品更新（admin権限必要）

### 6.2 店舗マスタ

#### GET /api/stores
店舗一覧取得

#### GET /api/stores/:id
店舗詳細取得

### 6.3 ユーザー管理

#### GET /api/users
ユーザー一覧取得（manager権限以上）

#### POST /api/users
ユーザー登録（admin権限必要）

#### PUT /api/users/:id
ユーザー情報更新

## 7. 分析・レポートAPI

### 7.1 売上分析

#### GET /api/analytics/sales
売上分析データ取得

**クエリパラメータ**:
- `start_date`, `end_date`: 期間指定
- `store_id`: 店舗指定（本部権限の場合）
- `group_by`: グループ化（daily/weekly/monthly）

#### GET /api/analytics/customers
顧客分析データ取得

### 7.2 在庫分析

#### GET /api/analytics/inventory
在庫分析データ取得

## 8. ファイルアップロード

#### POST /api/upload/image
画像アップロード

**制限**:
- ファイルサイズ: 最大10MB
- 対応形式: JPEG, PNG, GIF
- ファイル名: UUID + 拡張子で自動生成

## 9. エラーレスポンス形式

### 9.1 標準エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値に誤りがあります",
    "details": {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    }
  }
}
```

### 9.2 エラーコード一覧

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| VALIDATION_ERROR | バリデーションエラー | 400 |
| AUTHENTICATION_REQUIRED | 認証が必要 | 401 |
| AUTHORIZATION_FAILED | 権限不足 | 403 |
| RESOURCE_NOT_FOUND | リソースが見つからない | 404 |
| CONFLICT | データの競合 | 409 |
| INTERNAL_SERVER_ERROR | サーバー内部エラー | 500 |

## 10. レスポンス共通仕様

### 10.1 成功レスポンス

```json
{
  "success": true,
  "data": {
    // 実際のデータ
  },
  "meta": {
    // メタ情報（ページネーションなど）
  }
}
```

### 10.2 ページネーション

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

## 11. 認証・認可仕様

### 11.1 JWT トークン

- Header: Authorization: Bearer {token}
- 有効期限: 1時間
- リフレッシュトークン: 30日

### 11.2 権限レベル

| 権限 | 説明 | アクセス可能な機能 |
|------|------|------------------|
| staff | 一般スタッフ | 顧客管理、受注、在庫参照、レジ精算 |
| manager | 店長 | staff権限 + 店舗分析、売上レポート |
| admin | 本部管理者 | 全権限 + マスタ管理、全店舗データ |

### 11.3 セキュリティ考慮事項

- パスワードハッシュ化（bcrypt）
- 原価情報の権限制御
- ファイルアップロード時のウイルスチェック
- SQLインジェクション対策
- XSS対策（入力値のサニタイズ）
- CORS設定
- レート制限（API呼び出し回数制限）

## 12. パフォーマンス考慮事項

### 12.1 キャッシュ戦略

- 商品マスタ: 1時間キャッシュ
- ユーザー情報: 30分キャッシュ
- 在庫情報: リアルタイム（キャッシュなし）

### 12.2 最適化

- 顧客検索: インデックス活用
- 画像配信: CDN活用
- 大量データ取得: 非同期処理
- データベース接続プーリング