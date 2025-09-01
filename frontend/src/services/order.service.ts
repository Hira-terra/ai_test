// @MOCK_TO_API: 本番環境ではこのファイルを実API呼び出しに置き換え
import { mockOrderService } from './mock/order.service';

// @MOCK_TO_API: 開発環境ではモック、本番環境では実APIを使用
export const orderService = process.env.NODE_ENV === 'development' 
  ? mockOrderService 
  : mockOrderService; // TODO: 実APIサービスに置き換え