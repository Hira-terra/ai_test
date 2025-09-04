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
    search?: string;
    isActive?: boolean;
    managementType?: string;
    page?: number;
    limit?: number;
    availableOnly?: boolean;
  }): Promise<ApiResponse<Product[]>> {
    const startTime = Date.now();
    
    try {
      logger.info('[PRODUCT_SERVICE] 全商品取得開始');
      
      // WHERE条件の構築
      const whereClauses = [];
      const queryParams: any[] = [];
      let paramCounter = 1;

      // isActiveフィルター (availableOnlyの場合はtrue固定、それ以外は指定値またはtrueデフォルト)
      if (options?.availableOnly) {
        whereClauses.push(`is_active = true`);
      } else if (options?.isActive !== undefined) {
        whereClauses.push(`is_active = $${paramCounter}`);
        queryParams.push(options.isActive);
        paramCounter++;
      } else {
        whereClauses.push(`is_active = true`); // デフォルトは有効な商品のみ
      }

      // カテゴリーフィルター
      if (options?.category) {
        whereClauses.push(`category = $${paramCounter}`);
        queryParams.push(options.category);
        paramCounter++;
      }

      // 管理方式フィルター
      if (options?.managementType) {
        whereClauses.push(`management_type = $${paramCounter}`);
        queryParams.push(options.managementType);
        paramCounter++;
      }

      // 検索フィルター (商品名、商品コード、ブランド)
      if (options?.search) {
        whereClauses.push(`(
          name ILIKE $${paramCounter} OR 
          product_code ILIKE $${paramCounter} OR 
          brand ILIKE $${paramCounter}
        )`);
        queryParams.push(`%${options.search}%`);
        paramCounter++;
      }

      // カウント取得クエリ (ページング用)
      const countQuery = `
        SELECT COUNT(*) as total
        FROM products
        WHERE ${whereClauses.join(' AND ')}
      `;

      // メインクエリ
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
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY category, name
      `;

      // ページング
      const limit = options?.limit || 50;
      const page = options?.page || 1;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
      queryParams.push(limit, offset);

      logger.debug(`[PRODUCT_SERVICE] カウントクエリ実行: ${countQuery}`);
      logger.debug(`[PRODUCT_SERVICE] メインクエリ実行: ${query}`);
      logger.debug(`[PRODUCT_SERVICE] パラメータ:`, queryParams);

      // カウント取得
      const countResult = await this.db.query(countQuery, queryParams.slice(0, -2)); // LIMIT/OFFSET除外
      const total = parseInt(countResult.rows[0].total);
      
      // データ取得
      const result = await this.db.query(query, queryParams);
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 全商品取得完了: ${result.rows.length}件 (${duration}ms)`);
      
      // ページング情報の計算
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;
      
      return {
        success: true,
        data: result.rows as Product[],
        meta: {
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext,
            hasPrev
          }
        }
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
   * 商品新規作成
   */
  public async createProduct(productData: {
    productCode: string;
    name: string;
    brand?: string;
    category: string;
    managementType: string;
    costPrice?: number;
    retailPrice: number;
    supplier?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product>> {
    const startTime = Date.now();
    
    try {
      logger.info('[PRODUCT_SERVICE] 商品作成開始');
      
      const query = `
        INSERT INTO products (
          id, product_code, name, brand, category, management_type, 
          cost_price, retail_price, supplier, is_active, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
        )
        RETURNING 
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
      `;
      
      const result = await this.db.query(query, [
        productData.productCode,
        productData.name,
        productData.brand,
        productData.category,
        productData.managementType,
        productData.costPrice,
        productData.retailPrice,
        productData.supplier,
        productData.isActive !== false // デフォルトはtrue
      ]);
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 商品作成完了: ${productData.productCode} (${duration}ms)`);
      
      return {
        success: true,
        data: result.rows[0] as Product
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 商品作成エラー (${duration}ms):`, error);
      
      // 重複エラーの処理
      if (error.code === '23505') {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_PRODUCT_CODE',
            message: '商品コードが既に存在します'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '商品作成に失敗しました'
        }
      };
    }
  }

  /**
   * 商品更新
   */
  public async updateProduct(id: string, productData: {
    productCode: string;
    name: string;
    brand?: string;
    category: string;
    managementType: string;
    costPrice?: number;
    retailPrice: number;
    supplier?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product>> {
    const startTime = Date.now();
    
    try {
      logger.info(`[PRODUCT_SERVICE] 商品更新開始: ${id}`);
      
      const query = `
        UPDATE products SET
          product_code = $2,
          name = $3,
          brand = $4,
          category = $5,
          management_type = $6,
          cost_price = $7,
          retail_price = $8,
          supplier = $9,
          is_active = $10,
          updated_at = NOW()
        WHERE id = $1
        RETURNING 
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
      `;
      
      const result = await this.db.query(query, [
        id,
        productData.productCode,
        productData.name,
        productData.brand,
        productData.category,
        productData.managementType,
        productData.costPrice,
        productData.retailPrice,
        productData.supplier,
        productData.isActive !== false
      ]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '商品が見つかりません'
          }
        };
      }
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 商品更新完了: ${productData.productCode} (${duration}ms)`);
      
      return {
        success: true,
        data: result.rows[0] as Product
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 商品更新エラー (${duration}ms):`, error);
      
      if (error.code === '23505') {
        return {
          success: false,
          error: {
            code: 'DUPLICATE_PRODUCT_CODE',
            message: '商品コードが既に存在します'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '商品更新に失敗しました'
        }
      };
    }
  }

  /**
   * 商品削除
   */
  public async deleteProduct(id: string): Promise<ApiResponse<void>> {
    const startTime = Date.now();
    
    try {
      logger.info(`[PRODUCT_SERVICE] 商品削除開始: ${id}`);
      
      const query = `DELETE FROM products WHERE id = $1`;
      const result = await this.db.query(query, [id]);
      
      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: '商品が見つかりません'
          }
        };
      }
      
      const duration = Date.now() - startTime;
      logger.info(`[PRODUCT_SERVICE] 商品削除完了: ${id} (${duration}ms)`);
      
      return {
        success: true,
        data: undefined
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[PRODUCT_SERVICE] 商品削除エラー (${duration}ms):`, error);
      
      // 外部キー制約エラー
      if (error.code === '23503') {
        return {
          success: false,
          error: {
            code: 'PRODUCT_IN_USE',
            message: 'この商品は受注で使用されているため削除できません'
          }
        };
      }
      
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '商品削除に失敗しました'
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
      
      // framesテーブルが空の場合、productsテーブルのframe categoryから疑似フレームデータを生成
      const query = `
        SELECT 
          f.id,
          f.serial_number,
          f.color,
          f.size,
          f.status,
          f.location,
          p.id as product_id,
          p.product_code as "productCode",
          p.name,
          p.brand,
          p.category,
          p.cost_price as "costPrice",
          p.retail_price as "retailPrice",
          p.is_active as "isActive"
        FROM frames f
        INNER JOIN products p ON f.product_id = p.id
        WHERE f.status = 'in_stock' AND p.category = 'frame' AND p.is_active = true
        ORDER BY p.brand, p.name, f.serial_number
        LIMIT 20
      `;
      
      const result = await this.db.query(query);
      
      // 実際のframesテーブルからデータを取得
      const frames = result.rows.map((row: any) => ({
        id: row.id, // 正しいframe ID
        serialNumber: row.serial_number,
        product: {
          id: row.product_id,
          productCode: row.productCode,
          name: row.name,
          brand: row.brand,
          category: row.category,
          retailPrice: row.retailPrice,
          costPrice: row.costPrice,
          isActive: row.isActive
        },
        color: row.color || '標準色',
        size: row.size || 'M',
        status: row.status,
        location: row.location || 'メイン'
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