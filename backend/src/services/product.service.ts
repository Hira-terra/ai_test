import { Pool } from 'pg';
import { ApiResponse, Product } from '../types';
import { logger } from '../utils/logger';

export class ProductService {
  constructor(private db: Pool) {}

  /**
   * 全商品取得
   */
  public async getAllProducts(options?: {
    category?: string;
    availableOnly?: boolean;
  }): Promise<ApiResponse<Product[]>> {
    const startTime = Date.now();
    
    try {
      logger.info('[PRODUCT_SERVICE] 全商品取得開始');
      
      let query = `
        SELECT 
          id,
          product_code as "productCode",
          name,
          brand,
          category,
          management_type as "managementType",
          cost_price as "costPrice",
          retail_price as "retailPrice",
          supplier,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM products
        WHERE is_active = true
      `;
      
      const queryParams: any[] = [];
      let paramCounter = 1;
      
      if (options?.category) {
        query += ` AND category = $${paramCounter}`;
        queryParams.push(options.category);
        paramCounter++;
      }
      
      query += ' ORDER BY category, name';
      
      logger.debug(`[PRODUCT_SERVICE] クエリ実行: ${query}`);
      logger.debug(`[PRODUCT_SERVICE] パラメータ:`, queryParams);
      
      const result = await this.db.query(query, queryParams);
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 全商品取得完了: ${result.rows.length}件 (${duration}ms)`);
      
      return {
        success: true,
        data: result.rows as Product[]
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 全商品取得エラー (${duration}ms):`, error);
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '商品の取得に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 商品詳細取得
   */
  public async getProductById(id: string): Promise<ApiResponse<Product>> {
    const startTime = Date.now();
    
    try {
      logger.info(`[PRODUCT_SERVICE] 商品詳細取得開始: ${id}`);
      
      const query = `
        SELECT 
          id,
          product_code as "productCode",
          name,
          brand,
          category,
          management_type as "managementType",
          cost_price as "costPrice",
          retail_price as "retailPrice",
          supplier,
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM products
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await this.db.query(query, [id]);
      
      const duration = Date.now() - startTime;
      
      if (result.rows.length === 0) {
        logger.warn(`[PRODUCT_SERVICE] 商品が見つかりません: ${id} (${duration}ms)`);
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '指定された商品が見つかりません'
          }
        };
      }
      
      logger.info(`[PRODUCT_SERVICE] 商品詳細取得完了: ${id} (${duration}ms)`);
      
      return {
        success: true,
        data: result.rows[0] as Product
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 商品詳細取得エラー (${duration}ms):`, error);
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '商品詳細の取得に失敗しました',
          details: error.message
        }
      };
    }
  }

  /**
   * 利用可能フレーム取得（在庫管理との連携は今後実装）
   */
  public async getAvailableFrames(): Promise<ApiResponse<any[]>> {
    const startTime = Date.now();
    
    try {
      logger.info('[PRODUCT_SERVICE] 利用可能フレーム取得開始');
      
      // 現時点では、フレームカテゴリの商品をベースにモック的なフレーム情報を返す
      const query = `
        SELECT 
          id,
          product_code as "productCode",
          name,
          brand,
          category,
          management_type as "managementType",
          cost_price as "costPrice",
          retail_price as "retailPrice",
          supplier,
          is_active as "isActive"
        FROM products
        WHERE category = 'frame' AND is_active = true
        ORDER BY brand, name
        LIMIT 20
      `;
      
      const result = await this.db.query(query);
      
      // フレーム情報にモック的な詳細情報を付与
      const frames = result.rows.map((product: any, index: number) => ({
        id: `frame_${product.id}`,
        serialNumber: `${product.productCode}-${String(index + 1).padStart(3, '0')}`,
        product: {
          id: product.id,
          productCode: product.productCode,
          name: product.name,
          brand: product.brand,
          category: product.category,
          retailPrice: product.retailPrice,
          costPrice: product.costPrice,
          isActive: product.isActive
        },
        color: ['ブラック', 'ブラウン', 'シルバー', 'ゴールド', 'ブルー'][index % 5],
        size: ['52-16', '54-16', '56-16', '50-18', '52-18'][index % 5],
        status: 'available' as const,
        location: 'A-01'
      }));
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 利用可能フレーム取得完了: ${frames.length}件 (${duration}ms)`);
      
      return {
        success: true,
        data: frames
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 利用可能フレーム取得エラー (${duration}ms):`, error);
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'フレーム情報の取得に失敗しました',
          details: error.message
        }
      };
    }
  }
}