// API統合レイヤー - 実APIを使用
import { apiOrderService } from './api/order.service';

// 実APIサービスをエクスポート
export const orderService = apiOrderService;

// デバッグ用: 動作モードをログ出力
console.info('✅ OrderService: 実APIモードで動作中');