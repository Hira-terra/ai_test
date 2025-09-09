import axios from 'axios';
import { Frame, FrameStatus, ApiResponse } from '../../types';

// フロントエンドの個体データ型定義
export interface IndividualItem {
  serialNumber: string;
  color?: string;
  size?: string;
  status?: FrameStatus;
  location?: string;
}

export interface CreateIndividualItemsRequest {
  purchaseOrderItemId: string;
  productId: string;
  storeId: string;
  purchaseDate: string;
  purchasePrice?: number;
  items: IndividualItem[];
}

export interface FrameSearchParams {
  storeId?: string;
  status?: FrameStatus;
  productId?: string;
  serialNumber?: string;
}

// APIベースURL設定
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const api = axios.create({
  baseURL: API_BASE_URL,
});

// リクエストインターセプターでJWTトークンを自動付与
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class FrameApiService {
  /**
   * 個体管理品の一括登録
   */
  async createIndividualItems(data: CreateIndividualItemsRequest): Promise<Frame[]> {
    try {
      const response = await api.post<ApiResponse<Frame[]>>('/frames/individual-items', data);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || '個体管理品の登録に失敗しました');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('個体管理品登録エラー:', error);
      throw error;
    }
  }

  /**
   * フレーム個体一覧取得
   */
  async getFrames(params?: FrameSearchParams): Promise<Frame[]> {
    try {
      const response = await api.get<ApiResponse<Frame[]>>('/frames', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'フレーム個体一覧の取得に失敗しました');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('フレーム個体一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 商品別フレーム個体一覧取得
   */
  async getFramesByProduct(productId: string, storeId?: string): Promise<Frame[]> {
    try {
      const params = storeId ? { storeId } : {};
      const response = await api.get<ApiResponse<Frame[]>>(`/frames/product/${productId}`, { params });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || '商品別フレーム個体の取得に失敗しました');
      }

      return response.data.data || [];
    } catch (error) {
      console.error('商品別フレーム個体取得エラー:', error);
      throw error;
    }
  }

  /**
   * フレーム個体詳細取得
   */
  async getFrameById(id: string): Promise<Frame | null> {
    try {
      const response = await api.get<ApiResponse<Frame>>(`/frames/${id}`);
      
      if (!response.data.success) {
        if (response.data.error?.code === 'FRAME_NOT_FOUND') {
          return null;
        }
        throw new Error(response.data.error?.message || 'フレーム個体の取得に失敗しました');
      }

      return response.data.data || null;
    } catch (error) {
      console.error('フレーム個体詳細取得エラー:', error);
      throw error;
    }
  }

  /**
   * 個体番号検索
   */
  async getFrameBySerialNumber(serialNumber: string): Promise<Frame | null> {
    try {
      const response = await api.get<ApiResponse<Frame>>(`/frames/serial/${serialNumber}`);
      
      if (!response.data.success) {
        if (response.data.error?.code === 'FRAME_NOT_FOUND') {
          return null;
        }
        throw new Error(response.data.error?.message || '個体番号検索に失敗しました');
      }

      return response.data.data || null;
    } catch (error) {
      console.error('個体番号検索エラー:', error);
      throw error;
    }
  }

  /**
   * フレーム個体更新
   */
  async updateFrame(id: string, updateData: {
    color?: string;
    size?: string;
    purchasePrice?: number;
    status?: FrameStatus;
    location?: string;
  }): Promise<Frame> {
    try {
      const response = await api.put<ApiResponse<Frame>>(`/frames/${id}`, updateData);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'フレーム個体の更新に失敗しました');
      }

      return response.data.data!;
    } catch (error) {
      console.error('フレーム個体更新エラー:', error);
      throw error;
    }
  }

  /**
   * フレーム個体削除
   */
  async deleteFrame(id: string): Promise<void> {
    try {
      const response = await api.delete<ApiResponse<{ message: string }>>(`/frames/${id}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'フレーム個体の削除に失敗しました');
      }
    } catch (error) {
      console.error('フレーム個体削除エラー:', error);
      throw error;
    }
  }

  /**
   * 在庫サマリー取得
   */
  async getInventorySummary(storeId?: string, productId?: string): Promise<Record<FrameStatus, number>> {
    try {
      const params = { storeId, productId };
      const response = await api.get<ApiResponse<Record<FrameStatus, number>>>('/frames/inventory-summary', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || '在庫サマリーの取得に失敗しました');
      }

      return response.data.data || {
        in_stock: 0,
        reserved: 0,
        sold: 0,
        damaged: 0,
        transferred: 0
      };
    } catch (error) {
      console.error('在庫サマリー取得エラー:', error);
      throw error;
    }
  }
}

export const frameApiService = new FrameApiService();