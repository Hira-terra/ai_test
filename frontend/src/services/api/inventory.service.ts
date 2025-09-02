// @REAL_API: 実際の在庫APIサービス実装
import { Frame, StockItem, ApiResponse, FrameStatus } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  put: async (url: string, data?: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};

// 実在庫APIサービス
export const apiInventoryService = {
  // フレーム在庫一覧取得
  getFrames: async (params?: {
    storeId?: string;
    status?: FrameStatus;
    productId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Frame[]>> => {
    console.info('✅ Using REAL API for frames list');
    
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const url = queryParams.toString() 
        ? `${API_ENDPOINTS.INVENTORY.FRAMES}?${queryParams.toString()}`
        : API_ENDPOINTS.INVENTORY.FRAMES;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'フレーム在庫の取得に失敗しました。'
        }
      };
    }
  },

  // フレーム詳細取得
  getFrameBySerialNumber: async (serialNumber: string): Promise<ApiResponse<Frame>> => {
    console.info('✅ Using REAL API for frame detail');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY.FRAME_DETAIL(serialNumber));
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'フレーム詳細の取得に失敗しました。'
        }
      };
    }
  },

  // フレームステータス更新
  updateFrameStatus: async (serialNumber: string, status: FrameStatus): Promise<ApiResponse<Frame>> => {
    console.info('✅ Using REAL API for frame status update');
    
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.INVENTORY.FRAME_UPDATE_STATUS(serialNumber),
        { status }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'フレームステータスの更新に失敗しました。'
        }
      };
    }
  },

  // 数量管理商品在庫一覧取得
  getStockItems: async (params?: {
    storeId?: string;
    productId?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<StockItem[]>> => {
    console.info('✅ Using REAL API for stock items list');
    
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.lowStock !== undefined) queryParams.append('lowStock', params.lowStock.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const url = queryParams.toString() 
        ? `${API_ENDPOINTS.INVENTORY.PRODUCTS}?${queryParams.toString()}`
        : API_ENDPOINTS.INVENTORY.PRODUCTS;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '在庫情報の取得に失敗しました。'
        }
      };
    }
  },

  // 在庫数更新
  updateStock: async (productId: string, adjustment: {
    quantity: number;
    reason: string;
  }): Promise<ApiResponse<StockItem>> => {
    console.info('✅ Using REAL API for stock update');
    
    try {
      const response = await apiClient.put(
        API_ENDPOINTS.INVENTORY.PRODUCT_STOCK_UPDATE(productId),
        adjustment
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '在庫数の更新に失敗しました。'
        }
      };
    }
  },

  // 在庫サマリー取得
  getInventorySummary: async (storeId?: string): Promise<ApiResponse<{
    totalFrames: number;
    inStockFrames: number;
    reservedFrames: number;
    soldFrames: number;
    lowStockItems: number;
    outOfStockItems: number;
  }>> => {
    console.info('✅ Using REAL API for inventory summary');
    
    try {
      const url = storeId 
        ? `${API_ENDPOINTS.INVENTORY.FRAMES}/summary?storeId=${storeId}`
        : `${API_ENDPOINTS.INVENTORY.FRAMES}/summary`;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '在庫サマリーの取得に失敗しました。'
        }
      };
    }
  }
};