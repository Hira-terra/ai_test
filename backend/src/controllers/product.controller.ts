import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ProductService } from '../services/product.service';
import { logger } from '../utils/logger';
import { db } from '../config/database';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService(db.getPool());
  }

  /**
   * 商品一覧取得
   */
  public async getProducts(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { category, available_only } = req.query;
      
      logger.info(`[PRODUCT_CONTROLLER] 商品一覧取得リクエスト受信`);
      logger.info(`[PRODUCT_CONTROLLER] パラメータ: category=${category}, available_only=${available_only}`);

      const result = await this.productService.getAllProducts({
        category: category ? String(category) : undefined,
        availableOnly: available_only === 'true'
      });

      const duration = Date.now() - startTime;
      
      if (result.success) {
        logger.info(`[PRODUCT_CONTROLLER] 商品一覧取得完了: ${result.data?.length || 0}件 (${duration}ms)`);
        res.json(result);
      } else {
        logger.error(`[PRODUCT_CONTROLLER] 商品一覧取得エラー: ${result.error?.message}`);
        res.status(500).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_CONTROLLER] 商品一覧取得エラー (${duration}ms):`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '商品一覧の取得に失敗しました'
        }
      });
    }
  }

  /**
   * 商品詳細取得
   */
  public async getProductById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    const { id } = req.params;
    
    if (!id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '商品IDが必要です'
        }
      });
      return;
    }
    
    try {
      logger.info(`[PRODUCT_CONTROLLER] 商品詳細取得リクエスト受信: ${id}`);

      const result = await this.productService.getProductById(id);

      const duration = Date.now() - startTime;
      
      if (result.success) {
        logger.info(`[PRODUCT_CONTROLLER] 商品詳細取得完了: ${id} (${duration}ms)`);
        res.json(result);
      } else {
        const statusCode = result.error?.code === 'PRODUCT_NOT_FOUND' ? 404 : 500;
        logger.error(`[PRODUCT_CONTROLLER] 商品詳細取得エラー: ${result.error?.message}`);
        res.status(statusCode).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_CONTROLLER] 商品詳細取得エラー (${duration}ms):`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '商品詳細の取得に失敗しました'
        }
      });
    }
  }

  /**
   * フレーム一覧取得（在庫あり）
   */
  public async getAvailableFrames(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info(`[PRODUCT_CONTROLLER] フレーム一覧取得リクエスト受信`);

      const result = await this.productService.getAvailableFrames();

      const duration = Date.now() - startTime;
      
      if (result.success) {
        logger.info(`[PRODUCT_CONTROLLER] フレーム一覧取得完了: ${result.data?.length || 0}件 (${duration}ms)`);
        res.json(result);
      } else {
        logger.error(`[PRODUCT_CONTROLLER] フレーム一覧取得エラー: ${result.error?.message}`);
        res.status(500).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_CONTROLLER] フレーム一覧取得エラー (${duration}ms):`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'フレーム一覧の取得に失敗しました'
        }
      });
    }
  }
}