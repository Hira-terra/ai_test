// @REAL_API: 実際の商品APIサービス実装
import { Product, Frame, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API GET Request:', `${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API POST Request:', `${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  },

  put: async (url: string, data?: any) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API PUT Request:', `${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  },

  delete: async (url: string) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API DELETE Request:', `${API_BASE_URL}${url}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  }
};

// 実商品APIサービス
export const apiProductService = {
  // 全商品取得
  getProducts: async (params?: {
    category?: string;
    search?: string;
    isActive?: boolean;
    managementType?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Product[]>> => {
    console.info('✅ Using REAL API for products');
    
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.managementType) queryParams.append('managementType', params.managementType);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const url = `${API_ENDPOINTS.PRODUCTS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiClient.get(url);
  },

  // 商品詳細取得
  getProductById: async (id: string): Promise<ApiResponse<Product>> => {
    console.info('✅ Using REAL API for product detail');
    return await apiClient.get(API_ENDPOINTS.PRODUCTS.DETAIL(id));
  },

  // 商品新規作成
  createProduct: async (productData: {
    productCode: string;
    name: string;
    brand?: string;
    category: string;
    managementType: string;
    costPrice?: number;
    retailPrice: number;
    supplier?: string;
    isActive: boolean;
  }): Promise<ApiResponse<Product>> => {
    console.info('✅ Using REAL API for product creation');
    return await apiClient.post(API_ENDPOINTS.PRODUCTS.CREATE, productData);
  },

  // 商品更新
  updateProduct: async (id: string, productData: {
    productCode: string;
    name: string;
    brand?: string;
    category: string;
    managementType: string;
    costPrice?: number;
    retailPrice: number;
    supplier?: string;
    isActive: boolean;
  }): Promise<ApiResponse<Product>> => {
    console.info('✅ Using REAL API for product update');
    return await apiClient.put(API_ENDPOINTS.PRODUCTS.UPDATE(id), productData);
  },

  // 商品削除
  deleteProduct: async (id: string): Promise<ApiResponse<void>> => {
    console.info('✅ Using REAL API for product deletion');
    return await apiClient.delete(API_ENDPOINTS.PRODUCTS.UPDATE(id)); // DELETE uses same endpoint as PUT
  },

  // 利用可能フレーム取得
  getAvailableFrames: async (): Promise<ApiResponse<Frame[]>> => {
    console.info('✅ Using REAL API for available frames');
    return await apiClient.get('/products/frames');
  }
};