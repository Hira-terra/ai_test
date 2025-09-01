// @REAL_API: 実際のAPIサービス実装
import { Customer, CustomerSearchParams, CreateCustomerRequest, Prescription, CustomerImage, CustomerMemo, ApiResponse } from '@/types';
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
      console.log('✅ Response data:', responseData);
      return responseData;
    } catch (error) {
      console.error('🚫 Network error:', error);
      throw error;
    }
  },

  post: async (url: string, data?: any) => {
    const token = localStorage.getItem('token');
    console.log('🌐 POST Request:', `${API_BASE_URL}${url}`);
    console.log('🔐 Using token:', token ? 'Yes' : 'No');
    console.log('🔐 Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('📦 Request body:', data);
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('❌ Raw error response:', errorText);
      
      let errorData = {};
      try {
        errorData = JSON.parse(errorText);
        console.error('❌ Parsed error response:', errorData);
      } catch (e) {
        console.error('❌ Failed to parse error response as JSON');
      }
      
      throw new Error((errorData as any).message || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Success response:', result);
    return result;
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

// 実APIサービス
export const apiCustomerService = {
  // 顧客検索
  searchCustomers: async (params: CustomerSearchParams = {}): Promise<ApiResponse<Customer[]>> => {
    console.info('✅ Using REAL API for customer search');
    
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.phone) queryParams.append('phone', params.phone);
    if (params.address) queryParams.append('address', params.address);
    if (params.ownStoreOnly !== undefined) queryParams.append('ownStoreOnly', params.ownStoreOnly.toString());
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const url = `${API_ENDPOINTS.CUSTOMERS.SEARCH}?${queryParams.toString()}`;
    return await apiClient.get(url);
  },

  // 顧客詳細取得
  getCustomerById: async (id: string): Promise<ApiResponse<Customer>> => {
    console.info('✅ Using REAL API for customer detail');
    return await apiClient.get(API_ENDPOINTS.CUSTOMERS.DETAIL(id));
  },

  // 顧客作成
  createCustomer: async (customerData: CreateCustomerRequest): Promise<ApiResponse<Customer>> => {
    console.info('✅ Using REAL API for customer creation');
    return await apiClient.post(API_ENDPOINTS.CUSTOMERS.CREATE, customerData);
  },

  // 顧客更新
  updateCustomer: async (id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    console.info('✅ Using REAL API for customer update');
    console.log('📤 Update request:', { id, customerData });
    console.log('📤 registeredStoreId:', customerData.registeredStoreId);
    return await apiClient.put(API_ENDPOINTS.CUSTOMERS.UPDATE(id), customerData);
  },

  // 処方箋履歴取得
  getCustomerPrescriptions: async (customerId: string): Promise<ApiResponse<Prescription[]>> => {
    console.info('✅ Using REAL API for customer prescriptions');
    return await apiClient.get(API_ENDPOINTS.CUSTOMERS.PRESCRIPTIONS(customerId));
  },

  // 処方箋作成
  createPrescription: async (customerId: string, prescriptionData: Omit<Prescription, 'id' | 'customerId' | 'createdAt' | 'createdBy'>): Promise<ApiResponse<Prescription>> => {
    console.info('✅ Using REAL API for prescription creation');
    return await apiClient.post(API_ENDPOINTS.CUSTOMERS.PRESCRIPTION_CREATE(customerId), prescriptionData);
  },

  // 顧客画像一覧取得
  getCustomerImages: async (customerId: string): Promise<ApiResponse<CustomerImage[]>> => {
    console.info('✅ Using REAL API for customer images');
    return await apiClient.get(API_ENDPOINTS.CUSTOMERS.IMAGES(customerId));
  },

  // 顧客画像アップロード
  uploadCustomerImage: async (customerId: string, imageFile: File, metadata?: Partial<CustomerImage>): Promise<ApiResponse<CustomerImage>> => {
    console.info('✅ Using REAL API for image upload');
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', imageFile);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CUSTOMERS.IMAGE_UPLOAD(customerId)}`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  // 顧客画像削除
  deleteCustomerImage: async (customerId: string, imageId: string): Promise<ApiResponse<void>> => {
    console.info('✅ Using REAL API for image deletion');
    return await apiClient.delete(API_ENDPOINTS.CUSTOMERS.IMAGE_DELETE(customerId, imageId));
  },

  // 顧客メモ一覧取得
  getCustomerMemos: async (customerId: string): Promise<ApiResponse<CustomerMemo[]>> => {
    console.info('✅ Using REAL API for customer memos');
    return await apiClient.get(API_ENDPOINTS.CUSTOMERS.MEMOS(customerId));
  },

  // 顧客メモ作成
  createCustomerMemo: async (customerId: string, memoData: Omit<CustomerMemo, 'id' | 'customerId' | 'createdAt' | 'createdBy'>): Promise<ApiResponse<CustomerMemo>> => {
    console.info('✅ Using REAL API for memo creation');
    return await apiClient.post(API_ENDPOINTS.CUSTOMERS.MEMO_CREATE(customerId), memoData);
  },

  // 顧客メモ削除
  deleteCustomerMemo: async (customerId: string, memoId: string): Promise<ApiResponse<void>> => {
    console.info('✅ Using REAL API for memo deletion');
    return await apiClient.delete(API_ENDPOINTS.CUSTOMERS.MEMO_DELETE(customerId, memoId));
  }
};