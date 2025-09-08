import { ReceivingModel } from '../models/receiving.model';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { 
  Receiving, 
  ReceivingItem, 
  ReceivingStatus, 
  QualityStatus,
  CreateReceivingRequest 
} from '../types';

export class ReceivingService {
  /**
   * 入庫待ち発注一覧を取得
   */
  static async getPendingPurchaseOrders(storeId?: string) {
    const operationId = `service_receiving_pending_${Date.now()}`;
    
    try {
      logger.info(`[${operationId}] 入庫待ち発注一覧取得開始`, { storeId });
      
      const pendingOrders = await ReceivingModel.getPendingPurchaseOrders(storeId);
      
      logger.info(`[${operationId}] 入庫待ち発注一覧取得完了`, { 
        count: pendingOrders.length 
      });
      
      return pendingOrders;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫待ち発注一覧取得エラー`, error);
      throw error;
    }
  }

  /**
   * 発注書の詳細と明細を取得
   */
  static async getPurchaseOrderDetail(purchaseOrderId: string) {
    const operationId = `service_receiving_po_detail_${Date.now()}`;
    
    try {
      if (!purchaseOrderId) {
        throw new ValidationError('発注書IDが指定されていません', []);
      }
      
      logger.info(`[${operationId}] 発注書詳細取得開始`, { purchaseOrderId });
      
      const detail = await ReceivingModel.getPurchaseOrderWithItems(purchaseOrderId);
      
      logger.info(`[${operationId}] 発注書詳細取得完了`, { 
        purchaseOrderId,
        itemCount: detail.items.length 
      });
      
      return detail;
    } catch (error: any) {
      logger.error(`[${operationId}] 発注書詳細取得エラー`, error);
      throw error;
    }
  }

  /**
   * 入庫登録
   */
  static async createReceiving(userId: string, data: CreateReceivingRequest) {
    const operationId = `service_receiving_create_${Date.now()}`;
    
    try {
      // バリデーション
      if (!data.purchaseOrderId) {
        throw new ValidationError('発注書IDが指定されていません', []);
      }
      
      if (!data.items || data.items.length === 0) {
        throw new ValidationError('入庫明細が指定されていません', []);
      }
      
      // 入庫数量チェック
      const hasValidQuantity = data.items.some(item => item.receivedQuantity > 0);
      if (!hasValidQuantity) {
        throw new ValidationError('入庫数量が0です', []);
      }
      
      logger.info(`[${operationId}] 入庫登録開始`, { 
        purchaseOrderId: data.purchaseOrderId,
        itemCount: data.items.length 
      });
      
      // 入庫登録実行
      const result = await ReceivingModel.createReceiving({
        purchaseOrderId: data.purchaseOrderId,
        receivedBy: userId,
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
        notes: data.notes,
        items: data.items
      });
      
      logger.info(`[${operationId}] 入庫登録完了`, { 
        receivingId: result.receiving.id,
        receivingNumber: result.receiving.receiving_number
      });
      
      return result;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫登録エラー`, error);
      throw error;
    }
  }

  /**
   * 入庫履歴取得
   */
  static async getReceivingHistory(filters: {
    storeId?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
    status?: ReceivingStatus;
  }) {
    const operationId = `service_receiving_history_${Date.now()}`;
    
    try {
      logger.info(`[${operationId}] 入庫履歴取得開始`, filters);
      
      const history = await ReceivingModel.getReceivingHistory({
        storeId: filters.storeId,
        supplierId: filters.supplierId,
        fromDate: filters.fromDate ? new Date(filters.fromDate) : undefined,
        toDate: filters.toDate ? new Date(filters.toDate) : undefined,
        status: filters.status
      });
      
      logger.info(`[${operationId}] 入庫履歴取得完了`, { 
        count: history.length 
      });
      
      return history;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫履歴取得エラー`, error);
      throw error;
    }
  }

  /**
   * 入庫詳細取得
   */
  static async getReceivingDetail(receivingId: string) {
    const operationId = `service_receiving_detail_${Date.now()}`;
    
    try {
      if (!receivingId) {
        throw new ValidationError('入庫IDが指定されていません', []);
      }
      
      logger.info(`[${operationId}] 入庫詳細取得開始`, { receivingId });
      
      const detail = await ReceivingModel.getReceivingDetail(receivingId);
      
      logger.info(`[${operationId}] 入庫詳細取得完了`, { 
        receivingId,
        itemCount: detail.items.length 
      });
      
      return detail;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫詳細取得エラー`, error);
      throw error;
    }
  }

  /**
   * 入庫ステータス更新
   */
  static async updateReceivingStatus(
    receivingId: string, 
    status: ReceivingStatus, 
    notes?: string
  ) {
    const operationId = `service_receiving_update_status_${Date.now()}`;
    
    try {
      if (!receivingId) {
        throw new ValidationError('入庫IDが指定されていません', []);
      }
      
      if (!status) {
        throw new ValidationError('ステータスが指定されていません', []);
      }
      
      logger.info(`[${operationId}] 入庫ステータス更新開始`, { 
        receivingId, 
        status 
      });
      
      // TODO: ステータス更新処理を実装
      // const result = await ReceivingModel.updateStatus(receivingId, status, notes);
      
      logger.info(`[${operationId}] 入庫ステータス更新完了`, { 
        receivingId, 
        status 
      });
      
      return { success: true };
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫ステータス更新エラー`, error);
      throw error;
    }
  }

  /**
   * 品質検査結果更新
   */
  static async updateQualityStatus(
    receivingItemId: string,
    qualityStatus: QualityStatus,
    notes?: string
  ) {
    const operationId = `service_receiving_update_quality_${Date.now()}`;
    
    try {
      if (!receivingItemId) {
        throw new ValidationError('入庫明細IDが指定されていません', []);
      }
      
      if (!qualityStatus) {
        throw new ValidationError('品質ステータスが指定されていません', []);
      }
      
      logger.info(`[${operationId}] 品質検査結果更新開始`, { 
        receivingItemId, 
        qualityStatus 
      });
      
      // TODO: 品質検査結果更新処理を実装
      // const result = await ReceivingModel.updateQualityStatus(receivingItemId, qualityStatus, notes);
      
      logger.info(`[${operationId}] 品質検査結果更新完了`, { 
        receivingItemId, 
        qualityStatus 
      });
      
      return { success: true };
    } catch (error: any) {
      logger.error(`[${operationId}] 品質検査結果更新エラー`, error);
      throw error;
    }
  }
}