#!/bin/bash

# データベース環境差分チェックスクリプト
# ローカルとEC2のデータベーススキーマの差分を確認

echo "==================================="
echo "データベース環境差分チェック"
echo "==================================="

# 色付け用の定数
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ローカル環境のテーブル一覧を取得
echo -e "\n${YELLOW}ローカル環境のテーブル一覧を取得中...${NC}"
docker exec glasses_postgres psql -U glasses_user -d glasses_store_db -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" > /tmp/local_tables.txt

# EC2環境のテーブル一覧を取得
echo -e "${YELLOW}EC2環境のテーブル一覧を取得中...${NC}"
ssh -i bl-glasses-01.pem ec2-user@172.19.101.201 "docker exec glasses_postgres psql -U glasses_user -d glasses_store_db -t -c \"SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;\"" > /tmp/ec2_tables.txt

# 差分を表示
echo -e "\n${GREEN}=== テーブルの差分 ===${NC}"
echo -e "${YELLOW}ローカルのみに存在:${NC}"
comm -23 <(sort /tmp/local_tables.txt) <(sort /tmp/ec2_tables.txt)

echo -e "\n${YELLOW}EC2のみに存在:${NC}"
comm -13 <(sort /tmp/local_tables.txt) <(sort /tmp/ec2_tables.txt)

# ENUMの値を比較
echo -e "\n${GREEN}=== order_status ENUMの値 ===${NC}"
echo -e "${YELLOW}ローカル:${NC}"
docker exec glasses_postgres psql -U glasses_user -d glasses_store_db -t -c "SELECT enum_range(NULL::order_status);"

echo -e "\n${YELLOW}EC2:${NC}"
ssh -i bl-glasses-01.pem ec2-user@172.19.101.201 "docker exec glasses_postgres psql -U glasses_user -d glasses_store_db -t -c \"SELECT enum_range(NULL::order_status);\""

# テーブル数の比較
LOCAL_COUNT=$(cat /tmp/local_tables.txt | wc -l)
EC2_COUNT=$(cat /tmp/ec2_tables.txt | wc -l)

echo -e "\n${GREEN}=== テーブル数 ===${NC}"
echo -e "ローカル: ${LOCAL_COUNT} テーブル"
echo -e "EC2: ${EC2_COUNT} テーブル"

if [ $LOCAL_COUNT -eq $EC2_COUNT ]; then
    echo -e "${GREEN}✓ テーブル数は一致しています${NC}"
else
    echo -e "${RED}✗ テーブル数に差異があります！${NC}"
fi

echo -e "\n${YELLOW}詳細な差分を確認する場合は、applied_migrations.md を参照してください${NC}"