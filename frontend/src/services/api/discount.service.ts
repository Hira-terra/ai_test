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
  
  delete: async (url: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
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
  // ===== 値引きマスタ管理API =====

  /**
   * 値引きマスタ一覧を取得
   */
  async getAllDiscounts(): Promise<ApiResponse<{ discounts: Discount[]; total: number }>> {
    try {
      const response = await apiClient.get('/discounts/master');
      return response;
    } catch (error: any) {
      console.error('値引きマスタ一覧取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '値引きマスタ一覧の取得に失敗しました',
          details: error.message
        }
      };
    }
  },

  /**
   * 値引きマスタ詳細を取得
   */
  async getDiscountById(id: string): Promise<ApiResponse<Discount>> {
    try {
      const response = await apiClient.get(`/discounts/master/${id}`);
      return response;
    } catch (error: any) {
      console.error('値引きマスタ詳細取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: '値引きマスタ詳細の取得に失敗しました',
          details: error.message
        }
      };
    }
  },

  /**
   * 値引きマスタを作成
   */
  async createDiscount(discountData: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Discount>> {
    try {
      const response = await apiClient.post('/discounts/master', discountData);
      return response;
    } catch (error: any) {
      console.error('値引きマスタ作成エラー:', error);
      return {
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: '値引きマスタの作成に失敗しました',
          details: error.message
        }
      };
    }
  },

  /**
   * 値引きマスタを更新
   */
  async updateDiscount(id: string, discountData: Partial<Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Discount>> {
    try {
      const response = await apiClient.put(`/discounts/master/${id}`, discountData);
      return response;
    } catch (error: any) {
      console.error('値引きマスタ更新エラー:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: '値引きマスタの更新に失敗しました',
          details: error.message
        }
      };
    }
  },

  /**
   * 値引きマスタを削除
   */
  async deleteDiscount(id: string): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.delete(`/discounts/master/${id}`);
      return response;
    } catch (error: any) {
      console.error('値引きマスタ削除エラー:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: '値引きマスタの削除に失敗しました',
          details: error.message
        }
      };
    }
  },

  // ===== 受注値引きAPI（既存） =====

  /**
   * アクティブな値引き一覧を取得（受注用）
   */
  async getActiveDiscounts(): Promise<ApiResponse<Discount[]>> {
    try {
      const response = await apiClient.get('/discounts');
      return response;
    } catch (error: any) {
      console.error('アクティブ値引き一覧取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'アクティブ値引き一覧の取得に失敗しました',
          details: error.message
        }
      };
    }
  }
};