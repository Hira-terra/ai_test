import { Store, CreateStoreRequest, UpdateStoreRequest } from '../types';
import { apiStoreService } from './api/store.service';

class StoreService {
  async getAllStores(): Promise<Store[]> {
    try {
      const response = await apiStoreService.getAllStores();
      if (!response.success || !response.data) {
        throw new Error('店舗データが取得できませんでした');
      }
      return response.data;
    } catch (error) {
      console.error('店舗一覧取得エラー:', error);
      throw error;
    }
  }

  async getStoreById(id: string): Promise<Store> {
    try {
      const response = await apiStoreService.getStoreById(id);
      if (!response.success || !response.data) {
        throw new Error('店舗データが取得できませんでした');
      }
      return response.data;
    } catch (error) {
      console.error('店舗詳細取得エラー:', error);
      throw error;
    }
  }

  async createStore(data: CreateStoreRequest): Promise<Store> {
    try {
      const response = await apiStoreService.createStore(data);
      if (!response.success || !response.data) {
        throw new Error('店舗作成に失敗しました');
      }
      return response.data;
    } catch (error) {
      console.error('店舗作成エラー:', error);
      throw error;
    }
  }

  async updateStore(id: string, data: UpdateStoreRequest): Promise<Store> {
    try {
      const response = await apiStoreService.updateStore(id, data);
      if (!response.success || !response.data) {
        throw new Error('店舗更新に失敗しました');
      }
      return response.data;
    } catch (error) {
      console.error('店舗更新エラー:', error);
      throw error;
    }
  }

  async deleteStore(id: string): Promise<void> {
    try {
      await apiStoreService.deleteStore(id);
    } catch (error) {
      console.error('店舗削除エラー:', error);
      throw error;
    }
  }

  async getStoreStatistics(id: string): Promise<any> {
    try {
      const response = await apiStoreService.getStoreStatistics(id);
      if (!response.success || !response.data) {
        throw new Error('店舗統計データが取得できませんでした');
      }
      return response.data;
    } catch (error) {
      console.error('店舗統計取得エラー:', error);
      throw error;
    }
  }
}

export const storeService = new StoreService();

// デバッグ用: 動作モードをログ出力
console.info('✅ StoreService: 実APIモードで動作中');