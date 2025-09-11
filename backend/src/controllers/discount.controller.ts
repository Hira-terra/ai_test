import { Request, Response } from 'express';
import { DiscountService } from '../services/discount.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export class DiscountController {
  /**
   * 有効な値引き一覧を取得
   */
  static async getActiveDiscounts(req: AuthenticatedRequest, res: Response) {
    try {
      const discounts = await DiscountService.getActiveDiscounts();
      
      res.json({
        success: true,
        data: discounts
      });
    } catch (error) {
      logger.error('Error in getActiveDiscounts controller:', error);
      res.status(500).json({
        success: false,
        error: '値引き一覧の取得に失敗しました'
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