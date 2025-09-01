// API統合レイヤー - モックと実APIの切り替え
import { mockAuthService } from './mock/auth.service';
import { apiAuthService } from './api/auth.service';

// @REAL_API: 実APIを使用（データベース連携）
const USE_MOCK = process.env.REACT_APP_USE_MOCK === 'true' || process.env.REACT_APP_USE_MOCK_API === 'true';

// 実APIサービスに切り替え
export const authService = USE_MOCK ? mockAuthService : apiAuthService;

// デバッグ用: 現在の動作モードをログ出力
if (USE_MOCK) {
  console.warn('⚠️ AuthService: モックモードで動作中');
} else {
  console.info('✅ AuthService: 実APIモードで動作中');
}