import { Request, Response } from 'express';
import { StoreService } from '../services/store.service';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { ApiResponse, CreateStoreRequest, UpdateStoreRequest } from '../types';
import { ValidationError } from '../validators/customer.validator';

export class StoreController {
  private storeService: StoreService;

  constructor() {
    this.storeService = new StoreService(db.getPool());
  }

  /**
   * 店舗一覧取得
   */
  public async getStores(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const includeInactive = req.query.includeInactive === 'true';

    logger.info(`[STORE_CONTROLLER] 店舗一覧リクエスト受信`);

    try {
      const stores = await this.storeService.getAllStores();

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

  /**
   * 店舗詳細取得
   */
  public async getStoreById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '店舗IDが必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[STORE_CONTROLLER] 店舗詳細リクエスト受信: ${id}`);

    try {
      const store = await this.storeService.getStoreById(id);

      if (!store) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された店舗が見つかりません'
          }
        } as ApiResponse);
        return;
      }

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗詳細取得完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: store
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗詳細取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗情報の取得中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * 店舗作成
   */
  public async createStore(req: Request, res: Response): Promise<void> {
    const data: CreateStoreRequest = req.body;
    const startTime = Date.now();

    logger.info(`[STORE_CONTROLLER] 店舗作成リクエスト受信: ${data.storeCode}`);

    try {
      const store = await this.storeService.createStore(data);

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗作成完了 (${duration}ms)`);

      res.status(201).json({
        success: true,
        data: store
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗作成エラー:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗作成中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * 店舗更新
   */
  public async updateStore(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data: UpdateStoreRequest = req.body;
    const startTime = Date.now();

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '店舗IDが必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[STORE_CONTROLLER] 店舗更新リクエスト受信: ${id}`);

    try {
      const store = await this.storeService.updateStore(id, data);

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗更新完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: store
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗更新エラー:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗更新中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * 店舗削除
   */
  public async deleteStore(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '店舗IDが必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[STORE_CONTROLLER] 店舗削除リクエスト受信: ${id}`);

    try {
      await this.storeService.deleteStore(id);

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗削除完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: { message: '店舗を削除しました' }
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗削除エラー:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗削除中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * 店舗統計取得
   */
  public async getStoreStatistics(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const startTime = Date.now();

    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '店舗IDが必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[STORE_CONTROLLER] 店舗統計リクエスト受信: ${id}`);

    try {
      const statistics = await this.storeService.getStoreStatistics(id);

      const duration = Date.now() - startTime;
      logger.info(`[STORE_CONTROLLER] 店舗統計取得完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: statistics
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[STORE_CONTROLLER] 店舗統計取得エラー:', error);
      
      if (error instanceof ValidationError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        } as ApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '店舗統計取得中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }
}