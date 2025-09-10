import { Response, NextFunction } from 'express';
import { ReceivingService } from '../services/receiving.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest as AuthRequest } from '../middleware/auth';

export const receivingController = {
  /**
   * 入庫待ち発注一覧取得
   */
  async getPendingOrders(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_pending_${Date.now()}`;
    
    try {
      const { storeId } = req.query;
      const userStoreId = req.user?.storeId;
      
      // 権限チェック: adminでない場合は自店舗のみ
      const targetStoreId = req.user?.role === 'admin' && storeId 
        ? storeId as string 
        : userStoreId;
      
      logger.info(`[${operationId}] 入庫待ち発注一覧取得`, { 
        userId: req.user?.userId,
        storeId: targetStoreId 
      });
      
      const pendingOrders = await ReceivingService.getPendingPurchaseOrders(targetStoreId);
      
      res.json({
        success: true,
        data: pendingOrders
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫待ち発注一覧取得エラー`, error);
      next(error);
    }
  },

  /**
   * 発注書詳細取得
   */
  async getPurchaseOrderDetail(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_po_detail_${Date.now()}`;
    
    try {
      const { purchaseOrderId } = req.params;
      
      logger.info(`[${operationId}] 発注書詳細取得`, { 
        userId: req.user?.userId,
        purchaseOrderId 
      });
      
      const detail = await ReceivingService.getPurchaseOrderDetail(purchaseOrderId || '');
      
      res.json({
        success: true,
        data: detail
      });
    } catch (error) {
      logger.error(`[${operationId}] 発注書詳細取得エラー`, error);
      next(error);
    }
  },

  /**
   * 入庫登録
   */
  async createReceiving(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_create_${Date.now()}`;
    
    try {
      const userId = req.user?.userId!;
      const data = req.body;
      
      logger.info(`[${operationId}] 入庫登録`, { 
        userId,
        purchaseOrderId: data.purchaseOrderId,
        itemCount: data.items?.length 
      });
      
      const result = await ReceivingService.createReceiving(userId, data);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫登録エラー`, error);
      next(error);
    }
  },

  /**
   * 入庫履歴取得
   */
  async getReceivingHistory(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_history_${Date.now()}`;
    
    try {
      const { storeId, supplierId, fromDate, toDate, status } = req.query;
      const userStoreId = req.user?.storeId;
      
      // 権限チェック: adminでない場合は自店舗のみ
      const targetStoreId = req.user?.role === 'admin' && storeId 
        ? storeId as string 
        : userStoreId;
      
      logger.info(`[${operationId}] 入庫履歴取得`, { 
        userId: req.user?.userId,
        filters: { storeId: targetStoreId, supplierId, fromDate, toDate, status }
      });
      
      const history = await ReceivingService.getReceivingHistory({
        storeId: targetStoreId,
        supplierId: supplierId as string,
        fromDate: fromDate as string,
        toDate: toDate as string,
        status: status as any
      });
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫履歴取得エラー`, error);
      next(error);
    }
  },

  /**
   * 入庫済み発注一覧取得（買掛一覧用）
   */
  async getReceivedOrders(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_received_orders_${Date.now()}`;
    
    try {
      const { storeId, supplierId, status, fromDate, toDate } = req.query;
      const userStoreId = req.user?.storeId;
      
      // 権限チェック: adminでない場合は自店舗のみ
      const targetStoreId = req.user?.role === 'admin' && storeId 
        ? storeId as string 
        : userStoreId;
      
      logger.info(`[${operationId}] 入庫済み発注一覧取得`, { 
        userId: req.user?.userId,
        filters: { storeId: targetStoreId, supplierId, status, fromDate, toDate }
      });
      
      const receivedOrders = await ReceivingService.getReceivedPurchaseOrders({
        storeId: targetStoreId,
        supplierId: supplierId as string,
        status: status as any,
        fromDate: fromDate as string,
        toDate: toDate as string
      });
      
      res.json({
        success: true,
        data: receivedOrders
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫済み発注一覧取得エラー`, error);
      next(error);
    }
  },

  /**
   * 入庫詳細取得
   */
  async getReceivingDetail(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_detail_${Date.now()}`;
    
    try {
      const { receivingId } = req.params;
      
      logger.info(`[${operationId}] 入庫詳細取得`, { 
        userId: req.user?.userId,
        receivingId 
      });
      
      const detail = await ReceivingService.getReceivingDetail(receivingId || '');
      
      res.json({
        success: true,
        data: detail
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫詳細取得エラー`, error);
      next(error);
    }
  },

  /**
   * 入庫ステータス更新
   */
  async updateReceivingStatus(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_update_status_${Date.now()}`;
    
    try {
      const { receivingId } = req.params;
      const { status, notes } = req.body;
      
      logger.info(`[${operationId}] 入庫ステータス更新`, { 
        userId: req.user?.userId,
        receivingId,
        status 
      });
      
      const result = await ReceivingService.updateReceivingStatus(
        receivingId || '', 
        status, 
        notes
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[${operationId}] 入庫ステータス更新エラー`, error);
      next(error);
    }
  },

  /**
   * 品質検査結果更新
   */
  async updateQualityStatus(req: AuthRequest, res: Response, next: NextFunction) {
    const operationId = `ctrl_receiving_update_quality_${Date.now()}`;
    
    try {
      const { itemId } = req.params;
      const { qualityStatus, notes } = req.body;
      
      logger.info(`[${operationId}] 品質検査結果更新`, { 
        userId: req.user?.userId,
        itemId,
        qualityStatus 
      });
      
      const result = await ReceivingService.updateQualityStatus(
        itemId || '',
        qualityStatus,
        notes
      );
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error(`[${operationId}] 品質検査結果更新エラー`, error);
      next(error);
    }
  }
};