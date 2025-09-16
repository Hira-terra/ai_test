import { ApiResponse, Discount } from '@/types';
import { discountAPIService } from './api/discount.service';

export const discountService = {
  // ===== 値引きマスタ管理 =====

  /**
   * 値引きマスタ一覧を取得
   */
  async getAllDiscounts(): Promise<ApiResponse<{ discounts: Discount[]; total: number }>> {
    return discountAPIService.getAllDiscounts();
  },

  /**
   * 値引きマスタ詳細を取得
   */
  async getDiscountById(id: string): Promise<ApiResponse<Discount>> {
    return discountAPIService.getDiscountById(id);
  },

  /**
   * 値引きマスタを作成
   */
  async createDiscount(discountData: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Discount>> {
    return discountAPIService.createDiscount(discountData);
  },

  /**
   * 値引きマスタを更新
   */
  async updateDiscount(id: string, discountData: Partial<Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Discount>> {
    return discountAPIService.updateDiscount(id, discountData);
  },

  /**
   * 値引きマスタを削除
   */
  async deleteDiscount(id: string): Promise<ApiResponse<boolean>> {
    return discountAPIService.deleteDiscount(id);
  },

  // ===== 受注値引き機能 =====

  /**
   * 利用可能な値引き一覧を取得（受注用）
   */
  async getAvailableDiscounts(): Promise<ApiResponse<Discount[]>> {
    return discountAPIService.getActiveDiscounts();
  }
};