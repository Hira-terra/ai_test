import { 
  API_ENDPOINTS, 
  ApiResponse, 
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchParams
} from '../../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// APIクライアント
const apiClient = {
  get: async (url: string) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const token = localStorage.getItem('token');
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  post: async (url: string, data?: any) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const token = localStorage.getItem('token');
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  put: async (url: string, data?: any) => {
    const fullUrl = `${API_BASE_URL}${url}`;
    const token = localStorage.getItem('token');
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
};


export const apiUserService = {
  // ユーザー一覧取得
  getUsers: async (params?: UserSearchParams): Promise<ApiResponse<User[]>> => {
    console.info('✅ Using REAL API for user list');
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.role) queryParams.append('role', params.role);
      if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.limit) queryParams.append('limit', String(params.limit));

      const url = `${API_ENDPOINTS.USERS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response;
    } catch (error: any) {
      console.error('❌ User list fetch failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'ユーザー一覧の取得に失敗しました。'
        }
      };
    }
  },

  // ユーザー詳細取得
  getUserById: async (id: string): Promise<ApiResponse<User>> => {
    console.info('✅ Using REAL API for user details');
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.BASE + `/${id}`);
      return response;
    } catch (error: any) {
      console.error('❌ User details fetch failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'ユーザー詳細の取得に失敗しました。'
        }
      };
    }
  },

  // ユーザー作成
  createUser: async (userData: CreateUserRequest): Promise<ApiResponse<User>> => {
    console.info('✅ Using REAL API for user creation');
    try {
      const response = await apiClient.post(API_ENDPOINTS.USERS.CREATE, userData);
      return response;
    } catch (error: any) {
      console.error('❌ User creation failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'ユーザーの作成に失敗しました。'
        }
      };
    }
  },

  // ユーザー更新
  updateUser: async (id: string, updates: UpdateUserRequest): Promise<ApiResponse<User>> => {
    console.info('✅ Using REAL API for user update');
    try {
      const response = await apiClient.put(API_ENDPOINTS.USERS.UPDATE(id), updates);
      return response;
    } catch (error: any) {
      console.error('❌ User update failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'ユーザーの更新に失敗しました。'
        }
      };
    }
  }
};