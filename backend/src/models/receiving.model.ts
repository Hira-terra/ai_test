import { db } from '../config/database';
import { logger } from '../utils/logger';
import { DatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { Receiving, ReceivingItem, ReceivingStatus, QualityStatus } from '../types';

export class ReceivingModel {
  /**
   * 入庫待ち発注一覧を取得
   */
  static async getPendingPurchaseOrders(storeId?: string) {
    const operationId = `receiving_get_pending_${Date.now()}`;
    
    try {
      let query = `
        SELECT 
          po.id,
          po.purchase_order_number,
          po.supplier_id,
          s.name as supplier_name,
          po.order_date,
          po.expected_delivery_date,
          po.status,
          po.total_amount,
          po.notes,
          COUNT(poi.id) as item_count,
          COALESCE(
            SUM(
              CASE 
                WHEN ri.received_quantity IS NULL THEN poi.quantity
                ELSE poi.quantity - ri.received_quantity
              END
            ), 
            SUM(poi.quantity)
          ) as pending_quantity
        FROM purchase_orders po
        INNER JOIN suppliers s ON po.supplier_id = s.id
        INNER JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
        LEFT JOIN receiving_items ri ON poi.id = ri.purchase_order_item_id
        WHERE po.status IN ('sent', 'confirmed')
      `;

      const params: any[] = [];
      if (storeId) {
        query += ` AND po.store_id = $1`;
        params.push(storeId);
      }

      query += `
        GROUP BY po.id, po.purchase_order_number, po.supplier_id, s.name, 
                 po.order_date, po.expected_delivery_date, po.status, 
                 po.total_amount, po.notes
        HAVING COALESCE(
          SUM(
            CASE 
              WHEN ri.received_quantity IS NULL THEN poi.quantity
              ELSE poi.quantity - ri.received_quantity
            END
          ), 
          SUM(poi.quantity)
        ) > 0
        ORDER BY po.expected_delivery_date ASC
      `;

      logger.info(`[${operationId}] 入庫待ち発注一覧取得`, { storeId });
      const result = await db.query(query, params);
      
      return result.rows;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫待ち発注一覧取得エラー`, error);
      throw new DatabaseError('入庫待ち発注一覧の取得に失敗しました');
    }
  }

  /**
   * 発注書の詳細と明細を取得
   */
  static async getPurchaseOrderWithItems(purchaseOrderId: string) {
    const operationId = `receiving_get_po_detail_${Date.now()}`;
    
    try {
      // 発注書ヘッダー取得
      const poQuery = `
        SELECT 
          po.*,
          s.name as supplier_name,
          s.supplier_code,
          st.name as store_name
        FROM purchase_orders po
        INNER JOIN suppliers s ON po.supplier_id = s.id
        INNER JOIN stores st ON po.store_id = st.id
        WHERE po.id = $1
      `;
      
      const poResult = await db.query(poQuery, [purchaseOrderId]);
      
      if (poResult.rows.length === 0) {
        throw new NotFoundError('発注書が見つかりません');
      }

      // 発注明細と入庫状況を取得
      const itemsQuery = `
        SELECT 
          poi.id,
          poi.product_id,
          p.product_code,
          p.name as product_name,
          poi.quantity as ordered_quantity,
          poi.unit_cost,
          poi.total_cost,
          poi.specifications,
          poi.notes,
          COALESCE(SUM(ri.received_quantity), 0) as received_quantity,
          poi.quantity - COALESCE(SUM(ri.received_quantity), 0) as pending_quantity
        FROM purchase_order_items poi
        INNER JOIN products p ON poi.product_id = p.id
        LEFT JOIN receiving_items ri ON poi.id = ri.purchase_order_item_id
        WHERE poi.purchase_order_id = $1
        GROUP BY poi.id, poi.product_id, p.product_code, p.name, 
                 poi.quantity, poi.unit_cost, poi.total_cost, 
                 poi.specifications, poi.notes
      `;
      
      const itemsResult = await db.query(itemsQuery, [purchaseOrderId]);

      return {
        purchaseOrder: poResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`[${operationId}] 発注書詳細取得エラー`, error);
      throw new DatabaseError('発注書詳細の取得に失敗しました');
    }
  }

  /**
   * 入庫登録
   */
  static async createReceiving(data: {
    purchaseOrderId: string;
    receivedBy: string;
    receivedDate?: Date;
    notes?: string;
    items: Array<{
      purchaseOrderItemId: string;
      receivedQuantity: number;
      qualityStatus: QualityStatus;
      actualCost?: number;
      notes?: string;
    }>;
  }) {
    const operationId = `receiving_create_${Date.now()}`;
    
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // 入庫番号生成
      const receivingNumber = await this.generateReceivingNumber();
      
      // 入庫ヘッダー作成
      const receivingQuery = `
        INSERT INTO receiving (
          receiving_number,
          purchase_order_id,
          received_date,
          received_by,
          status,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const receivingValues = [
        receivingNumber,
        data.purchaseOrderId,
        data.receivedDate || new Date(),
        data.receivedBy,
        'partial', // 初期ステータス
        data.notes
      ];
      
      const receivingResult = await client.query(receivingQuery, receivingValues);
      const receiving = receivingResult.rows[0];
      
      // 入庫明細作成
      const receivingItems = [];
      for (const item of data.items) {
        if (item.receivedQuantity > 0) {
          const itemQuery = `
            INSERT INTO receiving_items (
              receiving_id,
              purchase_order_item_id,
              expected_quantity,
              received_quantity,
              quality_status,
              actual_cost,
              notes
            ) 
            SELECT 
              $1,
              $2,
              poi.quantity,
              $3,
              $4,
              $5,
              $6
            FROM purchase_order_items poi
            WHERE poi.id = $2
            RETURNING *
          `;
          
          const itemValues = [
            receiving.id,
            item.purchaseOrderItemId,
            item.receivedQuantity,
            item.qualityStatus,
            item.actualCost,
            item.notes
          ];
          
          const itemResult = await client.query(itemQuery, itemValues);
          receivingItems.push(itemResult.rows[0]);
        }
      }
      
      // 発注ステータス更新チェック
      await this.updatePurchaseOrderStatus(client, data.purchaseOrderId);
      
      // 入庫ステータス更新
      await this.updateReceivingStatus(client, receiving.id);
      
      await client.query('COMMIT');
      
      logger.info(`[${operationId}] 入庫登録完了`, {
        receivingId: receiving.id,
        receivingNumber,
        itemCount: receivingItems.length
      });
      
      return {
        receiving,
        items: receivingItems
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 入庫登録エラー`, error);
      throw new DatabaseError('入庫登録に失敗しました');
    } finally {
      client.release();
    }
  }

  /**
   * 入庫番号生成
   */
  private static async generateReceivingNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const prefix = `RCV${year}${month}${day}`;
    
    const query = `
      SELECT receiving_number 
      FROM receiving 
      WHERE receiving_number LIKE $1 
      ORDER BY receiving_number DESC 
      LIMIT 1
    `;
    
    const result = await db.query(query, [`${prefix}%`]);
    
    if (result.rows.length === 0) {
      return `${prefix}001`;
    }
    
    const lastNumber = result.rows[0].receiving_number;
    const sequence = parseInt(lastNumber.slice(-3)) + 1;
    return `${prefix}${String(sequence).padStart(3, '0')}`;
  }

  /**
   * 発注ステータス更新
   */
  private static async updatePurchaseOrderStatus(client: any, purchaseOrderId: string) {
    const checkQuery = `
      SELECT 
        SUM(poi.quantity) as total_ordered,
        SUM(COALESCE(ri.received_quantity, 0)) as total_received
      FROM purchase_order_items poi
      LEFT JOIN receiving_items ri ON poi.id = ri.purchase_order_item_id
      WHERE poi.purchase_order_id = $1
    `;
    
    const result = await client.query(checkQuery, [purchaseOrderId]);
    const { total_ordered, total_received } = result.rows[0];
    
    if (total_received >= total_ordered) {
      // 全数入庫完了
      await client.query(
        'UPDATE purchase_orders SET status = $1, actual_delivery_date = $2 WHERE id = $3',
        ['delivered', new Date(), purchaseOrderId]
      );
    }
  }

  /**
   * 入庫ステータス更新
   */
  private static async updateReceivingStatus(client: any, receivingId: string) {
    const checkQuery = `
      SELECT 
        SUM(expected_quantity) as total_expected,
        SUM(received_quantity) as total_received,
        COUNT(CASE WHEN quality_status != 'good' THEN 1 END) as issue_count
      FROM receiving_items
      WHERE receiving_id = $1
    `;
    
    const result = await client.query(checkQuery, [receivingId]);
    const { total_expected, total_received, issue_count } = result.rows[0];
    
    let status: ReceivingStatus = 'partial';
    if (total_received >= total_expected) {
      status = issue_count > 0 ? 'with_issues' : 'complete';
    }
    
    await client.query(
      'UPDATE receiving SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, receivingId]
    );
  }

  /**
   * 入庫履歴取得
   */
  static async getReceivingHistory(filters: {
    storeId?: string;
    supplierId?: string;
    fromDate?: Date;
    toDate?: Date;
    status?: ReceivingStatus;
  }) {
    const operationId = `receiving_history_${Date.now()}`;
    
    try {
      let query = `
        SELECT 
          r.id,
          r.receiving_number,
          r.received_date,
          r.status,
          r.notes,
          po.purchase_order_number,
          po.total_amount,
          s.name as supplier_name,
          u.name as received_by_name,
          COUNT(ri.id) as item_count,
          SUM(ri.received_quantity) as total_quantity
        FROM receiving r
        INNER JOIN purchase_orders po ON r.purchase_order_id = po.id
        INNER JOIN suppliers s ON po.supplier_id = s.id
        INNER JOIN users u ON r.received_by = u.id
        INNER JOIN receiving_items ri ON r.id = ri.receiving_id
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramCount = 1;
      
      if (filters.storeId) {
        query += ` AND po.store_id = $${paramCount++}`;
        params.push(filters.storeId);
      }
      
      if (filters.supplierId) {
        query += ` AND po.supplier_id = $${paramCount++}`;
        params.push(filters.supplierId);
      }
      
      if (filters.fromDate) {
        query += ` AND r.received_date >= $${paramCount++}`;
        params.push(filters.fromDate);
      }
      
      if (filters.toDate) {
        query += ` AND r.received_date <= $${paramCount++}`;
        params.push(filters.toDate);
      }
      
      if (filters.status) {
        query += ` AND r.status = $${paramCount++}`;
        params.push(filters.status);
      }
      
      query += `
        GROUP BY r.id, r.receiving_number, r.received_date, r.status, r.notes,
                 po.purchase_order_number, po.total_amount, s.name, u.name
        ORDER BY r.received_date DESC
      `;
      
      const result = await db.query(query, params);
      
      return result.rows;
    } catch (error: any) {
      logger.error(`[${operationId}] 入庫履歴取得エラー`, error);
      throw new DatabaseError('入庫履歴の取得に失敗しました');
    }
  }

  /**
   * 入庫詳細取得
   */
  static async getReceivingDetail(receivingId: string) {
    const operationId = `receiving_detail_${Date.now()}`;
    
    try {
      // 入庫ヘッダー取得
      const headerQuery = `
        SELECT 
          r.*,
          po.purchase_order_number,
          s.name as supplier_name,
          u.name as received_by_name
        FROM receiving r
        INNER JOIN purchase_orders po ON r.purchase_order_id = po.id
        INNER JOIN suppliers s ON po.supplier_id = s.id
        INNER JOIN users u ON r.received_by = u.id
        WHERE r.id = $1
      `;
      
      const headerResult = await db.query(headerQuery, [receivingId]);
      
      if (headerResult.rows.length === 0) {
        throw new NotFoundError('入庫データが見つかりません');
      }
      
      // 入庫明細取得
      const itemsQuery = `
        SELECT 
          ri.*,
          p.product_code,
          p.name as product_name,
          poi.unit_cost as ordered_unit_cost
        FROM receiving_items ri
        INNER JOIN purchase_order_items poi ON ri.purchase_order_item_id = poi.id
        INNER JOIN products p ON poi.product_id = p.id
        WHERE ri.receiving_id = $1
      `;
      
      const itemsResult = await db.query(itemsQuery, [receivingId]);
      
      return {
        receiving: headerResult.rows[0],
        items: itemsResult.rows
      };
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`[${operationId}] 入庫詳細取得エラー`, error);
      throw new DatabaseError('入庫詳細の取得に失敗しました');
    }
  }
}