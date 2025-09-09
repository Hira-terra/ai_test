import { frameApiService, CreateIndividualItemsRequest, FrameSearchParams } from './api/frame.service';
import { Frame, FrameStatus } from '../types';

/**
 * フレーム個体管理サービス統合レイヤー
 * 実APIとの統合を行う
 */
class FrameService {
  /**
   * 個体管理品の一括登録
   */
  async createIndividualItems(data: CreateIndividualItemsRequest): Promise<Frame[]> {
    return await frameApiService.createIndividualItems(data);
  }

  /**
   * フレーム個体一覧取得
   */
  async getFrames(params?: FrameSearchParams): Promise<Frame[]> {
    return await frameApiService.getFrames(params);
  }

  /**
   * 商品別フレーム個体一覧取得
   */
  async getFramesByProduct(productId: string, storeId?: string): Promise<Frame[]> {
    return await frameApiService.getFramesByProduct(productId, storeId);
  }

  /**
   * フレーム個体詳細取得
   */
  async getFrameById(id: string): Promise<Frame | null> {
    return await frameApiService.getFrameById(id);
  }

  /**
   * 個体番号検索
   */
  async getFrameBySerialNumber(serialNumber: string): Promise<Frame | null> {
    return await frameApiService.getFrameBySerialNumber(serialNumber);
  }

  /**
   * フレーム個体更新
   */
  async updateFrame(id: string, updateData: {
    color?: string;
    size?: string;
    purchasePrice?: number;
    status?: FrameStatus;
    location?: string;
  }): Promise<Frame> {
    return await frameApiService.updateFrame(id, updateData);
  }

  /**
   * フレーム個体削除
   */
  async deleteFrame(id: string): Promise<void> {
    return await frameApiService.deleteFrame(id);
  }

  /**
   * 在庫サマリー取得
   */
  async getInventorySummary(storeId?: string, productId?: string): Promise<Record<FrameStatus, number>> {
    return await frameApiService.getInventorySummary(storeId, productId);
  }
}

export const frameService = new FrameService();