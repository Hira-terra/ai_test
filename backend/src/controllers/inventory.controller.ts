import { Response, NextFunction } from 'express';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { AuthenticatedRequest as AuthRequest } from '../middleware/auth';

export const inventoryController = {
  /**
   * 数量管理商品の在庫一覧取得
   */
  async getStockItems(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    const operationId = `inventory_stock_items_${Date.now()}`;
    
    try {
      const { storeId, productId, lowStock, page = 1, limit = 50 } = req.query;
      const userStoreId = req.user?.storeId;
      
      // 権限チェック: adminでない場合は自店舗のみ
      const targetStoreId = req.user?.role === 'admin' && storeId 
        ? storeId as string 
        : userStoreId;

      logger.info(`[${operationId}] 在庫一覧取得`, { 
        userId: req.user?.userId,
        storeId: targetStoreId,
        filters: { productId, lowStock, page, limit }
      });

      let query = `
        SELECT 
          sl.id,
          sl.product_id,
          sl.store_id,
          sl.current_quantity,
          sl.safety_stock,
          sl.max_stock,
          sl.last_order_quantity,
          sl.last_order_date,
          sl.average_usage,
          sl.auto_order_enabled,
          sl.notes,
          sl.created_at,
          sl.updated_at,
          p.product_code,
          p.name as product_name,
          p.brand,
          p.category,
          p.management_type,
          p.cost_price,
          p.retail_price,
          p.supplier,
          p.is_active,
          s.name as store_name
        FROM stock_levels sl
        INNER JOIN products p ON sl.product_id = p.id
        INNER JOIN stores s ON sl.store_id = s.id
        WHERE p.management_type = 'quantity'
      `;

      const params: any[] = [];
      let paramCount = 1;

      if (targetStoreId) {
        query += ` AND sl.store_id = $${paramCount}`;
        params.push(targetStoreId);
        paramCount++;
      }

      if (productId) {
        query += ` AND sl.product_id = $${paramCount}`;
        params.push(productId);
        paramCount++;
      }

      if (lowStock === 'true') {
        query += ` AND sl.current_quantity <= sl.safety_stock`;
      }

      query += ` ORDER BY p.name ASC`;

      // ページネーション
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      params.push(parseInt(limit as string), offset);

      const result = await db.query(query, params);

      // データ変換
      const stockItems = result.rows.map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        storeId: row.store_id,
        currentStock: row.current_quantity,
        minStock: row.safety_stock,
        maxStock: row.max_stock,
        lastOrderQuantity: row.last_order_quantity,
        lastOrderDate: row.last_order_date,
        averageUsage: parseFloat(row.average_usage || 0),
        autoOrderEnabled: row.auto_order_enabled,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        product: {
          id: row.product_id,
          productCode: row.product_code,
          name: row.product_name,
          brand: row.brand,
          category: row.category,
          managementType: row.management_type,
          costPrice: parseFloat(row.cost_price || 0),
          retailPrice: parseFloat(row.retail_price || 0),
          supplier: row.supplier,
          isActive: row.is_active
        },
        store: {
          id: row.store_id,
          name: row.store_name
        }
      }));

      // 総件数取得
      const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY[\s\S]*$/, '').replace(/LIMIT[\s\S]*$/, '');
      const countResult = await db.query(countQuery, params.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      logger.info(`[${operationId}] 在庫一覧取得完了`, { 
        count: stockItems.length,
        total
      });

      res.json({
        success: true,
        data: stockItems,
        meta: {
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string)),
            hasNext: (parseInt(page as string) * parseInt(limit as string)) < total,
            hasPrev: parseInt(page as string) > 1
          }
        }
      });
    } catch (error: any) {
      logger.error(`[${operationId}] 在庫一覧取得エラー`, error);
      next(error);
    }
  },

  /**
   * 在庫数量更新
   */
  async updateStock(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> {
    const operationId = `inventory_update_stock_${Date.now()}`;
    
    try {
      const { productId } = req.params;
      const { quantity, reason } = req.body;
      const userStoreId = req.user?.storeId;
      const userId = req.user?.userId;

      logger.info(`[${operationId}] 在庫数量更新開始`, { 
        userId,
        storeId: userStoreId,
        productId,
        quantity,
        reason
      });

      // バリデーション
      if (!productId || quantity === undefined || !reason) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '商品ID、数量、理由は必須です。'
          }
        });
      }

      if (!Number.isInteger(quantity)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数量は整数で入力してください。'
          }
        });
      }

      // 在庫レコードの存在確認
      const checkQuery = `
        SELECT sl.*, p.name as product_name
        FROM stock_levels sl
        INNER JOIN products p ON sl.product_id = p.id
        WHERE sl.product_id = $1 AND sl.store_id = $2
      `;
      const checkResult = await db.query(checkQuery, [productId, userStoreId]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された商品の在庫レコードが見つかりません。'
          }
        });
      }

      const currentStock = checkResult.rows[0];
      const newQuantity = currentStock.current_quantity + quantity;

      // 在庫数量をマイナスにしない
      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `在庫数量がマイナスになります。現在の在庫: ${currentStock.current_quantity}, 調整数量: ${quantity}`
          }
        });
      }

      // 在庫更新
      const updateQuery = `
        UPDATE stock_levels 
        SET 
          current_quantity = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_id = $2 AND store_id = $3
        RETURNING *
      `;
      
      const updateResult = await db.query(updateQuery, [newQuantity, productId, userStoreId]);
      const updatedStock = updateResult.rows[0];

      // 在庫調整履歴の記録
      const historyQuery = `
        INSERT INTO stock_adjustment_history (
          product_id,
          store_id,
          adjustment_type,
          quantity_before,
          quantity_after,
          adjustment_quantity,
          reason,
          adjusted_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      `;
      
      const adjustmentType = quantity > 0 ? 'increase' : 'decrease';
      await db.query(historyQuery, [
        productId,
        userStoreId,
        adjustmentType,
        currentStock.current_quantity,
        newQuantity,
        quantity,
        reason,
        userId
      ]);

      logger.info(`[${operationId}] 在庫数量更新完了`, { 
        productId,
        productName: currentStock.product_name,
        quantityBefore: currentStock.current_quantity,
        quantityAfter: newQuantity,
        adjustmentQuantity: quantity,
        reason
      });

      res.json({
        success: true,
        data: {
          id: updatedStock.id,
          productId: updatedStock.product_id,
          storeId: updatedStock.store_id,
          currentStock: updatedStock.current_quantity,
          minStock: updatedStock.safety_stock,
          maxStock: updatedStock.max_stock,
          updatedAt: updatedStock.updated_at,
          createdAt: updatedStock.created_at
        },
        message: `在庫数量を更新しました。${currentStock.product_name}: ${currentStock.current_quantity} → ${newQuantity}`
      });

    } catch (error: any) {
      logger.error(`[${operationId}] 在庫数量更新エラー`, error);
      next(error);
    }
  }
};