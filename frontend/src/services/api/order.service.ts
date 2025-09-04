// @REAL_API: 実際の受注APIサービス実装
import { Order, ApiResponse, OrderStatus, PaymentMethod } from '@/types';
import { API_ENDPOINTS } from '@/types';

// APIリクエスト用の型定義
interface CreateOrderRequest {
  customerId: string;
  items: Array<{
    productId: string;
    frameId?: string;
    quantity: number;
    unitPrice: number;
    prescriptionId?: string;
    notes?: string;
  }>;
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  paidAmount?: number;
  deliveryDate?: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

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
  }
};

// 実受注APIサービス
export const apiOrderService = {
  // 受注一覧取得
  getOrders: async (params?: {
    customerId?: string;
    status?: OrderStatus;
    search?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Order[]>> => {
    console.info('✅ Using REAL API for orders list');
    
    try {
      const queryParams = new URLSearchParams();
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      
      const url = queryParams.toString() 
        ? `${API_ENDPOINTS.ORDERS.LIST}?${queryParams.toString()}`
        : API_ENDPOINTS.ORDERS.LIST;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '受注一覧の取得に失敗しました。'
        }
      };
    }
  },

  // 受注詳細取得
  getOrderById: async (id: string): Promise<ApiResponse<Order>> => {
    console.info('✅ Using REAL API for order detail');
    
    try {
      const response = await apiClient.get(API_ENDPOINTS.ORDERS.DETAIL(id));
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '受注詳細の取得に失敗しました。'
        }
      };
    }
  },

  // 受注作成
  createOrder: async (orderData: CreateOrderRequest): Promise<ApiResponse<Order>> => {
    console.info('✅ Using REAL API for order creation');
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.CREATE, orderData);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '受注の作成に失敗しました。'
        }
      };
    }
  },

  // 受注更新
  updateOrder: async (id: string, updates: {
    status?: OrderStatus;
    deliveryDate?: string;
    notes?: string;
  }): Promise<ApiResponse<Order>> => {
    console.info('✅ Using REAL API for order update');
    
    try {
      const response = await apiClient.put(API_ENDPOINTS.ORDERS.UPDATE(id), updates);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '受注の更新に失敗しました。'
        }
      };
    }
  },

  // 受注キャンセル
  cancelOrder: async (id: string): Promise<ApiResponse<Order>> => {
    console.info('✅ Using REAL API for order cancellation');
    
    try {
      const response = await apiClient.put(API_ENDPOINTS.ORDERS.CANCEL(id));
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '受注のキャンセルに失敗しました。'
        }
      };
    }
  },

  // 入金追加
  addPayment: async (orderId: string, paymentData: {
    paymentAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }): Promise<ApiResponse<any>> => {
    console.info('✅ Using REAL API for payment addition');
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.ORDERS.PAYMENT_CREATE(orderId), paymentData);
      return response;
    } catch (error: any) {
      console.error('❌ Payment addition failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '入金の追加に失敗しました。'
        }
      };
    }
  },

  // 売上サマリー取得
  getSalesSummary: async (storeId?: string, date?: string): Promise<ApiResponse<{
    totalSales: number;
    orderCount: number;
    cancelCount: number;
    averageOrderAmount: number;
  }>> => {
    console.info('✅ Using REAL API for sales summary');
    
    try {
      const queryParams = new URLSearchParams();
      if (storeId) queryParams.append('storeId', storeId);
      if (date) queryParams.append('date', date);
      
      const url = queryParams.toString() 
        ? `${API_ENDPOINTS.ORDERS.BASE}/summary?${queryParams.toString()}`
        : `${API_ENDPOINTS.ORDERS.BASE}/summary`;
      
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || '売上サマリーの取得に失敗しました。'
        }
      };
    }
  }
};