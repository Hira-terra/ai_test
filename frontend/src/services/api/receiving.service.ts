import type { ApiResponse, PurchaseOrder, Receiving, ReceivingItem, QualityStatus } from '../../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async <T>(url: string): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },
  
  post: async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  patch: async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

class ReceivingAPIService {
  /**
   * 入庫待ち発注一覧を取得
   */
  async getPendingOrders(params?: {
    storeId?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<PurchaseOrder[]>> {
    const queryParams = new URLSearchParams();
    if (params?.storeId) queryParams.append('storeId', params.storeId);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    const queryString = queryParams.toString();
    const url = `/receiving/pending-orders${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<PurchaseOrder[]>(url);
  }

  /**
   * 発注書詳細を取得（入庫用）
   */
  async getPurchaseOrderDetail(purchaseOrderId: string): Promise<ApiResponse<PurchaseOrder>> {
    return apiClient.get<PurchaseOrder>(`/receiving/purchase-orders/${purchaseOrderId}`);
  }

  /**
   * 入庫登録
   */
  async createReceiving(data: {
    purchaseOrderId: string;
    items: Array<{
      purchaseOrderItemId: string;
      receivedQuantity: number;
      qualityStatus: QualityStatus;
      notes?: string;
    }>;
    receivedBy: string;
    notes?: string;
  }): Promise<ApiResponse<Receiving>> {
    return apiClient.post<Receiving>('/receiving', data);
  }

  /**
   * 入庫履歴を取得
   */
  async getReceivingHistory(params?: {
    storeId?: string;
    supplierId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<Receiving[]>> {
    const queryParams = new URLSearchParams();
    if (params?.storeId) queryParams.append('storeId', params.storeId);
    if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);
    
    const queryString = queryParams.toString();
    const url = `/receiving/history${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<Receiving[]>(url);
  }

  /**
   * 入庫詳細を取得
   */
  async getReceivingDetail(receivingId: string): Promise<ApiResponse<Receiving>> {
    return apiClient.get<Receiving>(`/receiving/${receivingId}`);
  }

  /**
   * 入庫ステータスを更新
   */
  async updateReceivingStatus(
    receivingId: string,
    status: 'completed' | 'cancelled'
  ): Promise<ApiResponse<Receiving>> {
    return apiClient.patch<Receiving>(`/receiving/${receivingId}/status`, { status });
  }

  /**
   * 品質検査結果を更新
   */
  async updateQualityStatus(
    itemId: string,
    data: {
      qualityStatus: QualityStatus;
      notes?: string;
    }
  ): Promise<ApiResponse<ReceivingItem>> {
    return apiClient.patch<ReceivingItem>(`/receiving/items/${itemId}/quality`, data);
  }
}

export const receivingAPIService = new ReceivingAPIService();