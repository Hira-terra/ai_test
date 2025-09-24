#!/bin/bash

# Elastic Beanstalk デプロイスクリプト
# 眼鏡店管理システム用

set -e

echo "=== Elastic Beanstalk 手動デプロイ開始 ==="

# AWS認証情報設定
export AWS_ACCESS_KEY_ID="[YOUR_ACCESS_KEY_ID]"
export AWS_SECRET_ACCESS_KEY="[YOUR_SECRET_ACCESS_KEY]"
export AWS_DEFAULT_REGION="ap-northeast-1"

# 設定値
APP_NAME="bl-glasses-01"
ENV_NAME="Bl-glasses-01-env"
S3_BUCKET="elasticbeanstalk-ap-northeast-1-527068389645"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="glasses-store-${TIMESTAMP}.zip"

echo "📦 デプロイアーカイブ作成中..."

# 不要ファイルを除外してアーカイブ作成
zip -r "${ARCHIVE_NAME}" . \
  -x "node_modules/*" \
  -x ".git/*" \
  -x "*.log" \
  -x "tmp/*" \
  -x ".env*" \
  -x "logs/*" \
  -x "uploads/*" \
  -x "backups/*" \
  -x "certs/*" \
  -x "__pycache__/*" \
  -x "*.pyc" \
  -x ".pytest_cache/*" \
  -x "coverage/*" \
  -x ".nyc_output/*"

echo "✅ アーカイブ作成完了: ${ARCHIVE_NAME}"

# S3へアップロード
echo "☁️ S3へアップロード中..."
aws s3 cp "${ARCHIVE_NAME}" "s3://${S3_BUCKET}/${ARCHIVE_NAME}"
echo "✅ S3アップロード完了"

# アプリケーションバージョン作成
echo "📋 アプリケーションバージョン作成中..."
aws elasticbeanstalk create-application-version \
  --application-name "${APP_NAME}" \
  --version-label "${TIMESTAMP}" \
  --source-bundle S3Bucket="${S3_BUCKET}",S3Key="${ARCHIVE_NAME}" \
  --description "眼鏡店管理システム デプロイ ${TIMESTAMP}"

echo "✅ アプリケーションバージョン作成完了"

# 現在の環境状態確認
echo "🔍 現在の環境状態確認中..."
CURRENT_STATUS=$(aws elasticbeanstalk describe-environments \
  --application-name "${APP_NAME}" \
  --environment-names "${ENV_NAME}" \
  --query 'Environments[0].Status' --output text)

echo "現在のステータス: ${CURRENT_STATUS}"

if [ "${CURRENT_STATUS}" != "Ready" ]; then
    echo "⚠️ 環境が更新可能な状態ではありません。しばらく待ってから再実行してください。"
    exit 1
fi

# 環境更新
echo "🚀 環境更新開始..."
aws elasticbeanstalk update-environment \
  --application-name "${APP_NAME}" \
  --environment-name "${ENV_NAME}" \
  --version-label "${TIMESTAMP}"

echo "✅ 環境更新要求送信完了"

# デプロイ完了待機
echo "⏳ デプロイ完了を待機中..."
WAIT_COUNT=0
MAX_WAIT=30  # 最大10分待機

while [ ${WAIT_COUNT} -lt ${MAX_WAIT} ]; do
    sleep 20
    WAIT_COUNT=$((WAIT_COUNT + 1))
    
    STATUS=$(aws elasticbeanstalk describe-environments \
      --application-name "${APP_NAME}" \
      --environment-names "${ENV_NAME}" \
      --query 'Environments[0].Status' --output text)
    
    HEALTH=$(aws elasticbeanstalk describe-environments \
      --application-name "${APP_NAME}" \
      --environment-names "${ENV_NAME}" \
      --query 'Environments[0].Health' --output text)
    
    echo "進行状況 (${WAIT_COUNT}/${MAX_WAIT}): Status=${STATUS}, Health=${HEALTH}"
    
    if [ "${STATUS}" = "Ready" ]; then
        if [ "${HEALTH}" = "Ok" ] || [ "${HEALTH}" = "Warning" ]; then
            echo "✅ デプロイ完了"
            break
        fi
    elif [ "${STATUS}" = "Updating" ]; then
        echo "   デプロイ進行中..."
    else
        echo "❌ 予期しないステータス: ${STATUS}"
        echo "   EB コンソールでエラー詳細を確認してください"
        exit 1
    fi
    
    if [ ${WAIT_COUNT} -eq ${MAX_WAIT} ]; then
        echo "❌ デプロイがタイムアウトしました"
        echo "   EB コンソールで状況を確認してください"
        exit 1
    fi
done

# ヘルスチェック実行
echo "🔍 ヘルスチェック実行中..."
EB_URL="http://bl-glasses-01-env.eba-paavtara.ap-northeast-1.elasticbeanstalk.com"

# サービス起動待機
echo "   サービス起動待機中..."
sleep 60

# ヘルスエンドポイント確認
echo "   ヘルスエンドポイント確認..."
if curl -f "${EB_URL}/health" > /dev/null 2>&1; then
    echo "   ✅ ヘルスエンドポイント: OK"
else
    echo "   ⚠️ ヘルスエンドポイント: NG"
fi

# フロントエンド確認
echo "   フロントエンドアクセス確認..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${EB_URL}/")
if [ "${HTTP_STATUS}" = "200" ]; then
    echo "   ✅ フロントエンド: OK (Status: ${HTTP_STATUS})"
elif [ "${HTTP_STATUS}" = "502" ] || [ "${HTTP_STATUS}" = "503" ]; then
    echo "   ⚠️ フロントエンド: サービス起動中... (Status: ${HTTP_STATUS})"
    echo "   数分後に再度アクセスしてください"
else
    echo "   ⚠️ フロントエンド: Status ${HTTP_STATUS}"
fi

# API確認
echo "   API エンドポイント確認..."
if curl -f "${EB_URL}/api/stores" > /dev/null 2>&1; then
    echo "   ✅ API エンドポイント: OK"
else
    echo "   ⚠️ API エンドポイント: NG または起動中"
fi

# 一時ファイル削除
rm -f "${ARCHIVE_NAME}"

# 完了レポート
echo ""
echo "=== デプロイ完了レポート ==="
echo "📅 デプロイ日時: $(date)"
echo "🏷️ バージョンラベル: ${TIMESTAMP}"
echo "🌐 アプリケーションURL: ${EB_URL}"
echo "👤 ログイン情報:"
echo "   ユーザーコード: manager001"
echo "   パスワード: password"
echo "   店舗コード: STORE001"
echo ""
echo "📋 管理画面URL:"
echo "   Elastic Beanstalk コンソール:"
echo "   https://ap-northeast-1.console.aws.amazon.com/elasticbeanstalk/home?region=ap-northeast-1#/environment/dashboard?applicationName=${APP_NAME}&environmentId="
echo ""

# 最終環境状態表示
FINAL_STATUS=$(aws elasticbeanstalk describe-environments \
  --application-name "${APP_NAME}" \
  --environment-names "${ENV_NAME}" \
  --query 'Environments[0].Status' --output text)

FINAL_HEALTH=$(aws elasticbeanstalk describe-environments \
  --application-name "${APP_NAME}" \
  --environment-names "${ENV_NAME}" \
  --query 'Environments[0].Health' --output text)

echo "🏥 最終ステータス: ${FINAL_STATUS}"
echo "💚 最終ヘルス: ${FINAL_HEALTH}"

if [ "${FINAL_STATUS}" = "Ready" ] && ([ "${FINAL_HEALTH}" = "Ok" ] || [ "${FINAL_HEALTH}" = "Warning" ]); then
    echo ""
    echo "🎉 デプロイ成功！"
    echo "   ブラウザで ${EB_URL} にアクセスして動作確認してください。"
    exit 0
else
    echo ""
    echo "⚠️ デプロイは完了しましたが、ヘルスチェックに問題があります。"
    echo "   Elastic Beanstalk コンソールでログを確認してください。"
    exit 1
fi