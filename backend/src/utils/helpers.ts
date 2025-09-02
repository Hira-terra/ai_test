/**
 * ヘルパーユーティリティ関数
 * 全プロジェクトで共通利用される汎用関数を定義
 */

/**
 * オペレーションIDを生成する
 * ログ記録とトレーサビリティのための一意識別子を作成
 * 
 * @param operation - 操作名（例: 'getCustomers', 'createOrder'）
 * @returns 一意のオペレーションID
 */
export function generateOperationId(operation: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${operation}-${timestamp}-${randomSuffix}`;
}

/**
 * UUIDの形式バリデーション
 * 
 * @param uuid - チェックするUUID文字列
 * @returns 有効なUUIDかどうか
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * エラーメッセージの標準化
 * 
 * @param message - エラーメッセージ
 * @param operationId - オペレーションID
 * @param details - 追加詳細情報
 * @returns 標準化されたエラーオブジェクト
 */
export function createStandardError(
  message: string, 
  operationId?: string, 
  details?: any
): {
  success: false;
  message: string;
  operationId?: string;
  details?: any;
  timestamp: string;
} {
  return {
    success: false,
    message,
    operationId,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * 成功レスポンスの標準化
 * 
 * @param data - レスポンスデータ
 * @param message - 成功メッセージ
 * @param operationId - オペレーションID
 * @returns 標準化された成功レスポンス
 */
export function createStandardSuccess<T>(
  data: T, 
  message?: string, 
  operationId?: string
): {
  success: true;
  data: T;
  message?: string;
  operationId?: string;
  timestamp: string;
} {
  return {
    success: true,
    data,
    message,
    operationId,
    timestamp: new Date().toISOString()
  };
}