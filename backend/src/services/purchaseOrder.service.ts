import { Pool } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { PurchaseOrderModel } from '../models/purchaseOrder.model';
import { OrderModel } from '../models/order.model';
import { SupplierModel } from '../models/supplier.model';
import { 
  PurchaseOrder, 
  PurchaseOrderItem,
  PurchaseOrderStatus,
  Order, 
  Supplier,
  ValidationError,
  NotFoundError 
} from '../types';

export class PurchaseOrderService {
  private purchaseOrderModel: PurchaseOrderModel;
  private orderModel: OrderModel;
  private supplierModel: SupplierModel;
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
    this.purchaseOrderModel = new PurchaseOrderModel(this.pool);
    this.orderModel = new OrderModel(this.pool);
    this.supplierModel = new SupplierModel(this.pool);
    logger.info('[PurchaseOrderService] 初期化完了');
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
  }): Promise<Order[]> {
    try {
      logger.info('[PurchaseOrderService] 発注待ち受注一覧取得開始', { params });
      
      const orders = await this.orderModel.findAvailableForPurchase(params);
      
      logger.info('[PurchaseOrderService] 発注待ち受注一覧取得完了', { 
        count: orders.length 
      });
      
      return orders;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注待ち受注一覧取得エラー', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        params 
      });
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
    orderDateFrom?: string;
    orderDateTo?: string;
    expectedDeliveryFrom?: string;
    expectedDeliveryTo?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ purchaseOrders: PurchaseOrder[]; total: number }> {
    try {
      logger.info('[PurchaseOrderService] 発注一覧取得開始', { params });
      
      const result = await this.purchaseOrderModel.findAll(params);
      
      logger.info('[PurchaseOrderService] 発注一覧取得完了', { 
        count: result.purchaseOrders.length,
        total: result.total 
      });
      
      return result;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注一覧取得エラー', { 
        error: error instanceof Error ? error.message : error 
      });
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
  }): Promise<PurchaseOrder[]> {
    try {
      logger.info('[PurchaseOrderService] 発注履歴取得開始', { params });
      
      const result = await this.purchaseOrderModel.findAll({
        ...params,
        sort: 'order_date_desc'
      });
      
      logger.info('[PurchaseOrderService] 発注履歴取得完了', { 
        count: result.purchaseOrders.length 
      });
      
      return result.purchaseOrders;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注履歴取得エラー', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 発注詳細を取得
   */
  async getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
    try {
      logger.info('[PurchaseOrderService] 発注詳細取得開始', { id });
      
      const purchaseOrder = await this.purchaseOrderModel.findById(id);
      
      if (!purchaseOrder) {
        throw new NotFoundError('発注が見つかりません', []);
      }
      
      logger.info('[PurchaseOrderService] 発注詳細取得完了', { 
        id: purchaseOrder.id,
        purchaseOrderNumber: purchaseOrder.purchaseOrderNumber 
      });
      
      return purchaseOrder;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注詳細取得エラー', { 
        id,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 発注を作成
   */
  async createPurchaseOrder(data: {
    supplierId: string;
    storeId: string;
    expectedDeliveryDate?: string;
    notes?: string;
    createdBy: string;
    orderIds: string[]; // 発注対象の受注ID
  }): Promise<PurchaseOrder> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      logger.info('[PurchaseOrderService] 発注作成開始', { 
        supplierId: data.supplierId,
        storeId: data.storeId,
        orderIds: data.orderIds 
      });

      // 仕入先の存在確認
      const supplier = await this.supplierModel.findById(data.supplierId);
      if (!supplier) {
        throw new NotFoundError('指定された仕入先が見つかりません', []);
      }

      // 受注の存在確認と発注待ち状態確認
      const availableOrders = await this.orderModel.findAvailableForPurchase({
        storeId: data.storeId
      });
      
      const validOrderIds = availableOrders
        .filter(order => data.orderIds.includes(order.id))
        .map(order => order.id);

      if (validOrderIds.length === 0) {
        throw new ValidationError('発注可能な受注がありません', []);
      }

      if (validOrderIds.length !== data.orderIds.length) {
        const invalidIds = data.orderIds.filter(id => !validOrderIds.includes(id));
        throw new ValidationError('一部の受注が発注できない状態です', invalidIds);
      }

      // 発注番号を生成
      const purchaseOrderNumber = await this.generatePurchaseOrderNumber(data.storeId);

      // 発注を作成
      logger.info('[PurchaseOrderService] 発注モデル作成開始', {
        purchaseOrderNumber,
        supplierId: data.supplierId,
        storeId: data.storeId,
        orderCount: validOrderIds.length
      });
      
      const purchaseOrder = await this.purchaseOrderModel.create({
        purchaseOrderNumber,
        supplierId: data.supplierId,
        storeId: data.storeId,
        expectedDeliveryDate: data.expectedDeliveryDate,
        notes: data.notes,
        createdBy: data.createdBy,
        orderIds: validOrderIds
      }, client);

      if (!purchaseOrder) {
        throw new Error('発注の作成に失敗しました - モデルからnullが返却されました');
      }

      // 受注ステータスを「発注済み」に更新
      await this.orderModel.updateMultipleStatus(validOrderIds, 'purchase_ordered');

      await client.query('COMMIT');
      
      logger.info('[PurchaseOrderService] 発注作成完了', { 
        id: purchaseOrder.id,
        purchaseOrderNumber: purchaseOrder.purchaseOrderNumber,
        orderCount: validOrderIds.length 
      });
      
      return purchaseOrder;
      
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[PurchaseOrderService] 発注作成エラー', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 発注ステータスを更新
   */
  async updateStatus(id: string, status: PurchaseOrderStatus, updatedBy: string): Promise<PurchaseOrder> {
    try {
      logger.info('[PurchaseOrderService] 発注ステータス更新開始', { 
        id, 
        status, 
        updatedBy 
      });
      
      const updatedPurchaseOrder = await this.purchaseOrderModel.updateStatus(id, status);
      
      if (!updatedPurchaseOrder) {
        throw new NotFoundError('発注が見つかりません', []);
      }
      
      // ステータスに応じて受注ステータスも更新
      if (status === 'delivered') {
        // 発注に含まれる受注のステータスを「レンズ受領」に更新
        const orderIds = updatedPurchaseOrder.items.map(item => item.orderId);
        await this.orderModel.updateMultipleStatus(orderIds, 'lens_received');
      }
      
      logger.info('[PurchaseOrderService] 発注ステータス更新完了', { 
        id: updatedPurchaseOrder.id,
        status: updatedPurchaseOrder.status 
      });
      
      return updatedPurchaseOrder;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注ステータス更新エラー', { 
        id,
        status,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 発注を送信
   */
  async sendPurchaseOrder(id: string, sentBy: string): Promise<PurchaseOrder> {
    try {
      logger.info('[PurchaseOrderService] 発注送信開始', { id, sentBy });
      
      const purchaseOrder = await this.purchaseOrderModel.findById(id);
      
      if (!purchaseOrder) {
        throw new NotFoundError('発注が見つかりません', []);
      }
      
      if (purchaseOrder.status !== 'draft') {
        throw new ValidationError('下書き状態の発注のみ送信できます', []);
      }
      
      const updatedPurchaseOrder = await this.purchaseOrderModel.send(id, sentBy);
      
      if (!updatedPurchaseOrder) {
        throw new NotFoundError('発注の送信に失敗しました', []);
      }
      
      logger.info('[PurchaseOrderService] 発注送信完了', { 
        id: updatedPurchaseOrder.id,
        purchaseOrderNumber: updatedPurchaseOrder.purchaseOrderNumber 
      });
      
      return updatedPurchaseOrder;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注送信エラー', { 
        id,
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 仕入先一覧を取得
   */
  async getSuppliers(): Promise<Supplier[]> {
    try {
      logger.info('[PurchaseOrderService] 仕入先一覧取得開始');
      
      const suppliers = await this.supplierModel.findAll({ isActive: true });
      
      logger.info('[PurchaseOrderService] 仕入先一覧取得完了', { 
        count: suppliers.length 
      });
      
      return suppliers;
    } catch (error) {
      logger.error('[PurchaseOrderService] 仕入先一覧取得エラー', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }

  /**
   * 発注番号を生成
   */
  private async generatePurchaseOrderNumber(storeId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // 下2桁
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // 店舗コードの取得（簡略化のため、storeIdの末尾3文字を使用）
    const storeCode = storeId.slice(-3).toUpperCase();
    
    // 当日の発注数を取得
    const countQuery = `
      SELECT COUNT(*) as count
      FROM purchase_orders
      WHERE DATE(created_at) = CURRENT_DATE
      AND store_id = $1
    `;
    
    const result = await this.pool.query(countQuery, [storeId]);
    const dailyCount = parseInt(result.rows[0]?.count || '0') + 1;
    const sequence = dailyCount.toString().padStart(3, '0');
    
    return `PO${year}${month}${day}${storeCode}${sequence}`;
  }

  /**
   * 発注統計を取得
   */
  async getPurchaseOrderStatistics(params?: {
    storeId?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    totalCount: number;
    totalAmount: number;
    statusCounts: Record<PurchaseOrderStatus, number>;
    supplierCounts: Array<{ supplierId: string; supplierName: string; count: number; amount: number }>;
  }> {
    try {
      logger.info('[PurchaseOrderService] 発注統計取得開始', { params });
      
      const statistics = await this.purchaseOrderModel.getStatistics(params);
      
      logger.info('[PurchaseOrderService] 発注統計取得完了');
      
      return statistics;
    } catch (error) {
      logger.error('[PurchaseOrderService] 発注統計取得エラー', { 
        error: error instanceof Error ? error.message : error 
      });
      throw error;
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService();