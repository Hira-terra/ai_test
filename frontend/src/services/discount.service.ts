import { ApiResponse, Discount } from '@/types';
import { discountAPIService } from './api/discount.service';

export const discountService = {
  /**
   * 利用可能な値引き一覧を取得
   */
  async getAvailableDiscounts(): Promise<ApiResponse<Discount[]>> {
    return discountAPIService.getDiscounts();
  },

  /**
   * 値引きIDで詳細取得
   */
  async getDiscountById(id: string): Promise<ApiResponse<Discount>> {
    return discountAPIService.getDiscountById(id);
  }
};