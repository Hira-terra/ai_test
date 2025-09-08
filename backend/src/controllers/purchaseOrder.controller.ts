import { Request, Response } from 'express';
import { purchaseOrderService } from '../services/purchaseOrder.service';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * 発注待ち受注一覧取得
 */
export const getAvailableOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId, customerId, customerName, fromDate, toDate } = req.query;
    
    const orders = await purchaseOrderService.getAvailableOrders({
      storeId: storeId as string,
      customerId: customerId as string,
      customerName: customerName as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    
    return res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注待ち受注一覧取得エラー', { error });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注待ち受注一覧の取得に失敗しました'
    });
  }
};

/**
 * 発注一覧取得
 */
export const getPurchaseOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      supplierId,
      status,
      storeId,
      orderDateFrom,
      orderDateTo,
      expectedDeliveryFrom,
      expectedDeliveryTo,
      page = '1',
      limit = '50',
      sort
    } = req.query;
    
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const result = await purchaseOrderService.getPurchaseOrders({
      supplierId: supplierId as string,
      status: status as any,
      storeId: storeId as string,
      orderDateFrom: orderDateFrom as string,
      orderDateTo: orderDateTo as string,
      expectedDeliveryFrom: expectedDeliveryFrom as string,
      expectedDeliveryTo: expectedDeliveryTo as string,
      limit: parseInt(limit as string),
      offset,
      sort: sort as string
    });
    
    return res.json({
      success: true,
      data: {
        purchaseOrders: result.purchaseOrders,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注一覧取得エラー', { error });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注一覧の取得に失敗しました'
    });
  }
};

/**
 * 発注履歴取得
 */
export const getPurchaseOrderHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId, supplierId, status, fromDate, toDate } = req.query;
    
    const purchaseOrders = await purchaseOrderService.getPurchaseOrderHistory({
      storeId: storeId as string,
      supplierId: supplierId as string,
      status: status as any,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    
    return res.json({
      success: true,
      data: purchaseOrders
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注履歴取得エラー', { error });
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注履歴の取得に失敗しました'
    });
  }
};

/**
 * 発注詳細取得
 */
export const getPurchaseOrderById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const purchaseOrder = await purchaseOrderService.getPurchaseOrderById(id!);
    
    return res.json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注詳細取得エラー', { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注詳細の取得に失敗しました'
    });
  }
};

/**
 * 発注作成
 */
export const createPurchaseOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, expectedDeliveryDate, notes, orderIds } = req.body;
    const userId = req.user?.userId;
    const storeId = req.user?.storeId;
    
    if (!userId || !storeId) {
      return res.status(401).json({
        success: false,
        error: '認証情報が不正です'
      });
    }
    
    if (!supplierId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '必須項目が不足しています（仕入先ID、受注ID）'
      });
    }
    
    const purchaseOrder = await purchaseOrderService.createPurchaseOrder({
      supplierId,
      storeId,
      expectedDeliveryDate,
      notes,
      createdBy: userId,
      orderIds
    });
    
    return res.status(201).json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注作成エラー', { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注の作成に失敗しました'
    });
  }
};

/**
 * 発注ステータス更新
 */
export const updateStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '認証情報が不正です'
      });
    }
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'ステータスが指定されていません'
      });
    }
    
    const validStatuses = ['draft', 'sent', 'confirmed', 'partially_delivered', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: '無効なステータスです'
      });
    }
    
    const purchaseOrder = await purchaseOrderService.updateStatus(id!, status!, userId!);
    
    return res.json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注ステータス更新エラー', { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注ステータスの更新に失敗しました'
    });
  }
};

/**
 * 発注送信
 */
export const sendPurchaseOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '認証情報が不正です'
      });
    }
    
    const purchaseOrder = await purchaseOrderService.sendPurchaseOrder(id!, userId!);
    
    return res.json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注送信エラー', { error });
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    }
    
    return res.status(500).json({
      success: false,
      error: '発注の送信に失敗しました'
    });
  }
};

/**
 * 仕入先一覧取得
 */
export const getSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await purchaseOrderService.getSuppliers();
    
    return res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 仕入先一覧取得エラー', { error });
    
    return res.status(500).json({
      success: false,
      error: '仕入先一覧の取得に失敗しました'
    });
  }
};

/**
 * 発注統計取得
 */
export const getStatistics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId, supplierId, fromDate, toDate } = req.query;
    
    const statistics = await purchaseOrderService.getPurchaseOrderStatistics({
      storeId: storeId as string,
      supplierId: supplierId as string,
      fromDate: fromDate as string,
      toDate: toDate as string,
    });
    
    return res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('[PurchaseOrderController] 発注統計取得エラー', { error });
    
    return res.status(500).json({
      success: false,
      error: '発注統計の取得に失敗しました'
    });
  }
};

export const purchaseOrderController = {
  getAvailableOrders,
  getPurchaseOrders,
  getPurchaseOrderHistory,
  getPurchaseOrderById,
  createPurchaseOrder,
  updateStatus,
  sendPurchaseOrder,
  getSuppliers,
  getStatistics
};