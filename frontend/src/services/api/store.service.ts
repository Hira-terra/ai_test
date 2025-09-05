// @REAL_API: 実際の店舗APIサービス実装
import { Store, ApiResponse, CreateStoreRequest, UpdateStoreRequest } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// 認証トークン取得
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  post: async (url: string, data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  put: async (url: string, data: any) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  delete: async (url: string) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
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
  getAllStores: async (): Promise<ApiResponse<Store[]>> => {
    console.info('✅ Using REAL API for stores');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.STORES.LIST);
      // responseは既に { success: true, data: [...] } 形式
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗一覧の取得に失敗しました。');
    }
  },

  // 店舗詳細取得
  getStoreById: async (id: string): Promise<ApiResponse<Store>> => {
    console.info('✅ Using REAL API for store detail');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.STORES.DETAIL(id));
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗が見つかりません。');
    }
  },

  // 店舗作成
  createStore: async (data: CreateStoreRequest): Promise<ApiResponse<Store>> => {
    console.info('✅ Using REAL API for store creation');
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.STORES.BASE, data);
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗の作成に失敗しました。');
    }
  },

  // 店舗更新
  updateStore: async (id: string, data: UpdateStoreRequest): Promise<ApiResponse<Store>> => {
    console.info('✅ Using REAL API for store update');
    
    try {
      const response = await apiClient.put(API_ENDPOINTS.STORES.DETAIL(id), data);
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗の更新に失敗しました。');
    }
  },

  // 店舗削除
  deleteStore: async (id: string): Promise<ApiResponse<any>> => {
    console.info('✅ Using REAL API for store deletion');
    
    try {
      const response = await apiClient.delete(API_ENDPOINTS.STORES.DETAIL(id));
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗の削除に失敗しました。');
    }
  },

  // 店舗統計取得
  getStoreStatistics: async (id: string): Promise<ApiResponse<any>> => {
    console.info('✅ Using REAL API for store statistics');
    
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.STORES.DETAIL(id)}/statistics`);
      return response;
    } catch (error: any) {
      throw new Error(error.message || '店舗統計の取得に失敗しました。');
    }
  }
};