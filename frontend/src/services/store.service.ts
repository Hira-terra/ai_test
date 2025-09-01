// API統合レイヤー - モックと実APIの切り替え
import { mockStoreService } from './mock/store.service';
import { apiStoreService } from './api/store.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true';

// 実APIサービスに切り替え
export const storeService = USE_MOCK ? mockStoreService : apiStoreService;

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ StoreService: モックモードで動作中');
} else {
  console.info('✅ StoreService: 実APIモードで動作中');
}