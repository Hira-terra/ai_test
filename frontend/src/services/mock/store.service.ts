// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { Store, ApiResponse } from '@/types';
import { MOCK_STORES_DATA } from './data/store.mock';

// @MOCK_LOGIC: モック専用の店舗管理処理
export const mockStoreService = {
  // @MOCK_TO_API: /api/stores への GET リクエストに置き換え
  getStores: async (): Promise<ApiResponse<Store[]>> => {
    console.warn('🔧 Using MOCK data for stores');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: MOCK_STORES_DATA
    };
  },

  // @MOCK_TO_API: /api/stores/:id への GET リクエストに置き換え
  getStoreById: async (id: string): Promise<ApiResponse<Store>> => {
    console.warn('🔧 Using MOCK data for store detail');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const store = MOCK_STORES_DATA.find(s => s.id === id);
    
    if (!store) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '店舗が見つかりません。'
        }
      };
    }
    
    return {
      success: true,
      data: store
    };
  }
};