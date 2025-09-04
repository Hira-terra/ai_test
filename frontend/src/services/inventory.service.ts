// API統合レイヤー - 実APIを使用
import { apiInventoryService } from './api/inventory.service';

// 実APIサービスをエクスポート
export const inventoryService = apiInventoryService;

// デバッグ用: 動作モードをログ出力
console.info('✅ InventoryService: 実APIモードで動作中');