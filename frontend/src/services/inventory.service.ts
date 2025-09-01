// @MOCK_TO_API: 本番環境ではこのファイルを実API呼び出しに置き換え
import { mockInventoryService } from './mock/inventory.service';

// @MOCK_TO_API: 開発環境ではモック、本番環境では実APIを使用
export const inventoryService = process.env.NODE_ENV === 'development' 
  ? mockInventoryService 
  : mockInventoryService; // TODO: 実APIサービスに置き換え