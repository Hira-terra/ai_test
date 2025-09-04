// API統合レイヤー - 実APIを使用
import { apiProductService } from './api/product.service';

// 実APIサービスをエクスポート
export const productService = apiProductService;

// デバッグ用: 動作モードをログ出力
console.info('✅ ProductService: 実APIモードで動作中');