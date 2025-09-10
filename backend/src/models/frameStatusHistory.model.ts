import { Pool, PoolClient } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { 
  UUID, 
  DateString,
  FrameStatus
} from '../types';

export interface FrameStatusHistoryData {
  id: UUID;
  frame_id: UUID;
  old_status?: FrameStatus;
  new_status: FrameStatus;
  order_id?: UUID;
  changed_by: UUID;
  change_reason?: string;
  notes?: string;
  created_at: DateString;
}

export class FrameStatusHistoryModel {
  private pool: Pool;

  constructor() {
    this.pool = db.getPool();
  }

  /**
   * ステータス変更履歴を記録
   */
  async recordStatusChange(
    frameId: UUID,
    oldStatus: FrameStatus | null,
    newStatus: FrameStatus,
    changedBy: UUID,
    orderId?: UUID,
    changeReason?: string,
    notes?: string,
    client?: PoolClient
  ): Promise<FrameStatusHistoryData> {
    const useClient = client || this.pool;
    
    try {
      const query = `
        INSERT INTO frame_status_history (
          frame_id, old_status, new_status, order_id, 
          changed_by, change_reason, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      
      const values = [
        frameId,
        oldStatus,
        newStatus,
        orderId || null,
        changedBy,
        changeReason || null,
        notes || null
      ];

      const result = await useClient.query(query, values);
      logger.info(`ステータス履歴を記録しました: Frame ${frameId}, ${oldStatus || 'initial'} -> ${newStatus}`);
      
      return this.mapToFrameStatusHistory(result.rows[0]);
    } catch (error) {
      logger.error('ステータス履歴記録エラー:', error);
      throw error;
    }
  }

  /**
   * フレームのステータス履歴を取得
   */
  async getFrameStatusHistory(frameId: UUID): Promise<FrameStatusHistoryData[]> {
    try {
      const query = `
        SELECT 
          fsh.*,
          u.name as changed_by_name,
          u.user_code as changed_by_code,
          o.order_number
        FROM frame_status_history fsh
        LEFT JOIN users u ON fsh.changed_by = u.id
        LEFT JOIN orders o ON fsh.order_id = o.id
        WHERE fsh.frame_id = $1
        ORDER BY fsh.created_at DESC
      `;

      const result = await this.pool.query(query, [frameId]);
      return result.rows.map(row => this.mapToFrameStatusHistory(row));
    } catch (error) {
      logger.error('ステータス履歴取得エラー:', error);
      throw error;
    }
  }

  /**
   * 期間指定でステータス変更履歴を取得
   */
  async getStatusHistoryByDateRange(
    startDate: DateString,
    endDate: DateString,
    storeId?: UUID
  ): Promise<FrameStatusHistoryData[]> {
    try {
      let query = `
        SELECT 
          fsh.*,
          f.serial_number,
          p.name as product_name,
          u.name as changed_by_name
        FROM frame_status_history fsh
        JOIN frames f ON fsh.frame_id = f.id
        JOIN products p ON f.product_id = p.id
        JOIN users u ON fsh.changed_by = u.id
        WHERE fsh.created_at BETWEEN $1 AND $2
      `;
      
      const values: any[] = [startDate, endDate];
      
      if (storeId) {
        query += ` AND u.store_id = $3`;
        values.push(storeId);
      }
      
      query += ` ORDER BY fsh.created_at DESC`;

      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapToFrameStatusHistory(row));
    } catch (error) {
      logger.error('期間指定ステータス履歴取得エラー:', error);
      throw error;
    }
  }

  /**
   * 特定ステータスへの変更履歴を取得
   */
  async getStatusChangeHistory(
    targetStatus: FrameStatus,
    limit: number = 100
  ): Promise<FrameStatusHistoryData[]> {
    try {
      const query = `
        SELECT 
          fsh.*,
          f.serial_number,
          p.name as product_name,
          u.name as changed_by_name
        FROM frame_status_history fsh
        JOIN frames f ON fsh.frame_id = f.id
        JOIN products p ON f.product_id = p.id
        JOIN users u ON fsh.changed_by = u.id
        WHERE fsh.new_status = $1
        ORDER BY fsh.created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [targetStatus, limit]);
      return result.rows.map(row => this.mapToFrameStatusHistory(row));
    } catch (error) {
      logger.error('ステータス変更履歴取得エラー:', error);
      throw error;
    }
  }

  /**
   * 統計情報を取得
   */
  async getStatusChangeStatistics(
    startDate: DateString,
    endDate: DateString,
    storeId?: UUID
  ): Promise<any> {
    try {
      let query = `
        SELECT 
          new_status,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM frame_status_history fsh
        WHERE created_at BETWEEN $1 AND $2
      `;
      
      const values: any[] = [startDate, endDate];
      
      if (storeId) {
        query += ` AND EXISTS (
          SELECT 1 FROM users u 
          WHERE u.id = fsh.changed_by AND u.store_id = $3
        )`;
        values.push(storeId);
      }
      
      query += ` GROUP BY new_status, DATE_TRUNC('day', created_at)
                 ORDER BY date DESC, new_status`;

      const result = await this.pool.query(query, values);
      
      // 統計データを整形
      const statistics = result.rows.reduce((acc, row) => {
        const date = row.date.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = {};
        }
        acc[date][row.new_status] = parseInt(row.count);
        return acc;
      }, {});

      return statistics;
    } catch (error) {
      logger.error('ステータス変更統計取得エラー:', error);
      throw error;
    }
  }

  /**
   * データマッピング
   */
  private mapToFrameStatusHistory(row: any): FrameStatusHistoryData {
    return {
      id: row.id,
      frame_id: row.frame_id,
      old_status: row.old_status,
      new_status: row.new_status,
      order_id: row.order_id,
      changed_by: row.changed_by,
      change_reason: row.change_reason,
      notes: row.notes,
      created_at: row.created_at.toISOString(),
      // 追加情報（JOINした場合）
      ...(row.changed_by_name && { changed_by_name: row.changed_by_name }),
      ...(row.changed_by_code && { changed_by_code: row.changed_by_code }),
      ...(row.order_number && { order_number: row.order_number }),
      ...(row.serial_number && { serial_number: row.serial_number }),
      ...(row.product_name && { product_name: row.product_name })
    };
  }
}

export const frameStatusHistoryModel = new FrameStatusHistoryModel();