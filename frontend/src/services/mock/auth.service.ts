// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { LoginRequest, LoginResponse, User, ApiResponse } from '@/types';
import { MOCK_AUTH_CREDENTIALS, MOCK_USERS, generateMockLoginResponse } from './data/auth.mock';

// @MOCK_LOGIC: モック専用のログイン処理
export const mockAuthService = {
  // @MOCK_TO_API: /api/auth/login への POST リクエストに置き換え
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    console.warn('🔧 Using MOCK data for auth login');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // @MOCK_LOGIC: 認証情報の検証
    const matchingAuth = MOCK_AUTH_CREDENTIALS.find(
      auth => 
        auth.user_code === credentials.user_code &&
        auth.password === credentials.password &&
        auth.store_code === credentials.store_code
    );
    
    if (!matchingAuth) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'ユーザーコード、パスワード、または店舗コードが正しくありません。'
        }
      };
    }
    
    const loginResponse = generateMockLoginResponse(matchingAuth.user);
    
    return {
      success: true,
      data: loginResponse
    };
  },

  // @MOCK_TO_API: /api/auth/me への GET リクエストに置き換え
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    console.warn('🔧 Using MOCK data for current user');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // @MOCK_LOGIC: ローカルストレージからトークンを確認
    const token = localStorage.getItem('token');
    if (!token || !token.startsWith('mock_token_')) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: '認証が必要です。'
        }
      };
    }
    
    // @MOCK_LOGIC: トークンからユーザーIDを抽出
    const userIdMatch = token.match(/mock_token_(.+?)_\d+/);
    if (!userIdMatch) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: '無効なトークンです。'
        }
      };
    }
    
    const userId = userIdMatch[1];
    const user = MOCK_USERS.find(u => u.id === userId);
    
    if (!user) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません。'
        }
      };
    }
    
    return {
      success: true,
      data: user
    };
  },

  // @MOCK_TO_API: /api/auth/logout への POST リクエストに置き換え
  logout: async (): Promise<ApiResponse<void>> => {
    console.warn('🔧 Using MOCK data for logout');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true
    };
  },

  // @MOCK_TO_API: /api/auth/refresh への POST リクエストに置き換え
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    console.warn('🔧 Using MOCK data for token refresh');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const currentToken = localStorage.getItem('token');
    if (!currentToken || !currentToken.startsWith('mock_token_')) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'トークンの更新に失敗しました。'
        }
      };
    }
    
    // @MOCK_LOGIC: 新しいトークンを生成
    const userIdMatch = currentToken.match(/mock_token_(.+?)_\d+/);
    if (!userIdMatch) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'トークンの更新に失敗しました。'
        }
      };
    }
    
    const newToken = `mock_token_${userIdMatch[1]}_${Date.now()}`;
    
    return {
      success: true,
      data: {
        token: newToken
      }
    };
  }
};