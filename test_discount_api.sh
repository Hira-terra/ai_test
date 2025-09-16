#!/bin/bash

# 値引きAPIテストスクリプト

# ログイン
echo "ログイン中..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userCode":"manager001","password":"password","storeCode":"STORE001"}')

# トークン抽出
TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "ログイン失敗"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "ログイン成功"
echo ""

# 値引きマスタ一覧取得
echo "値引きマスタ一覧取得中..."
DISCOUNT_RESPONSE=$(curl -s -X GET http://localhost:3001/api/discounts/master \
  -H "Authorization: Bearer $TOKEN")

echo "レスポンス:"
echo $DISCOUNT_RESPONSE | python3 -m json.tool

# 成功確認
SUCCESS=$(echo $DISCOUNT_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('success', False))")
if [ "$SUCCESS" = "True" ]; then
  TOTAL=$(echo $DISCOUNT_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('total', 0))")
  echo ""
  echo "✅ 値引きマスタ取得成功: $TOTAL 件"
else
  echo ""
  echo "❌ 値引きマスタ取得失敗"
fi