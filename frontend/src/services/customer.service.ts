// API統合レイヤー - モックと実APIの切り替え
import { mockCustomerService } from './mock/customer.service';
import { apiCustomerService } from './api/customer.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_USE_MOCK_API === 'true';

// 実APIサービスに切り替え
export const customerService = USE_MOCK ? mockCustomerService : apiCustomerService;

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ CustomerService: モックモードで動作中');
} else {
  console.info('✅ CustomerService: 実APIモードで動作中');
}