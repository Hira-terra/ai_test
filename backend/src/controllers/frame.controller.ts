import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { frameService, CreateIndividualItemsData } from '../services/frame.service';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { FrameStatus } from '../models/frame.model';

export class FrameController {
  /**
   * 個体管理品の一括登録
   * POST /api/frames/individual-items
   */
  async createIndividualItems(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data: CreateIndividualItemsData = req.body;
      const frames = await frameService.createIndividualItems(data);

      const response: ApiResponse = {
        success: true,
        data: frames
      };

      res.status(201).json(response);
      logger.info('[FRAME_CONTROLLER] 個体管理品一括登録成功', {
        userId: req.user?.userId,
        count: frames.length
      });

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] 個体管理品一括登録エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CREATE_INDIVIDUAL_ITEMS_FAILED',
          message: error.message || '個体管理品の登録に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }

  /**
   * 店舗別フレーム個体一覧取得
   * GET /api/frames?storeId=xxx&status=xxx&productId=xxx&serialNumber=xxx
   */
  async getFrames(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { storeId, status, productId, serialNumber } = req.query;

      // storeIdが指定されていない場合はユーザーの店舗IDを使用
      const targetStoreId = (storeId as string) || req.user?.storeId;
      
      if (!targetStoreId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'STORE_ID_REQUIRED',
            message: '店舗IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const filters = {
        status: status as FrameStatus,
        productId: productId as string,
        serialNumber: serialNumber as string
      };

      const frames = await frameService.getFramesByStore(targetStoreId, filters);

      const response: ApiResponse = {
        success: true,
        data: frames
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] フレーム個体一覧取得エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GET_FRAMES_FAILED',
          message: error.message || 'フレーム個体一覧の取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * 商品別フレーム個体一覧取得
   * GET /api/frames/product/:productId
   */
  async getFramesByProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { storeId } = req.query;

      if (!productId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'PRODUCT_ID_REQUIRED',
            message: '商品IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      // storeIdが指定されていない場合はユーザーの店舗IDを使用
      const targetStoreId = (storeId as string) || req.user?.storeId;

      const frames = await frameService.getFramesByProduct(productId, targetStoreId);

      const response: ApiResponse = {
        success: true,
        data: frames
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] 商品別フレーム個体取得エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GET_FRAMES_BY_PRODUCT_FAILED',
          message: error.message || '商品別フレーム個体の取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * フレーム個体詳細取得
   * GET /api/frames/:id
   */
  async getFrameById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ID_REQUIRED',
            message: 'IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const frame = await frameService.getFrameById(id);

      if (!frame) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FRAME_NOT_FOUND',
            message: 'フレーム個体が見つかりません'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: frame
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] フレーム個体詳細取得エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GET_FRAME_FAILED',
          message: error.message || 'フレーム個体の取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * 個体番号検索
   * GET /api/frames/serial/:serialNumber
   */
  async getFrameBySerialNumber(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { serialNumber } = req.params;
      
      if (!serialNumber) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'SERIAL_NUMBER_REQUIRED',
            message: '個体番号が必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const frame = await frameService.getFrameBySerialNumber(serialNumber);

      if (!frame) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'FRAME_NOT_FOUND',
            message: '指定された個体番号のフレームが見つかりません'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: frame
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] 個体番号検索エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SEARCH_FRAME_FAILED',
          message: error.message || '個体番号検索に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * フレーム個体更新
   * PUT /api/frames/:id
   */
  async updateFrame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ID_REQUIRED',
            message: 'IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const frame = await frameService.updateFrame(id, updateData);

      const response: ApiResponse = {
        success: true,
        data: frame
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] フレーム個体更新エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UPDATE_FRAME_FAILED',
          message: error.message || 'フレーム個体の更新に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }

  /**
   * フレーム個体削除
   * DELETE /api/frames/:id
   */
  async deleteFrame(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'ID_REQUIRED',
            message: 'IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      await frameService.deleteFrame(id);

      const response: ApiResponse = {
        success: true,
        data: { message: 'フレーム個体が削除されました' }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] フレーム個体削除エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'DELETE_FRAME_FAILED',
          message: error.message || 'フレーム個体の削除に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }

  /**
   * 在庫サマリー取得
   * GET /api/frames/inventory-summary?storeId=xxx&productId=xxx
   */
  async getInventorySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { storeId, productId } = req.query;

      // storeIdが指定されていない場合はユーザーの店舗IDを使用
      const targetStoreId = (storeId as string) || req.user?.storeId;
      
      if (!targetStoreId) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'STORE_ID_REQUIRED',
            message: '店舗IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const summary = await frameService.getInventorySummary(targetStoreId, productId as string);

      const response: ApiResponse = {
        success: true,
        data: summary
      };

      res.json(response);

    } catch (error: any) {
      logger.error('[FRAME_CONTROLLER] 在庫サマリー取得エラー', { error });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GET_INVENTORY_SUMMARY_FAILED',
          message: error.message || '在庫サマリーの取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }
}

export const frameController = new FrameController();