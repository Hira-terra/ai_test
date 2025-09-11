import { ApiResponse, Discount } from '@/types';

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
  }
};

export const discountAPIService = {
  /**
   * 値引き一覧を取得
   */
  async getDiscounts(): Promise<ApiResponse<Discount[]>> {
    try {
      const response = await apiClient.get('/discounts');
      return response;
    } catch (error: any) {
      console.error('値引き一覧取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '値引き一覧の取得に失敗しました',
          details: error.message
        }
      };
    }
  },

  /**
   * 値引き詳細を取得
   */
  async getDiscountById(id: string): Promise<ApiResponse<Discount>> {
    try {
      const response = await apiClient.get(`/discounts/${id}`);
      return response;
    } catch (error: any) {
      console.error('値引き詳細取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '値引き詳細の取得に失敗しました',
          details: error.message
        }
      };
    }
  }
};