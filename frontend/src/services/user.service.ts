// API統合レイヤー - 実APIを使用
import { apiUserService } from './api/user.service';

// 実APIサービスをエクスポート
export const userService = apiUserService;

// デバッグ用: 動作モードをログ出力
console.info('✅ UserService: 実APIモードで動作中');