// API統合レイヤー - 実APIを使用
import { apiCustomerService } from './api/customer.service';

// 実APIサービスをエクスポート
export const customerService = apiCustomerService;

// デバッグ用: 動作モードをログ出力
console.info('✅ CustomerService: 実APIモードで動作中');