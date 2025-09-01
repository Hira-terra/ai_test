// @REAL_API: 実際の商品APIサービス実装
import { Product, Frame, ApiResponse } from '@/types';
import { API_ENDPOINTS } from '@/types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('token');
    console.log('🔍 API Request URL:', `${API_BASE_URL}${url}`);
    console.log('🔐 Using token:', token ? 'Yes' : 'No');
    
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Response data count:', Array.isArray(responseData?.data) ? responseData.data.length : 'single');
      return responseData;
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  }
};

// 実商品APIサービス
export const apiProductService = {
  // 全商品取得
  getProducts: async (category?: string): Promise<ApiResponse<Product[]>> => {
    console.info('✅ Using REAL API for products');
    
    const queryParams = new URLSearchParams();
    if (category) queryParams.append('category', category);
    
    const url = `/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return await apiClient.get(url);
  },

  // 商品詳細取得
  getProductById: async (id: string): Promise<ApiResponse<Product>> => {
    console.info('✅ Using REAL API for product detail');
    return await apiClient.get(`/products/${id}`);
  },

  // 利用可能フレーム取得
  getAvailableFrames: async (): Promise<ApiResponse<Frame[]>> => {
    console.info('✅ Using REAL API for available frames');
    return await apiClient.get('/products/frames');
  }
};