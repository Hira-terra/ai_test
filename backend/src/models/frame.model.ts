import { Pool, PoolClient } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export type FrameStatus = 'in_stock' | 'reserved' | 'sold' | 'damaged' | 'transferred';

export interface Frame {
  id: string;
  productId: string;
  storeId: string;
  serialNumber: string;
  color?: string;
  size?: string;
  purchaseDate: string;
  purchasePrice?: number;
  status: FrameStatus;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFrameData {
  productId: string;
  storeId: string;
  serialNumber: string;
  color?: string;
  size?: string;
  purchaseDate: string;
  purchasePrice?: number;
  status?: FrameStatus;
  location?: string;
}

export interface UpdateFrameData {
  color?: string;
  size?: string;
  purchasePrice?: number;
  status?: FrameStatus;
  location?: string;
}

export class FrameModel {
  /**
   * フレーム個体を作成
   */
  static async create(frameData: CreateFrameData): Promise<Frame> {
    const operationId = uuidv4();
    logger.info(`[FRAME_MODEL] フレーム個体作成開始: ${frameData.serialNumber}`, { operationId });

    const query = `
      INSERT INTO frames (
        id, product_id, store_id, serial_number, color, size, 
        purchase_date, purchase_price, status, location
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) RETURNING *
    `;

    const values = [
      uuidv4(),
      frameData.productId,
      frameData.storeId,
      frameData.serialNumber,
      frameData.color,
      frameData.size,
      frameData.purchaseDate,
      frameData.purchasePrice,
      frameData.status || 'in_stock',
      frameData.location
    ];

    try {
      const result = await db.query(query, values);
      
      if (result.rowCount === 0) {
        throw new Error('フレーム個体の作成に失敗しました');
      }

      const frame = this.transformRow(result.rows[0]);
      logger.info(`[FRAME_MODEL] フレーム個体作成完了: ${frame.serialNumber}`, { operationId });
      
      return frame;
    } catch (error) {
      logger.error(`[FRAME_MODEL] フレーム個体作成エラー: ${frameData.serialNumber}`, { error, operationId });
      throw error;
    }
  }

  /**
   * 複数フレーム個体を一括作成
   */
  static async createBulk(framesData: CreateFrameData[]): Promise<Frame[]> {
    const operationId = uuidv4();
    logger.info(`[FRAME_MODEL] フレーム個体一括作成開始: ${framesData.length}件`, { operationId });

    const client = await db.getPool().connect();

    try {
      await client.query('BEGIN');

      const frames: Frame[] = [];

      for (const frameData of framesData) {
        const query = `
          INSERT INTO frames (
            id, product_id, store_id, serial_number, color, size, 
            purchase_date, purchase_price, status, location
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          ) RETURNING *
        `;

        const values = [
          uuidv4(),
          frameData.productId,
          frameData.storeId,
          frameData.serialNumber,
          frameData.color,
          frameData.size,
          frameData.purchaseDate,
          frameData.purchasePrice,
          frameData.status || 'in_stock',
          frameData.location
        ];

        const result = await client.query(query, values);
        frames.push(this.transformRow(result.rows[0]));
      }

      await client.query('COMMIT');
      
      logger.info(`[FRAME_MODEL] フレーム個体一括作成完了: ${frames.length}件`, { operationId });
      return frames;

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[FRAME_MODEL] フレーム個体一括作成エラー`, { error, operationId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * フレーム個体をIDで取得
   */
  static async findById(id: string): Promise<Frame | null> {
    const query = `
      SELECT f.*, p.name as product_name, p.product_code
      FROM frames f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? this.transformRow(result.rows[0]) : null;
    } catch (error) {
      logger.error(`[FRAME_MODEL] フレーム個体取得エラー: ${id}`, { error });
      throw error;
    }
  }

  /**
   * フレーム個体を個体番号で取得
   */
  static async findBySerialNumber(serialNumber: string): Promise<Frame | null> {
    const query = `
      SELECT f.*, p.name as product_name, p.product_code
      FROM frames f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.serial_number = $1
    `;

    try {
      const result = await db.query(query, [serialNumber]);
      return result.rows.length > 0 ? this.transformRow(result.rows[0]) : null;
    } catch (error) {
      logger.error(`[FRAME_MODEL] 個体番号検索エラー: ${serialNumber}`, { error });
      throw error;
    }
  }

  /**
   * 商品ID別フレーム個体一覧取得
   */
  static async findByProductId(productId: string, storeId?: string): Promise<Frame[]> {
    let query = `
      SELECT f.*, p.name as product_name, p.product_code
      FROM frames f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.product_id = $1
    `;
    
    const params: any[] = [productId];

    if (storeId) {
      query += ` AND f.store_id = $2`;
      params.push(storeId);
    }

    query += ` ORDER BY f.created_at DESC`;

    try {
      const result = await db.query(query, params);
      return result.rows.map((row: any) => this.transformRow(row));
    } catch (error) {
      logger.error(`[FRAME_MODEL] 商品別フレーム個体取得エラー: ${productId}`, { error });
      throw error;
    }
  }

  /**
   * 店舗ID別フレーム個体一覧取得（フィルタ付き）
   */
  static async findByStore(storeId: string, filters?: {
    status?: FrameStatus;
    productId?: string;
    serialNumber?: string;
  }): Promise<Frame[]> {
    let query = `
      SELECT f.*, p.name as product_name, p.product_code, p.brand
      FROM frames f
      LEFT JOIN products p ON f.product_id = p.id
      WHERE f.store_id = $1
    `;
    
    const params: any[] = [storeId];
    let paramCount = 1;

    if (filters?.status) {
      query += ` AND f.status = $${++paramCount}`;
      params.push(filters.status);
    }

    if (filters?.productId) {
      query += ` AND f.product_id = $${++paramCount}`;
      params.push(filters.productId);
    }

    if (filters?.serialNumber) {
      query += ` AND f.serial_number ILIKE $${++paramCount}`;
      params.push(`%${filters.serialNumber}%`);
    }

    query += ` ORDER BY f.created_at DESC`;

    try {
      const result = await db.query(query, params);
      return result.rows.map((row: any) => this.transformRow(row));
    } catch (error) {
      logger.error(`[FRAME_MODEL] 店舗別フレーム個体取得エラー: ${storeId}`, { error });
      throw error;
    }
  }

  /**
   * フレーム個体を更新
   */
  static async update(id: string, updateData: UpdateFrameData): Promise<Frame | null> {
    const operationId = uuidv4();
    logger.info(`[FRAME_MODEL] フレーム個体更新開始: ${id}`, { operationId });

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${this.camelToSnake(key)} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('更新データがありません');
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE frames 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      
      if (result.rowCount === 0) {
        return null;
      }

      const frame = this.transformRow(result.rows[0]);
      logger.info(`[FRAME_MODEL] フレーム個体更新完了: ${id}`, { operationId });
      
      return frame;
    } catch (error) {
      logger.error(`[FRAME_MODEL] フレーム個体更新エラー: ${id}`, { error, operationId });
      throw error;
    }
  }

  /**
   * フレーム個体を削除
   */
  static async delete(id: string): Promise<boolean> {
    const operationId = uuidv4();
    logger.info(`[FRAME_MODEL] フレーム個体削除開始: ${id}`, { operationId });

    const query = `DELETE FROM frames WHERE id = $1`;

    try {
      const result = await db.query(query, [id]);
      const deleted = result.rowCount !== null && result.rowCount > 0;
      
      if (deleted) {
        logger.info(`[FRAME_MODEL] フレーム個体削除完了: ${id}`, { operationId });
      }

      return deleted;
    } catch (error) {
      logger.error(`[FRAME_MODEL] フレーム個体削除エラー: ${id}`, { error, operationId });
      throw error;
    }
  }

  /**
   * データベース行を型付きオブジェクトに変換
   */
  private static transformRow(row: any): Frame {
    return {
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      serialNumber: row.serial_number,
      color: row.color,
      size: row.size,
      purchaseDate: row.purchase_date,
      purchasePrice: row.purchase_price ? parseFloat(row.purchase_price) : undefined,
      status: row.status,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * camelCaseからsnake_caseに変換
   */
  private static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}