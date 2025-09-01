import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ApiResponse } from '../types';

export class StoreController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(db.getPool());
  }

  /**
   * 店舗一覧取得
   */
  public async getStores(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    logger.info(`[STORE_CONTROLLER] 店舗一覧リクエスト受信`);

    try {
      const stores = await this.authService.getAllStores();

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗一覧取得完了: ${stores.length}件 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: stores
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗一覧取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗情報の取得中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }
}