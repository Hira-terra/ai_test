// API統合レイヤー - モックと実APIの切り替え
import { mockInventoryService } from './mock/inventory.service';
import { apiInventoryService } from './api/inventory.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_USE_MOCK_API === 'true';

// 実APIサービスに切り替え
export const inventoryService = USE_MOCK ? mockInventoryService : apiInventoryService;

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ InventoryService: モックモードで動作中');
} else {
  console.info('✅ InventoryService: 実APIモードで動作中');
}