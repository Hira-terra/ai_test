import { ApiResponse, Order, PurchaseOrder, Supplier, PurchaseOrderStatus, CreateStockPurchaseOrderItem, StockLevel, StockLevelAlert } from '../types';
import { authService } from './auth.service';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

class PurchaseOrderService {
  private getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * 発注待ち受注一覧を取得
   */
  async getAvailableOrders(params?: {
    storeId?: string;
    customerId?: string;
    customerName?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<Order[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.customerId) queryParams.append('customerId', params.customerId);
      if (params?.customerName) queryParams.append('customerName', params.customerName);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/available-orders?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注待ち受注一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 発注一覧を取得
   */
  async getPurchaseOrders(params?: {
    supplierId?: string;
    status?: PurchaseOrderStatus;
    storeId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ purchaseOrders: PurchaseOrder[]; pagination: any }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 発注を送信（ステータスをsentに更新）
   */
  async sendPurchaseOrder(purchaseOrderId: string): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/${purchaseOrderId}/send`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注送信エラー:', error);
      throw error;
    }
  }

  /**
   * 発注履歴を取得
   */
  async getPurchaseOrderHistory(params?: {
    storeId?: string;
    supplierId?: string;
    status?: PurchaseOrderStatus;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<PurchaseOrder[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // レスポンス構造を調整（pagination情報を除く）
      return {
        success: result.success,
        data: result.data?.purchaseOrders || result.data || [],
        error: result.error
      };
    } catch (error) {
      console.error('発注履歴取得エラー:', error);
      throw error;
    }
  }

  /**
   * 発注詳細を取得
   */
  async getPurchaseOrderById(id: string): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注詳細取得エラー:', error);
      throw error;
    }
  }

  /**
   * 発注を作成
   */
  async createPurchaseOrder(data: {
    supplierId: string;
    expectedDeliveryDate?: string;
    notes?: string;
    orderIds: string[];
  }): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注作成エラー:', error);
      throw error;
    }
  }

  /**
   * 発注ステータスを更新
   */
  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注ステータス更新エラー:', error);
      throw error;
    }
  }


  /**
   * 仕入先一覧を取得
   */
  async getSuppliers(): Promise<ApiResponse<Supplier[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/suppliers`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('仕入先一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 発注統計を取得
   */
  async getStatistics(params?: {
    storeId?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResponse<{
    totalCount: number;
    totalAmount: number;
    statusCounts: Record<PurchaseOrderStatus, number>;
    supplierCounts: Array<{ supplierId: string; supplierName: string; count: number; amount: number }>;
  }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.supplierId) queryParams.append('supplierId', params.supplierId);
      if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params?.toDate) queryParams.append('toDate', params.toDate);

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/statistics?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('発注統計取得エラー:', error);
      throw error;
    }
  }

  /**
   * 在庫発注を作成
   */
  async createStockReplenishment(data: {
    supplierId: string;
    expectedDeliveryDate?: string;
    notes?: string;
    stockItems: CreateStockPurchaseOrderItem[];
  }): Promise<ApiResponse<PurchaseOrder>> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/stock-replenishment`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('在庫発注作成エラー:', error);
      throw error;
    }
  }

  /**
   * 在庫レベル一覧を取得
   */
  async getStockLevels(params?: {
    storeId?: string;
    productId?: string;
    lowStockOnly?: boolean;
    autoOrderEnabled?: boolean;
    productCategory?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<ApiResponse<{ stockLevels: StockLevel[]; total: number }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.productId) queryParams.append('productId', params.productId);
      if (params?.lowStockOnly) queryParams.append('lowStockOnly', 'true');
      if (params?.autoOrderEnabled !== undefined) queryParams.append('autoOrderEnabled', params.autoOrderEnabled.toString());
      if (params?.productCategory) queryParams.append('productCategory', params.productCategory);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.sort) queryParams.append('sort', params.sort);

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/stock-levels?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('在庫レベル一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 在庫アラート一覧を取得
   */
  async getStockAlerts(params?: {
    storeId?: string;
    alertType?: 'low_stock' | 'out_of_stock' | 'overstocked';
    isResolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ alerts: StockLevelAlert[]; total: number }>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.storeId) queryParams.append('storeId', params.storeId);
      if (params?.alertType) queryParams.append('alertType', params.alertType);
      if (params?.isResolved !== undefined) queryParams.append('isResolved', params.isResolved.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/stock-alerts?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('在庫アラート一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 自動発注提案を取得
   */
  async getSuggestedOrders(storeId: string): Promise<ApiResponse<Array<{
    productId: string;
    product: {
      id: string;
      productCode: string;
      name: string;
      brand: string;
      category: string;
      costPrice: number;
    };
    currentQuantity: number;
    safetyStock: number;
    maxStock: number;
    suggestedQuantity: number;
    suggestedCost: number;
  }>>> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/purchase-orders/suggested-orders?storeId=${storeId}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('自動発注提案取得エラー:', error);
      throw error;
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService();