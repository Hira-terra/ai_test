// API統合レイヤー - モックと実APIの切り替え
import { mockOrderService } from './mock/order.service';
import { apiProductService } from './api/product.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_USE_MOCK_API === 'true';

// 実APIサービスに切り替え
export const productService = {
  getProducts: USE_MOCK ? mockOrderService.getProducts : apiProductService.getProducts,
  getProductById: USE_MOCK ? 
    (id: string) => Promise.resolve({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Mock not implemented' } }) : 
    apiProductService.getProductById,
  getAvailableFrames: USE_MOCK ? mockOrderService.getAvailableFrames : apiProductService.getAvailableFrames
};

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ ProductService: モックモードで動作中');
} else {
  console.info('✅ ProductService: 実APIモードで動作中');
}