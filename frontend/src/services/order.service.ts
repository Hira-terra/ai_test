// API統合レイヤー - モックと実APIの切り替え
import { mockOrderService } from './mock/order.service';
import { apiOrderService } from './api/order.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_USE_MOCK_API === 'true';

// 実APIサービスに切り替え
export const orderService = USE_MOCK ? mockOrderService : apiOrderService;

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ OrderService: モックモードで動作中');
} else {
  console.info('✅ OrderService: 実APIモードで動作中');
}