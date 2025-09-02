import { Request, Response } from 'express';
import { OrderService } from '../services/order.service';
import { logger } from '../utils/logger';
import { generateOperationId } from '../utils/helpers';
import { validateOrderSearch, ValidationError } from '../validators/order.validator';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
    logger.info('[OrderController] 初期化完了');
  }

  // 受注一覧取得
  getOrders = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('getOrders');

    try {
      logger.info(`[OrderController:getOrders] リクエスト受信 - ${operationId}`, {
        query: req.query,
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role,
          storeId: (req as any).user?.storeId
        }
      });

      // クエリパラメータのバリデーション
      const validation = validateOrderSearch(req.query);
      if (!validation.isValid) {
        logger.warn(`[OrderController:getOrders] バリデーションエラー - ${operationId}`, {
          errors: validation.errors
        });
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'パラメータが正しくありません。',
            details: validation.errors
          }
        });
        return;
      }

      const params = {
        customerId: req.query.customerId as string,
        status: req.query.status as any,
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        page: validation.data.page,
        limit: validation.data.limit,
        storeId: req.query.storeId as string || (req as any).user?.storeId
      };

      const result = await this.orderService.getOrders(params, operationId);

      if (result.success) {
        logger.info(`[OrderController:getOrders] 成功レスポンス - ${operationId}`, {
          count: result.data?.length,
          pagination: result.meta?.pagination
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[OrderController:getOrders] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:getOrders] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 受注詳細取得
  getOrderById = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('getOrderById');
    const { id } = req.params;

    try {
      logger.info(`[OrderController:getOrderById] リクエスト受信 - ${operationId}`, {
        orderId: id,
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role
        }
      });

      if (!id) {
        logger.warn(`[OrderController:getOrderById] IDが指定されていません - ${operationId}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '受注IDが指定されていません。'
          }
        });
        return;
      }

      const result = await this.orderService.getOrderById(id, operationId);

      if (result.success) {
        logger.info(`[OrderController:getOrderById] 成功レスポンス - ${operationId}`, {
          orderId: result.data?.id,
          orderNumber: result.data?.orderNumber
        });
        res.status(200).json(result);
      } else if (result.error?.code === 'NOT_FOUND') {
        res.status(404).json(result);
      } else {
        logger.warn(`[OrderController:getOrderById] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:getOrderById] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId: id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 受注作成
  createOrder = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('createOrder');

    try {
      logger.info(`[OrderController:createOrder] リクエスト受信 - ${operationId}`, {
        body: req.body, // フルボディをログ出力してデバッグ
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role,
          storeId: (req as any).user?.storeId
        }
      });

      const storeId = (req as any).user?.storeId;
      const createdBy = (req as any).user?.userId;

      if (!storeId || !createdBy) {
        logger.warn(`[OrderController:createOrder] 認証情報不足 - ${operationId}`, {
          storeId: !!storeId,
          createdBy: !!createdBy
        });
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      const result = await this.orderService.createOrder(
        req.body,
        storeId,
        createdBy,
        operationId
      );

      if (result.success) {
        logger.info(`[OrderController:createOrder] 成功レスポンス - ${operationId}`, {
          orderId: result.data?.id,
          orderNumber: result.data?.orderNumber,
          totalAmount: result.data?.totalAmount
        });
        res.status(201).json(result);
      } else if (result.error?.code === 'VALIDATION_ERROR') {
        res.status(400).json(result);
      } else {
        logger.warn(`[OrderController:createOrder] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:createOrder] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 受注更新
  updateOrder = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('updateOrder');
    const { id } = req.params;

    try {
      logger.info(`[OrderController:updateOrder] リクエスト受信 - ${operationId}`, {
        orderId: id,
        body: req.body,
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role
        }
      });

      if (!id) {
        logger.warn(`[OrderController:updateOrder] IDが指定されていません - ${operationId}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '受注IDが指定されていません。'
          }
        });
        return;
      }

      const result = await this.orderService.updateOrder(id, req.body, operationId);

      if (result.success) {
        logger.info(`[OrderController:updateOrder] 成功レスポンス - ${operationId}`, {
          orderId: result.data?.id,
          orderNumber: result.data?.orderNumber
        });
        res.status(200).json(result);
      } else if (result.error?.code === 'NOT_FOUND') {
        res.status(404).json(result);
      } else if (result.error?.code === 'VALIDATION_ERROR') {
        res.status(400).json(result);
      } else {
        logger.warn(`[OrderController:updateOrder] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:updateOrder] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId: id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 受注キャンセル
  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('cancelOrder');
    const { id } = req.params;

    try {
      logger.info(`[OrderController:cancelOrder] リクエスト受信 - ${operationId}`, {
        orderId: id,
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role
        }
      });

      if (!id) {
        logger.warn(`[OrderController:cancelOrder] IDが指定されていません - ${operationId}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '受注IDが指定されていません。'
          }
        });
        return;
      }

      const result = await this.orderService.cancelOrder(id, operationId);

      if (result.success) {
        logger.info(`[OrderController:cancelOrder] 成功レスポンス - ${operationId}`, {
          orderId: result.data?.id,
          orderNumber: result.data?.orderNumber
        });
        res.status(200).json(result);
      } else if (result.error?.code === 'NOT_FOUND') {
        res.status(404).json(result);
      } else {
        logger.warn(`[OrderController:cancelOrder] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:cancelOrder] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId: id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 入金追加
  addPayment = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('addPayment');
    const { orderId } = req.params;

    try {
      logger.info(`[OrderController:addPayment] リクエスト受信 - ${operationId}`, {
        orderId,
        body: {
          paymentAmount: req.body.paymentAmount,
          paymentMethod: req.body.paymentMethod
        },
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role
        }
      });

      if (!orderId) {
        logger.warn(`[OrderController:addPayment] 受注IDが指定されていません - ${operationId}`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '受注IDが指定されていません。'
          }
        });
        return;
      }

      const createdBy = (req as any).user?.userId;
      if (!createdBy) {
        logger.warn(`[OrderController:addPayment] 認証情報不足 - ${operationId}`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      const paymentData = {
        ...req.body,
        orderId
      };

      const result = await this.orderService.addPayment(paymentData, createdBy, operationId);

      if (result.success) {
        logger.info(`[OrderController:addPayment] 成功レスポンス - ${operationId}`, {
          paymentId: result.data?.id,
          orderId: result.data?.orderId,
          paymentAmount: result.data?.paymentAmount
        });
        res.status(201).json(result);
      } else if (result.error?.code === 'VALIDATION_ERROR') {
        res.status(400).json(result);
      } else {
        logger.warn(`[OrderController:addPayment] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:addPayment] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };

  // 売上サマリー取得
  getSalesSummary = async (req: Request, res: Response): Promise<void> => {
    const operationId = generateOperationId('getSalesSummary');

    try {
      logger.info(`[OrderController:getSalesSummary] リクエスト受信 - ${operationId}`, {
        query: req.query,
        user: {
          userId: (req as any).user?.userId,
          role: (req as any).user?.role,
          storeId: (req as any).user?.storeId
        }
      });

      const params = {
        storeId: req.query.storeId as string || (req as any).user?.storeId,
        date: req.query.date as string
      };

      const result = await this.orderService.getSalesSummary(params, operationId);

      if (result.success) {
        logger.info(`[OrderController:getSalesSummary] 成功レスポンス - ${operationId}`, {
          totalSales: result.data?.totalSales,
          orderCount: result.data?.orderCount
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[OrderController:getSalesSummary] サービスエラー - ${operationId}`, {
          error: result.error
        });
        res.status(500).json(result);
      }

    } catch (error: any) {
      logger.error(`[OrderController:getSalesSummary] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバー内部エラーが発生しました。'
        }
      });
    }
  };
}