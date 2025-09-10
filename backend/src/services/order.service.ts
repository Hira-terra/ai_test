import { 
  Order, 
  OrderItem,
  Payment,
  UUID,
  ApiResponse,
  OrderStatus,
  PaymentMethod,
  PaginationInfo
} from '../types';
import { OrderRepository } from '../models/order.model';
import { logger } from '../utils/logger';
import { 
  validateOrderCreate,
  validateOrderUpdate,
  validatePaymentCreate,
  ValidationError 
} from '../validators/order.validator';

export class OrderService {
  private orderRepo: OrderRepository;

  constructor() {
    this.orderRepo = new OrderRepository();
    logger.info('[OrderService] 初期化完了');
  }

  // ============================================
  // 受注管理サービス
  // ============================================

  // 受注一覧取得
  async getOrders(params: {
    customerId?: string;
    status?: OrderStatus;
    fromDate?: string;
    toDate?: string;
    orderNumber?: string;
    customerName?: string;
    page?: number;
    limit?: number;
    storeId?: string;
  }, operationId: string): Promise<ApiResponse<Order[]>> {
    const startTime = Date.now();
    
    try {
      logger.info(`[OrderService:getOrders] 受注一覧取得開始 - ${operationId}`, { 
        params: { ...params, operationId } 
      });

      const { orders, total } = await this.orderRepo.findOrders(params);
      
      const pagination: PaginationInfo = {
        page: params.page || 1,
        limit: params.limit || 50,
        total,
        totalPages: Math.ceil(total / (params.limit || 50)),
        hasNext: ((params.page || 1) * (params.limit || 50)) < total,
        hasPrev: (params.page || 1) > 1
      };

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:getOrders] 受注一覧取得成功 - ${operationId}`, {
        count: orders.length,
        total,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: orders,
        meta: { pagination }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[OrderService:getOrders] 受注一覧取得エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        params,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '受注一覧の取得に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // 受注詳細取得
  async getOrderById(id: string, operationId: string): Promise<ApiResponse<Order>> {
    const startTime = Date.now();

    try {
      logger.info(`[OrderService:getOrderById] 受注詳細取得開始 - ${operationId}`, { id });

      if (!id) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '受注IDが指定されていません。'
          }
        };
      }

      const order = await this.orderRepo.findOrderById(id);
      
      if (!order) {
        logger.warn(`[OrderService:getOrderById] 受注が見つかりません - ${operationId}`, { id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された受注が見つかりません。'
          }
        };
      }

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:getOrderById] 受注詳細取得成功 - ${operationId}`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: order
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[OrderService:getOrderById] 受注詳細取得エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId: id,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '受注詳細の取得に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // 受注作成
  async createOrder(
    orderData: {
      customerId: string;
      status?: OrderStatus;
      items: Array<{
        productId: string;
        frameId?: string;
        quantity: number;
        unitPrice: number;
        prescriptionId?: string;
        notes?: string;
      }>;
      deliveryDate?: string;
      paymentMethod: PaymentMethod;
      paidAmount?: number;
      notes?: string;
    },
    storeId: string,
    createdBy: string,
    operationId: string
  ): Promise<ApiResponse<Order>> {
    const startTime = Date.now();

    try {
      logger.info(`[OrderService:createOrder] 受注作成開始 - ${operationId}`, { 
        orderData, // フルデータをログ出力
        storeId,
        createdBy
      });

      // バリデーション
      const validation = validateOrderCreate(orderData);
      if (!validation.isValid) {
        logger.warn(`[OrderService:createOrder] バリデーションエラー - ${operationId}`, {
          errors: validation.errors,
          receivedData: orderData
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'データが正しくありません。',
            details: validation.errors
          }
        };
      }

      // 金額計算
      const subtotalAmount = orderData.items.reduce((sum, item) => 
        sum + (item.unitPrice * item.quantity), 0
      );
      const taxAmount = Math.floor(subtotalAmount * 0.1); // 消費税10%
      const totalAmount = subtotalAmount + taxAmount;

      // 受注番号生成 (YYYYMMDD-NNNN形式)
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
      const orderNumber = `${dateStr}-${randomNum}`;

      // 受注作成データ準備
      const paidAmount = orderData.paidAmount || 0;
      const createData = {
        orderNumber,
        customerId: orderData.customerId,
        storeId,
        status: orderData.status || 'ordered', // フロントエンドから送信されたステータスを使用
        deliveryDate: orderData.deliveryDate,
        subtotalAmount,
        taxAmount,
        totalAmount,
        paidAmount: paidAmount,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        createdBy,
        items: orderData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };

      const order = await this.orderRepo.createOrder(createData);

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:createOrder] 受注作成成功 - ${operationId}`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        paidAmount,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: order
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // バリデーションエラーの場合
      if (error instanceof ValidationError) {
        logger.warn(`[OrderService:createOrder] バリデーションエラー - ${operationId}`, {
          error: error.message,
          details: error.details,
          duration: `${duration}ms`
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      logger.error(`[OrderService:createOrder] 受注作成エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderData: { ...orderData, operationId },
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '受注の作成に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // 受注更新
  async updateOrder(
    id: string,
    updates: {
      status?: OrderStatus;
      deliveryDate?: string;
      notes?: string;
    },
    operationId: string
  ): Promise<ApiResponse<Order>> {
    const startTime = Date.now();

    try {
      logger.info(`[OrderService:updateOrder] 受注更新開始 - ${operationId}`, { 
        id, 
        updates 
      });

      // バリデーション
      const validation = validateOrderUpdate(updates);
      if (!validation.isValid) {
        logger.warn(`[OrderService:updateOrder] バリデーションエラー - ${operationId}`, {
          errors: validation.errors
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'データが正しくありません。',
            details: validation.errors
          }
        };
      }

      const order = await this.orderRepo.updateOrder(id, updates);
      
      if (!order) {
        logger.warn(`[OrderService:updateOrder] 受注が見つかりません - ${operationId}`, { id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された受注が見つかりません。'
          }
        };
      }

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:updateOrder] 受注更新成功 - ${operationId}`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        updatedFields: Object.keys(updates),
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: order
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[OrderService:updateOrder] 受注更新エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        orderId: id,
        updates,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '受注の更新に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // 受注キャンセル
  async cancelOrder(id: string, operationId: string): Promise<ApiResponse<Order>> {
    return this.updateOrder(id, { status: 'cancelled' }, operationId);
  }

  // 入金追加
  async addPayment(
    paymentData: {
      orderId: string;
      paymentAmount: number;
      paymentMethod: PaymentMethod;
      notes?: string;
    },
    createdBy: string,
    operationId: string
  ): Promise<ApiResponse<Payment>> {
    const startTime = Date.now();

    try {
      logger.info(`[OrderService:addPayment] 入金追加開始 - ${operationId}`, { 
        orderId: paymentData.orderId,
        paymentAmount: paymentData.paymentAmount,
        paymentMethod: paymentData.paymentMethod
      });

      // バリデーション
      const validation = validatePaymentCreate(paymentData);
      if (!validation.isValid) {
        logger.warn(`[OrderService:addPayment] バリデーションエラー - ${operationId}`, {
          errors: validation.errors
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'データが正しくありません。',
            details: validation.errors
          }
        };
      }

      const payment = await this.orderRepo.addPayment({
        ...paymentData,
        createdBy
      });

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:addPayment] 入金追加成功 - ${operationId}`, {
        paymentId: payment.id,
        orderId: payment.orderId,
        paymentAmount: payment.paymentAmount,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: payment
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[OrderService:addPayment] 入金追加エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        paymentData,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '入金の追加に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // 売上サマリー取得
  async getSalesSummary(params: {
    storeId?: string;
    date?: string;
  }, operationId: string): Promise<ApiResponse<{
    totalSales: number;
    orderCount: number;
    cancelCount: number;
    averageOrderAmount: number;
  }>> {
    const startTime = Date.now();

    try {
      logger.info(`[OrderService:getSalesSummary] 売上サマリー取得開始 - ${operationId}`, { params });

      const fromDate = params.date || new Date().toISOString().split('T')[0];
      const toDate = fromDate;

      const { orders } = await this.orderRepo.findOrders({
        storeId: params.storeId,
        fromDate,
        toDate,
        page: 1,
        limit: 10000 // 大きな値で全件取得
      });

      const totalSales = orders
        .filter(order => order.status !== 'cancelled')
        .reduce((sum, order) => sum + order.totalAmount, 0);
      
      const orderCount = orders.filter(order => order.status !== 'cancelled').length;
      const cancelCount = orders.filter(order => order.status === 'cancelled').length;
      const averageOrderAmount = orderCount > 0 ? totalSales / orderCount : 0;

      const summary = {
        totalSales,
        orderCount,
        cancelCount,
        averageOrderAmount
      };

      const duration = Date.now() - startTime;
      logger.info(`[OrderService:getSalesSummary] 売上サマリー取得成功 - ${operationId}`, {
        ...summary,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: summary
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[OrderService:getSalesSummary] 売上サマリー取得エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        params,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '売上サマリーの取得に失敗しました。',
          details: error.message
        }
      };
    }
  }
}