import { db } from '../config/database';
import { Discount, OrderDiscount, UUID, DateString } from '../types';
import { logger } from '../utils/logger';

export class DiscountModel {
  /**
   * 有効な値引き一覧を取得
   */
  static async getActiveDiscounts(): Promise<Discount[]> {
    try {
      const query = `
        SELECT 
          id,
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          applicable_to,
          requires_manager_approval,
          max_uses,
          current_uses,
          is_active,
          display_order,
          valid_from,
          valid_to,
          description,
          created_by,
          created_at,
          updated_at
        FROM discounts
        WHERE is_active = true
          AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
          AND (valid_to IS NULL OR valid_to >= CURRENT_TIMESTAMP)
        ORDER BY display_order, name
      `;

      const result = await db.query(query);
      return result.rows.map((row: any) => this.mapToDiscount(row));
    } catch (error) {
      logger.error('Error fetching active discounts:', error);
      throw error;
    }
  }

  /**
   * IDで値引きを取得
   */
  static async getById(id: UUID): Promise<Discount | null> {
    try {
      const query = `
        SELECT 
          id,
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          applicable_to,
          requires_manager_approval,
          max_uses,
          current_uses,
          is_active,
          display_order,
          valid_from,
          valid_to,
          description,
          created_by,
          created_at,
          updated_at
        FROM discounts WHERE id = $1
      `;
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToDiscount(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching discount by ID:', error);
      throw error;
    }
  }

  /**
   * 値引きコードで値引きを取得
   */
  static async getByCode(discountCode: string): Promise<Discount | null> {
    try {
      const query = `
        SELECT 
          id,
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          applicable_to,
          requires_manager_approval,
          max_uses,
          current_uses,
          is_active,
          display_order,
          valid_from,
          valid_to,
          description,
          created_by,
          created_at,
          updated_at
        FROM discounts WHERE discount_code = $1
      `;
      const result = await db.query(query, [discountCode]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToDiscount(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching discount by code:', error);
      throw error;
    }
  }

  /**
   * 受注に値引きを適用
   */
  static async applyDiscountToOrder(
    orderId: UUID,
    discountId: UUID,
    originalAmount: number,
    discountAmount: number,
    userId?: UUID | undefined
  ): Promise<OrderDiscount> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');

      // 値引き情報を取得
      const discountQuery = `
        SELECT * FROM discounts WHERE id = $1
      `;
      const discountResult = await client.query(discountQuery, [discountId]);
      
      if (discountResult.rows.length === 0) {
        throw new Error('Discount not found');
      }
      
      const discount = discountResult.rows[0];
      
      // 受注値引きを作成
      const insertQuery = `
        INSERT INTO order_discounts (
          order_id,
          discount_id,
          discount_code,
          discount_name,
          discount_type,
          discount_value,
          original_amount,
          discount_amount,
          discounted_amount,
          approved_by,
          approved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        orderId,
        discountId,
        discount.discount_code,
        discount.name,
        discount.type,
        discount.value,
        originalAmount,
        discountAmount,
        originalAmount - discountAmount,
        discount.requires_manager_approval ? userId : null,
        discount.requires_manager_approval ? new Date() : null
      ];
      
      const result = await client.query(insertQuery, values);
      
      // 値引き使用回数を更新
      await client.query(
        'UPDATE discounts SET current_uses = current_uses + 1 WHERE id = $1',
        [discountId]
      );
      
      await client.query('COMMIT');
      
      return this.mapToOrderDiscount(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error applying discount to order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 受注の値引きを取得
   */
  static async getOrderDiscounts(orderId: UUID): Promise<OrderDiscount[]> {
    try {
      const query = `
        SELECT 
          od.*,
          d.name as discount_name,
          d.type as discount_type,
          d.value as discount_value,
          d.description
        FROM order_discounts od
        LEFT JOIN discounts d ON od.discount_id = d.id
        WHERE od.order_id = $1
      `;
      
      const result = await db.query(query, [orderId]);
      return result.rows.map((row: any) => this.mapToOrderDiscount(row));
    } catch (error) {
      logger.error('Error fetching order discounts:', error);
      throw error;
    }
  }

  /**
   * 受注から値引きを削除
   */
  static async removeDiscountFromOrder(orderId: UUID, discountId: UUID): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // 受注値引きを削除
      await client.query(
        'DELETE FROM order_discounts WHERE order_id = $1 AND discount_id = $2',
        [orderId, discountId]
      );
      
      // 値引き使用回数を減算
      await client.query(
        'UPDATE discounts SET current_uses = GREATEST(current_uses - 1, 0) WHERE id = $1',
        [discountId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error removing discount from order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * データベース行を Discount 型にマッピング
   */
  private static mapToDiscount(row: any): Discount {
    return {
      id: row.id,
      discountCode: row.discount_code,
      name: row.name,
      type: row.type,
      value: Number(row.value),
      minOrderAmount: Number(row.min_order_amount),
      maxDiscountAmount: row.max_discount_amount ? Number(row.max_discount_amount) : undefined,
      applicableTo: row.applicable_to,
      requiresManagerApproval: row.requires_manager_approval,
      maxUsesTotal: row.max_uses,
      maxUsesPerCustomer: row.max_uses, // 暫定的に同じ値を使用
      isActive: row.is_active,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      description: row.description,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * データベース行を OrderDiscount 型にマッピング
   */
  private static mapToOrderDiscount(row: any): OrderDiscount {
    return {
      id: row.id,
      orderId: row.order_id,
      discountId: row.discount_id,
      discountCode: row.discount_code,
      discountName: row.discount_name,
      discountType: row.discount_type,
      discountValue: Number(row.discount_value),
      originalAmount: Number(row.original_amount),
      discountAmount: Number(row.discount_amount),
      discountedAmount: Number(row.discounted_amount),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    };
  }
}