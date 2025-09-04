// API統合レイヤー - 実APIを使用
import { apiAuthService } from './api/auth.service';

// 実APIサービスをエクスポート
export const authService = apiAuthService;

// デバッグ用: 動作モードをログ出力
console.info('✅ AuthService: 実APIモードで動作中');