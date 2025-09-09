import type { ApiResponse, Supplier } from '../../types';

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
  
  put: async <T>(url: string, data: any): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
  
  delete: async <T>(url: string): Promise<ApiResponse<T>> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  },
};

class SupplierAPIService {
  /**
   * すべての仕入先を取得
   */
  async getAllSuppliers(): Promise<ApiResponse<Supplier[]>> {
    return apiClient.get<Supplier[]>('/suppliers');
  }

  /**
   * 仕入先を作成
   */
  async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Supplier>> {
    return apiClient.post<Supplier>('/suppliers', data);
  }

  /**
   * 仕入先を更新
   */
  async updateSupplier(id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Supplier>> {
    return apiClient.put<Supplier>(`/suppliers/${id}`, data);
  }

  /**
   * 仕入先を削除
   */
  async deleteSupplier(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/suppliers/${id}`);
  }
}

export const supplierAPIService = new SupplierAPIService();