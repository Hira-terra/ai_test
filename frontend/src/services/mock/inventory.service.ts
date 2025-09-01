// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { Frame, StockItem, Product, ApiResponse, FrameStatus } from '@/types';
import { 
  MOCK_INVENTORY_FRAMES, 
  MOCK_STOCK_ITEMS, 
  MOCK_INVENTORY_PRODUCTS 
} from './data/inventory.mock';

// @MOCK_LOGIC: モック専用の在庫管理サービス
export const mockInventoryService = {
  // @MOCK_TO_API: /api/inventory/frames への GET リクエストに置き換え
  getFrames: async (filters?: {
    storeId?: string;
    productId?: string;
    status?: FrameStatus;
    serialNumber?: string;
  }): Promise<ApiResponse<Frame[]>> => {
    console.warn('🔧 Using MOCK data for frame inventory');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let filteredFrames = [...MOCK_INVENTORY_FRAMES];
    
    // @MOCK_LOGIC: フィルタリング処理
    if (filters) {
      if (filters.storeId) {
        filteredFrames = filteredFrames.filter(frame => frame.storeId === filters.storeId);
      }
      if (filters.productId) {
        filteredFrames = filteredFrames.filter(frame => frame.productId === filters.productId);
      }
      if (filters.status) {
        filteredFrames = filteredFrames.filter(frame => frame.status === filters.status);
      }
      if (filters.serialNumber) {
        filteredFrames = filteredFrames.filter(frame => 
          frame.serialNumber.toLowerCase().includes(filters.serialNumber!.toLowerCase())
        );
      }
    }
    
    return {
      success: true,
      data: filteredFrames
    };
  },

  // @MOCK_TO_API: /api/inventory/frames/:serialNumber への GET リクエストに置き換え
  getFrameBySerial: async (serialNumber: string): Promise<ApiResponse<Frame | null>> => {
    console.warn('🔧 Using MOCK data for frame detail');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const frame = MOCK_INVENTORY_FRAMES.find(f => f.serialNumber === serialNumber);
    
    return {
      success: true,
      data: frame || null
    };
  },

  // @MOCK_TO_API: /api/inventory/frames/:serialNumber/status への PUT リクエストに置き換え
  updateFrameStatus: async (serialNumber: string, status: FrameStatus, notes?: string): Promise<ApiResponse<Frame>> => {
    console.warn('🔧 Using MOCK data for frame status update');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const frameIndex = MOCK_INVENTORY_FRAMES.findIndex(f => f.serialNumber === serialNumber);
    
    if (frameIndex === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定されたフレームが見つかりません。'
        }
      };
    }
    
    // @MOCK_LOGIC: ステータス更新
    MOCK_INVENTORY_FRAMES[frameIndex].status = status;
    MOCK_INVENTORY_FRAMES[frameIndex].updatedAt = new Date().toISOString();
    
    return {
      success: true,
      data: MOCK_INVENTORY_FRAMES[frameIndex]
    };
  },

  // @MOCK_TO_API: /api/inventory/stock への GET リクエストに置き換え
  getStockItems: async (filters?: {
    storeId?: string;
    productId?: string;
    category?: string;
    lowStock?: boolean;
  }): Promise<ApiResponse<StockItem[]>> => {
    console.warn('🔧 Using MOCK data for stock inventory');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filteredStock = [...MOCK_STOCK_ITEMS];
    
    // @MOCK_LOGIC: フィルタリング処理
    if (filters) {
      if (filters.storeId) {
        filteredStock = filteredStock.filter(stock => stock.storeId === filters.storeId);
      }
      if (filters.productId) {
        filteredStock = filteredStock.filter(stock => stock.productId === filters.productId);
      }
      if (filters.category) {
        filteredStock = filteredStock.filter(stock => 
          stock.product?.category === filters.category
        );
      }
      if (filters.lowStock) {
        filteredStock = filteredStock.filter(stock => 
          stock.currentStock <= stock.minStock
        );
      }
    }
    
    return {
      success: true,
      data: filteredStock
    };
  },

  // @MOCK_TO_API: /api/inventory/stock/:id/quantity への PUT リクエストに置き換え
  updateStockQuantity: async (stockItemId: string, quantity: number, notes?: string): Promise<ApiResponse<StockItem>> => {
    console.warn('🔧 Using MOCK data for stock quantity update');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const stockIndex = MOCK_STOCK_ITEMS.findIndex(stock => stock.id === stockItemId);
    
    if (stockIndex === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定された在庫アイテムが見つかりません。'
        }
      };
    }
    
    if (quantity < 0) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '在庫数量は0以上で入力してください。'
        }
      };
    }
    
    // @MOCK_LOGIC: 在庫数量更新
    MOCK_STOCK_ITEMS[stockIndex].currentStock = quantity;
    MOCK_STOCK_ITEMS[stockIndex].lastUpdated = new Date().toISOString();
    
    return {
      success: true,
      data: MOCK_STOCK_ITEMS[stockIndex]
    };
  },

  // @MOCK_TO_API: /api/inventory/products への GET リクエストに置き換え
  getProducts: async (filters?: {
    category?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product[]>> => {
    console.warn('🔧 Using MOCK data for inventory products');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 400));
    
    let filteredProducts = [...MOCK_INVENTORY_PRODUCTS];
    
    // @MOCK_LOGIC: フィルタリング処理
    if (filters) {
      if (filters.category) {
        filteredProducts = filteredProducts.filter(product => product.category === filters.category);
      }
      if (filters.isActive !== undefined) {
        filteredProducts = filteredProducts.filter(product => product.isActive === filters.isActive);
      }
    }
    
    return {
      success: true,
      data: filteredProducts
    };
  },

  // @MOCK_TO_API: /api/inventory/summary への GET リクエストに置き換え
  getInventorySummary: async (storeId?: string): Promise<ApiResponse<{
    totalFrames: number;
    availableFrames: number;
    reservedFrames: number;
    soldFrames: number;
    lowStockItems: number;
    totalProducts: number;
  }>> => {
    console.warn('🔧 Using MOCK data for inventory summary');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let frames = MOCK_INVENTORY_FRAMES;
    let stockItems = MOCK_STOCK_ITEMS;
    
    // @MOCK_LOGIC: 店舗フィルタリング
    if (storeId) {
      frames = frames.filter(frame => frame.storeId === storeId);
      stockItems = stockItems.filter(stock => stock.storeId === storeId);
    }
    
    // @MOCK_LOGIC: サマリー計算
    const summary = {
      totalFrames: frames.length,
      availableFrames: frames.filter(f => f.status === 'in_stock').length,
      reservedFrames: frames.filter(f => f.status === 'reserved').length,
      soldFrames: frames.filter(f => f.status === 'sold').length,
      lowStockItems: stockItems.filter(s => s.currentStock <= s.minStock).length,
      totalProducts: MOCK_INVENTORY_PRODUCTS.length
    };
    
    return {
      success: true,
      data: summary
    };
  }
};