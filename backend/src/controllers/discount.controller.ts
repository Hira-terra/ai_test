import { Request, Response } from 'express';
import { db } from '../config/database';
import { DiscountService } from '../services/discount.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { UUID } from '../types';
import { logger } from '../utils/logger';

// サービスインスタンス
// @ts-ignore - Database型とPool型の互換性問題を一時的に無視
const discountService = new DiscountService(db);

export class DiscountController {
  
  // ===== 値引きマスタ管理機能 =====

  /**
   * 値引き一覧取得（マスタ管理）
   */
  static async getAllDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('[DiscountController] 値引き一覧取得開始');
      
      const result = await discountService.getAllDiscounts();
      
      if (!result.success) {
        return res.status(500).json(result);
      }
      
      logger.info(`[DiscountController] 値引き一覧取得完了: ${result.data?.total || 0}件`);
      return res.json(result);
    } catch (error: any) {
      logger.error('[DiscountController] 値引き一覧取得エラー:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          details: error.message
        }
      });
    }
  }

  /**
   * 値引き詳細取得（マスタ管理）
   */
  static async getDiscountById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[DiscountController] 値引き詳細取得開始: ${id}`);
      
      const result = await discountService.getDiscountById(id as UUID);
      
      if (!result.success) {
        const statusCode = result.error?.code === 'DISCOUNT_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json(result);
      }
      
      logger.info(`[DiscountController] 値引き詳細取得完了: ${id}`);
      return res.json(result);
    } catch (error: any) {
      logger.error(`[DiscountController] 値引き詳細取得エラー: ${req.params.id}`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          details: error.message
        }
      });
    }
  }

  /**
   * 値引き作成（マスタ管理）
   */
  static async createDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const discountData = req.body;
      const createdBy = req.user?.userId;
      
      if (!createdBy) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '認証が必要です'
          }
        });
      }
      
      logger.info('[DiscountController] 値引き作成開始', { discountCode: discountData.discountCode });
      
      const result = await discountService.createDiscount(discountData, createdBy);
      
      if (!result.success) {
        const statusCode = result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        return res.status(statusCode).json(result);
      }
      
      logger.info(`[DiscountController] 値引き作成完了: ${result.data?.id}`);
      return res.status(201).json(result);
    } catch (error: any) {
      logger.error('[DiscountController] 値引き作成エラー:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          details: error.message
        }
      });
    }
  }

  /**
   * 値引き更新（マスタ管理）
   */
  static async updateDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const discountData = req.body;
      
      logger.info(`[DiscountController] 値引き更新開始: ${id}`);
      
      const result = await discountService.updateDiscount(id as UUID, discountData);
      
      if (!result.success) {
        const statusCode = result.error?.code === 'DISCOUNT_NOT_FOUND' ? 404 :
                          result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        return res.status(statusCode).json(result);
      }
      
      logger.info(`[DiscountController] 値引き更新完了: ${id}`);
      return res.json(result);
    } catch (error: any) {
      logger.error(`[DiscountController] 値引き更新エラー: ${req.params.id}`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          details: error.message
        }
      });
    }
  }

  /**
   * 値引き削除（マスタ管理）
   */
  static async deleteDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      logger.info(`[DiscountController] 値引き削除開始: ${id}`);
      
      const result = await discountService.deleteDiscount(id as UUID);
      
      if (!result.success) {
        const statusCode = result.error?.code === 'DISCOUNT_NOT_FOUND' ? 404 : 500;
        return res.status(statusCode).json(result);
      }
      
      logger.info(`[DiscountController] 値引き削除完了: ${id}`);
      return res.json(result);
    } catch (error: any) {
      logger.error(`[DiscountController] 値引き削除エラー: ${req.params.id}`, error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました',
          details: error.message
        }
      });
    }
  }

  // ===== 受注値引き機能（既存） =====
  /**
   * 有効な値引き一覧を取得
   */
  static async getActiveDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('[DiscountController] アクティブ値引き一覧取得開始');
      
      const discounts = await discountService.getActiveDiscountsForOrder();
      
      logger.info(`[DiscountController] アクティブ値引き一覧取得完了: ${discounts.length}件`);
      res.json({
        success: true,
        data: discounts
      });
    } catch (error: any) {
      logger.error('[DiscountController] アクティブ値引き一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '値引き一覧の取得に失敗しました',
          details: error.message
        }
      });
    }
  }

  /**
   * 注文金額に対して適用可能な値引きを取得
   */
  static async getApplicableDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderAmount } = req.query;
      
      if (!orderAmount || isNaN(Number(orderAmount))) {
        return res.status(400).json({
          success: false,
          error: '注文金額が指定されていません'
        });
      }
      
      const discounts = await DiscountService.getApplicableDiscounts(Number(orderAmount));
      
      return res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      logger.error('Error in getApplicableDiscounts controller:', error);
      return res.status(500).json({
        success: false,
        error: '適用可能な値引きの取得に失敗しました'
      });
    }
  }

  /**
   * 値引き額を計算
   */
  static async calculateDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const { discountId, originalAmount } = req.body;
      
      if (!discountId || !originalAmount || isNaN(Number(originalAmount))) {
        return res.status(400).json({
          success: false,
          error: '必要なパラメータが不足しています'
        });
      }
      
      // 値引き情報を取得（簡易実装のため、サービスから直接取得）
      const discounts = await DiscountService.getActiveDiscounts();
      const discount = discounts.find(d => d.id === discountId);
      
      if (!discount) {
        return res.status(404).json({
          success: false,
          error: '指定された値引きが見つかりません'
        });
      }
      
      const discountAmount = DiscountService.calculateDiscountAmount(
        discount,
        Number(originalAmount)
      );
      
      return res.json({
        success: true,
        data: {
          discountAmount,
          discountedAmount: Number(originalAmount) - discountAmount
        }
      });
    } catch (error) {
      logger.error('Error in calculateDiscount controller:', error);
      return res.status(500).json({
        success: false,
        error: '値引き額の計算に失敗しました'
      });
    }
  }

  /**
   * 受注に値引きを適用
   */
  static async applyDiscountToOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      const { discountId, originalAmount } = req.body;
      const userId = req.user?.userId;
      
      if (!orderId || !discountId || !originalAmount || isNaN(Number(originalAmount))) {
        return res.status(400).json({
          success: false,
          error: '必要なパラメータが不足しています'
        });
      }
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: '認証が必要です'
        });
      }
      
      const orderDiscount = await DiscountService.applyDiscountToOrder(
        orderId,
        discountId,
        Number(originalAmount),
        userId
      );
      
      return res.json({
        success: true,
        data: orderDiscount
      });
    } catch (error: any) {
      logger.error('Error in applyDiscountToOrder controller:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message || '値引きの適用に失敗しました'
      });
    }
  }

  /**
   * 受注の値引きを取得
   */
  static async getOrderDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId } = req.params;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: '受注IDが指定されていません'
        });
      }
      
      const discounts = await DiscountService.getOrderDiscounts(orderId);
      
      return res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      logger.error('Error in getOrderDiscounts controller:', error);
      return res.status(500).json({
        success: false,
        error: '受注値引きの取得に失敗しました'
      });
    }
  }

  /**
   * 受注から値引きを削除
   */
  static async removeDiscountFromOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, discountId } = req.params;
      
      if (!orderId || !discountId) {
        return res.status(400).json({
          success: false,
          error: '必要なパラメータが不足しています'
        });
      }
      
      await DiscountService.removeDiscountFromOrder(orderId, discountId);
      
      return res.json({
        success: true,
        message: '値引きを削除しました'
      });
    } catch (error) {
      logger.error('Error in removeDiscountFromOrder controller:', error);
      return res.status(500).json({
        success: false,
        error: '値引きの削除に失敗しました'
      });
    }
  }

  /**
   * 複数の値引きの合計を計算
   */
  static async calculateTotalDiscount(req: AuthenticatedRequest, res: Response) {
    try {
      const { discounts, originalAmount } = req.body;
      
      if (!discounts || !Array.isArray(discounts) || !originalAmount) {
        return res.status(400).json({
          success: false,
          error: '必要なパラメータが不足しています'
        });
      }
      
      // 各値引きの詳細を取得
      const activeDiscounts = await DiscountService.getActiveDiscounts();
      const selectedDiscounts = discounts
        .map(discountId => activeDiscounts.find(d => d.id === discountId))
        .filter(d => d !== undefined);
      
      const result = DiscountService.calculateDiscountedAmount(
        Number(originalAmount),
        selectedDiscounts
      );
      
      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in calculateTotalDiscount controller:', error);
      return res.status(500).json({
        success: false,
        error: '合計値引き額の計算に失敗しました'
      });
    }
  }
}

// エクスポート
export const discountController = DiscountController;