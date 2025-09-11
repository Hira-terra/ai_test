import { DiscountModel } from '../models/discount.model';
import { Discount, OrderDiscount, UUID } from '../types';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class DiscountService {
  /**
   * 有効な値引き一覧を取得
   */
  static async getActiveDiscounts(): Promise<Discount[]> {
    try {
      return await DiscountModel.getActiveDiscounts();
    } catch (error) {
      logger.error('Error in getActiveDiscounts service:', error);
      throw new AppError('値引き一覧の取得に失敗しました', 500);
    }
  }

  /**
   * 注文金額に対して適用可能な値引きを取得
   */
  static async getApplicableDiscounts(orderAmount: number): Promise<Discount[]> {
    try {
      const activeDiscounts = await DiscountModel.getActiveDiscounts();
      
      // 最小注文金額の条件を満たす値引きのみを返す
      return activeDiscounts.filter(discount => 
        orderAmount >= discount.minOrderAmount
      );
    } catch (error) {
      logger.error('Error in getApplicableDiscounts service:', error);
      throw new AppError('適用可能な値引きの取得に失敗しました', 500);
    }
  }

  /**
   * 値引き額を計算
   */
  static calculateDiscountAmount(
    discount: Discount,
    originalAmount: number
  ): number {
    if (originalAmount < discount.minOrderAmount) {
      return 0;
    }

    let discountAmount = 0;

    if (discount.type === 'percentage') {
      discountAmount = originalAmount * (discount.value / 100);
      
      // 最大値引き額の制限
      if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
        discountAmount = discount.maxDiscountAmount;
      }
    } else if (discount.type === 'amount') {
      discountAmount = discount.value;
    } else if (discount.type === 'special') {
      // 特別値引きの計算ロジック（カスタム実装）
      discountAmount = discount.value;
    }

    // 値引き額は元の金額を超えない
    if (discountAmount > originalAmount) {
      discountAmount = originalAmount;
    }

    return Math.floor(discountAmount);
  }

  /**
   * 受注に値引きを適用
   */
  static async applyDiscountToOrder(
    orderId: UUID,
    discountId: UUID,
    originalAmount: number,
    userId?: UUID | undefined
  ): Promise<OrderDiscount> {
    try {
      // 値引き情報を取得
      const discount = await DiscountModel.getById(discountId);
      
      if (!discount) {
        throw new AppError('指定された値引きが見つかりません', 404);
      }
      
      if (!discount.isActive) {
        throw new AppError('この値引きは現在利用できません', 400);
      }
      
      // 有効期限チェック
      const now = new Date();
      if (discount.validFrom && new Date(discount.validFrom) > now) {
        throw new AppError('この値引きはまだ有効期限前です', 400);
      }
      if (discount.validTo && new Date(discount.validTo) < now) {
        throw new AppError('この値引きの有効期限が切れています', 400);
      }
      
      // 最小注文金額チェック
      if (originalAmount < discount.minOrderAmount) {
        throw new AppError(
          `この値引きを適用するには、注文金額が${discount.minOrderAmount}円以上である必要があります`,
          400
        );
      }
      
      // 使用回数制限チェック（将来的に実装予定）
      // if (discount.maxUsesTotal && discount.currentUsesTotal >= discount.maxUsesTotal) {
      //   throw new AppError('この値引きの使用回数が上限に達しています', 400);
      // }
      
      // 値引き額を計算
      const discountAmount = this.calculateDiscountAmount(discount, originalAmount);
      
      // 受注に値引きを適用
      return await DiscountModel.applyDiscountToOrder(
        orderId,
        discountId,
        originalAmount,
        discountAmount,
        userId
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error in applyDiscountToOrder service:', error);
      throw new AppError('値引きの適用に失敗しました', 500);
    }
  }

  /**
   * 受注の値引きを取得
   */
  static async getOrderDiscounts(orderId: UUID): Promise<OrderDiscount[]> {
    try {
      return await DiscountModel.getOrderDiscounts(orderId);
    } catch (error) {
      logger.error('Error in getOrderDiscounts service:', error);
      throw new AppError('受注値引きの取得に失敗しました', 500);
    }
  }

  /**
   * 受注から値引きを削除
   */
  static async removeDiscountFromOrder(
    orderId: UUID,
    discountId: UUID
  ): Promise<void> {
    try {
      await DiscountModel.removeDiscountFromOrder(orderId, discountId);
    } catch (error) {
      logger.error('Error in removeDiscountFromOrder service:', error);
      throw new AppError('値引きの削除に失敗しました', 500);
    }
  }

  /**
   * 複数の値引きの合計値引き額を計算
   */
  static calculateTotalDiscount(
    discounts: Array<{ discount: Discount; originalAmount: number }>
  ): number {
    let totalDiscount = 0;
    
    for (const { discount, originalAmount } of discounts) {
      const discountAmount = this.calculateDiscountAmount(discount, originalAmount);
      totalDiscount += discountAmount;
    }
    
    return totalDiscount;
  }

  /**
   * 値引き適用後の金額を計算
   */
  static calculateDiscountedAmount(
    originalAmount: number,
    discounts: Discount[]
  ): { totalDiscount: number; finalAmount: number } {
    let totalDiscount = 0;
    let remainingAmount = originalAmount;
    
    for (const discount of discounts) {
      const discountAmount = this.calculateDiscountAmount(discount, remainingAmount);
      totalDiscount += discountAmount;
      remainingAmount -= discountAmount;
    }
    
    return {
      totalDiscount,
      finalAmount: Math.max(0, remainingAmount)
    };
  }
}