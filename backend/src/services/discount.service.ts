import { DiscountModel } from '../models/discount.model';
import { Discount, OrderDiscount, UUID, ApiResponse } from '../types';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class DiscountService {
  private discountModel: DiscountModel;

  constructor(database: any) {
    this.discountModel = new DiscountModel(database);
    logger.info('[DiscountService] 初期化完了');
  }

  // ===== 値引きマスタ管理機能 =====

  /**
   * 値引き一覧取得
   */
  async getAllDiscounts(): Promise<ApiResponse<{ discounts: Discount[]; total: number }>> {
    try {
      logger.info('[DiscountService] 値引き一覧取得開始');
      const result = await this.discountModel.findAll();
      logger.info(`[DiscountService] 値引き一覧取得完了: ${result.total}件`);
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      logger.error('[DiscountService] 値引き一覧取得エラー:', error);
      return {
        success: false,
        error: {
          code: 'DISCOUNT_FETCH_ERROR',
          message: '値引き一覧の取得に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 値引き詳細取得
   */
  async getDiscountById(id: UUID): Promise<ApiResponse<Discount>> {
    try {
      logger.info(`[DiscountService] 値引き詳細取得開始: ${id}`);
      const discount = await this.discountModel.findById(id);
      
      if (!discount) {
        logger.warn(`[DiscountService] 値引きが見つかりません: ${id}`);
        return {
          success: false,
          error: {
            code: 'DISCOUNT_NOT_FOUND',
            message: '指定された値引きが見つかりません'
          }
        };
      }

      logger.info(`[DiscountService] 値引き詳細取得完了: ${id}`);
      return {
        success: true,
        data: discount
      };
    } catch (error: any) {
      logger.error(`[DiscountService] 値引き詳細取得エラー: ${id}`, error);
      return {
        success: false,
        error: {
          code: 'DISCOUNT_DETAIL_FETCH_ERROR',
          message: '値引き詳細の取得に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 値引き作成
   */
  async createDiscount(
    discountData: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>, 
    createdBy: UUID
  ): Promise<ApiResponse<Discount>> {
    try {
      logger.info('[DiscountService] 値引き作成開始');
      
      // バリデーション
      if (!discountData.discountCode || !discountData.name) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '割引コードと割引名は必須です'
          }
        };
      }

      if (discountData.value <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '割引値は0より大きい値である必要があります'
          }
        };
      }

      if (discountData.type === 'percentage' && discountData.value > 100) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'パーセント割引は100%以下である必要があります'
          }
        };
      }

      const discount = await this.discountModel.create(discountData, createdBy);
      logger.info(`[DiscountService] 値引き作成完了: ${discount.id}`);
      
      return {
        success: true,
        data: discount
      };
    } catch (error: any) {
      logger.error('[DiscountService] 値引き作成エラー:', error);
      return {
        success: false,
        error: {
          code: 'DISCOUNT_CREATE_ERROR',
          message: '値引きの作成に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 値引き更新
   */
  async updateDiscount(
    id: UUID,
    discountData: Partial<Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<Discount>> {
    try {
      logger.info(`[DiscountService] 値引き更新開始: ${id}`);
      
      // バリデーション
      if (discountData.value !== undefined && discountData.value <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '割引値は0より大きい値である必要があります'
          }
        };
      }

      if (discountData.type === 'percentage' && discountData.value !== undefined && discountData.value > 100) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'パーセント割引は100%以下である必要があります'
          }
        };
      }

      const discount = await this.discountModel.update(id, discountData);
      
      if (!discount) {
        logger.warn(`[DiscountService] 値引きが見つかりません: ${id}`);
        return {
          success: false,
          error: {
            code: 'DISCOUNT_NOT_FOUND',
            message: '指定された値引きが見つかりません'
          }
        };
      }

      logger.info(`[DiscountService] 値引き更新完了: ${id}`);
      return {
        success: true,
        data: discount
      };
    } catch (error: any) {
      logger.error(`[DiscountService] 値引き更新エラー: ${id}`, error);
      return {
        success: false,
        error: {
          code: 'DISCOUNT_UPDATE_ERROR',
          message: '値引きの更新に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 値引き削除（論理削除）
   */
  async deleteDiscount(id: UUID): Promise<ApiResponse<boolean>> {
    try {
      logger.info(`[DiscountService] 値引き削除開始: ${id}`);
      
      const result = await this.discountModel.delete(id);
      
      if (!result) {
        logger.warn(`[DiscountService] 値引きが見つかりません: ${id}`);
        return {
          success: false,
          error: {
            code: 'DISCOUNT_NOT_FOUND',
            message: '指定された値引きが見つかりません'
          }
        };
      }

      logger.info(`[DiscountService] 値引き削除完了: ${id}`);
      return {
        success: true,
        data: true
      };
    } catch (error: any) {
      logger.error(`[DiscountService] 値引き削除エラー: ${id}`, error);
      return {
        success: false,
        error: {
          code: 'DISCOUNT_DELETE_ERROR',
          message: '値引きの削除に失敗しました',
          details: error.message
        }
      };
    }
  }

  // ===== 受注値引き機能（既存メソッド） =====
  /**
   * 有効な値引き一覧を取得
   */
  async getActiveDiscountsForOrder(): Promise<Discount[]> {
    try {
      return await this.discountModel.findActive();
    } catch (error) {
      logger.error('Error in getActiveDiscountsForOrder service:', error);
      throw new AppError('値引き一覧の取得に失敗しました', 500);
    }
  }

  /**
   * 有効な値引き一覧を取得（静的メソッド互換）
   */
  static async getActiveDiscounts(): Promise<Discount[]> {
    // TODO: 実装中 - 現在は空配列を返す
    return [];
  }

  /**
   * 注文金額に対して適用可能な値引きを取得
   */
  static async getApplicableDiscounts(orderAmount: number): Promise<Discount[]> {
    try {
      const activeDiscounts = await this.getActiveDiscounts();
      
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
      // TODO: 実装中
      console.log(`Apply discount ${discountId} to order ${orderId}, amount: ${originalAmount}, user: ${userId}`);
      throw new AppError('値引き適用機能は実装中です', 501);
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
      // TODO: DiscountModel.getOrderDiscountsの実装が必要
      console.log(`orderId: ${orderId}`); // 一時的なログ
      throw new AppError('受注値引き取得機能は実装中です', 501);
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
      // TODO: DiscountModel.removeDiscountFromOrderの実装が必要
      console.log(`Removing discount ${discountId} from order ${orderId}`); // 一時的なログ
      throw new AppError('値引き削除機能は実装中です', 501);
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