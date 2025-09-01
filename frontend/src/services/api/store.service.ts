// @REAL_API: 実際の店舗APIサービス実装
import { Store, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// 実店舗APIサービス
export const apiStoreService = {
  // 店舗一覧取得
  getStores: async (): Promise<ApiResponse<Store[]>> => {
    console.info('✅ Using REAL API for stores');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.STORES.LIST);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '店舗一覧の取得に失敗しました。'
        }
      };
    }
  },

  // 店舗詳細取得
  getStore: async (id: string): Promise<ApiResponse<Store>> => {
    console.info('✅ Using REAL API for store detail');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.STORES.DETAIL(id));
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: error.message || '店舗が見つかりません。'
        }
      };
    }
  }
};