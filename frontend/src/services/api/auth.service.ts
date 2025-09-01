// @REAL_API: 実際の認証APIサービス実装
import { LoginRequest, LoginResponse, User, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  post: async (url: string, data?: any) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log('🌐 POST Request:', fullUrl);
    console.log('📦 Request body:', data);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Raw error response:', errorText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
        console.error('❌ Parsed error response:', errorData);
      } catch (e) {
        console.error('❌ Failed to parse error response as JSON');
      }
      
      throw new Error((errorData as any).message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Success response:', result);
    return result;
  },

  get: async (url: string, token?: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// 実認証APIサービス
export const apiAuthService = {
  // ログイン
  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    console.info('✅ Using REAL API for authentication');
    console.log('🔍 API_BASE_URL:', API_BASE_URL);
    console.log('🔍 Login endpoint:', `${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`);
    console.log('🔍 Credentials:', { userCode: credentials.user_code, storeCode: credentials.store_code });
    
    try {
      console.log('🚀 About to call apiClient.post...');
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
      console.log('📨 apiClient.post completed, response:', response);
      
      // バックエンドAPIの構造: {success: true, data: {user, token, expiresIn}}
      // AuthContextが期待する構造: {success: true, data: {user, token}}
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            user: response.data.user,
            token: response.data.token,
            expiresIn: response.data.expiresIn
          }
        };
      } else {
        return {
          success: false,
          error: response.error || {
            code: 'AUTHENTICATION_FAILED',
            message: 'ログインに失敗しました。'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error.message || 'ログインに失敗しました。'
        }
      };
    }
  },

  // 現在のユーザー情報取得
  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    console.info('✅ Using REAL API for current user');
    
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: '認証が必要です。'
        }
      };
    }

    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME, token);
      
      // バックエンドAPIはすでに正しい形式を返している
      if (response.success) {
        return response;
      } else {
        return {
          success: false,
          error: response.error || {
            code: 'AUTHENTICATION_FAILED',
            message: 'ユーザー情報の取得に失敗しました。'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error.message || 'ユーザー情報の取得に失敗しました。'
        }
      };
    }
  },

  // ログアウト
  logout: async (): Promise<ApiResponse<void>> => {
    console.info('✅ Using REAL API for logout');
    
    const token = localStorage.getItem('token');
    
    try {
      if (token) {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
      
      // ローカルストレージからトークンを削除
      localStorage.removeItem('token');
      
      return {
        success: true
      };
    } catch (error: any) {
      // ログアウトは失敗してもローカルトークンは削除
      localStorage.removeItem('token');
      
      return {
        success: true // ログアウトは常に成功扱い
      };
    }
  },

  // トークンリフレッシュ
  refreshToken: async (): Promise<ApiResponse<{ token: string }>> => {
    console.info('✅ Using REAL API for token refresh');
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
      
      // バックエンドAPIはすでに正しい形式を返している
      if (response.success) {
        return response;
      } else {
        return {
          success: false,
          error: response.error || {
            code: 'AUTHENTICATION_FAILED',
            message: 'トークンの更新に失敗しました。'
          }
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error.message || 'トークンの更新に失敗しました。'
        }
      };
    }
  }
};