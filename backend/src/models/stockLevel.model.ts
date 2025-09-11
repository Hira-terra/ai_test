import { Pool } from 'pg';
import { StockLevel, StockLevelAlert } from '../types';

export class StockLevelModel {
  constructor(private db: Pool) {}

  /**
   * 在庫レベル一覧を取得
   */
  async findAll(params?: {
    storeId?: string;
    productId?: string;
    lowStockOnly?: boolean;
    autoOrderEnabled?: boolean;
    productCategory?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ stockLevels: StockLevel[]; total: number }> {
    let whereConditions: string[] = ['1=1'];
    let queryParams: any[] = [];
    let paramCount = 1;

    // フィルタ条件の構築
    if (params?.storeId) {
      whereConditions.push(`sl.store_id = $${paramCount++}`);
      queryParams.push(params.storeId);
    }
    if (params?.productId) {
      whereConditions.push(`sl.product_id = $${paramCount++}`);
      queryParams.push(params.productId);
    }
    if (params?.lowStockOnly) {
      whereConditions.push(`sl.current_quantity <= sl.safety_stock`);
    }
    if (params?.autoOrderEnabled !== undefined) {
      whereConditions.push(`sl.auto_order_enabled = $${paramCount++}`);
      queryParams.push(params.autoOrderEnabled);
    }
    if (params?.productCategory) {
      whereConditions.push(`p.category = $${paramCount++}`);
      queryParams.push(params.productCategory);
    }

    // ソート条件
    let orderClause = 'ORDER BY sl.created_at DESC';
    if (params?.sort) {
      const [field, direction] = params.sort.split('_');
      const validFields = ['currentQuantity', 'safetyStock', 'productName', 'storeName'];
      if (field && validFields.includes(field)) {
        const dbField = field === 'currentQuantity' ? 'current_quantity' :
                       field === 'safetyStock' ? 'safety_stock' :
                       field === 'productName' ? 'p.name' :
                       field === 'storeName' ? 's.name' : field;
        orderClause = `ORDER BY ${dbField} ${(direction || 'asc') === 'desc' ? 'DESC' : 'ASC'}`;
      }
    }

    // COUNT クエリ
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_levels sl
      LEFT JOIN products p ON sl.product_id = p.id
      LEFT JOIN stores s ON sl.store_id = s.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // データ取得クエリ
    const dataQuery = `
      SELECT 
        sl.id,
        sl.product_id as "productId",
        sl.store_id as "storeId",
        sl.current_quantity as "currentQuantity",
        sl.safety_stock as "safetyStock",
        sl.max_stock as "maxStock",
        sl.last_order_quantity as "lastOrderQuantity",
        sl.last_order_date as "lastOrderDate",
        sl.average_usage as "averageUsage",
        sl.auto_order_enabled as "autoOrderEnabled",
        sl.notes,
        sl.created_at as "createdAt",
        sl.updated_at as "updatedAt",
        -- 商品情報
        p.id as "product.id",
        p.product_code as "product.productCode",
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.retail_price as "product.retailPrice",
        p.cost_price as "product.costPrice",
        -- 店舗情報
        s.id as "store.id",
        s.store_code as "store.storeCode",
        s.name as "store.name",
        s.address as "store.address"
      FROM stock_levels sl
      LEFT JOIN products p ON sl.product_id = p.id
      LEFT JOIN stores s ON sl.store_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ${orderClause}
      ${params?.limit ? `LIMIT $${paramCount++}` : ''}
      ${params?.offset ? `OFFSET $${paramCount++}` : ''}
    `;

    // LIMIT/OFFSETパラメータを追加
    if (params?.limit) queryParams.push(params.limit);
    if (params?.offset) queryParams.push(params.offset);

    const result = await this.db.query(dataQuery, queryParams);
    
    // 結果の変換
    const stockLevels = result.rows.map(row => this.transformStockLevelRow(row));

    return { stockLevels, total };
  }

  /**
   * 在庫レベルをIDで取得
   */
  async findById(id: string): Promise<StockLevel | null> {
    const query = `
      SELECT 
        sl.id,
        sl.product_id as "productId",
        sl.store_id as "storeId",
        sl.current_quantity as "currentQuantity",
        sl.safety_stock as "safetyStock",
        sl.max_stock as "maxStock",
        sl.last_order_quantity as "lastOrderQuantity",
        sl.last_order_date as "lastOrderDate",
        sl.average_usage as "averageUsage",
        sl.auto_order_enabled as "autoOrderEnabled",
        sl.notes,
        sl.created_at as "createdAt",
        sl.updated_at as "updatedAt",
        -- 商品情報
        p.id as "product.id",
        p.product_code as "product.productCode",
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.retail_price as "product.retailPrice",
        p.cost_price as "product.costPrice",
        -- 店舗情報
        s.id as "store.id",
        s.store_code as "store.storeCode",
        s.name as "store.name",
        s.address as "store.address"
      FROM stock_levels sl
      LEFT JOIN products p ON sl.product_id = p.id
      LEFT JOIN stores s ON sl.store_id = s.id
      WHERE sl.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;

    return this.transformStockLevelRow(result.rows[0]);
  }

  /**
   * 在庫レベルの更新
   */
  async updateQuantity(id: string, currentQuantity: number): Promise<StockLevel | null> {
    const query = `
      UPDATE stock_levels 
      SET 
        current_quantity = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await this.db.query(query, [id, currentQuantity]);
    return this.findById(id);
  }

  /**
   * 在庫アラートを取得
   */
  async findAlerts(params?: {
    storeId?: string;
    alertType?: 'low_stock' | 'out_of_stock' | 'overstocked';
    isResolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: StockLevelAlert[]; total: number }> {
    let whereConditions: string[] = ['1=1'];
    let queryParams: any[] = [];
    let paramCount = 1;

    // フィルタ条件の構築
    if (params?.storeId) {
      whereConditions.push(`sl.store_id = $${paramCount++}`);
      queryParams.push(params.storeId);
    }
    if (params?.alertType) {
      whereConditions.push(`sla.alert_type = $${paramCount++}`);
      queryParams.push(params.alertType);
    }
    if (params?.isResolved !== undefined) {
      whereConditions.push(`sla.is_resolved = $${paramCount++}`);
      queryParams.push(params.isResolved);
    }

    // COUNT クエリ
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_level_alerts sla
      LEFT JOIN stock_levels sl ON sla.stock_level_id = sl.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // データ取得クエリ
    const dataQuery = `
      SELECT 
        sla.id,
        sla.stock_level_id as "stockLevelId",
        sla.alert_type as "alertType",
        sla.current_quantity as "currentQuantity",
        sla.threshold_quantity as "thresholdQuantity",
        sla.suggested_order_quantity as "suggestedOrderQuantity",
        sla.is_resolved as "isResolved",
        sla.resolved_at as "resolvedAt",
        sla.created_at as "createdAt",
        -- 在庫レベル情報
        sl.product_id as "stockLevel.productId",
        sl.store_id as "stockLevel.storeId",
        -- 商品情報
        p.name as "stockLevel.product.name",
        p.product_code as "stockLevel.product.productCode",
        p.category as "stockLevel.product.category",
        -- 店舗情報
        s.name as "stockLevel.store.name",
        s.store_code as "stockLevel.store.storeCode"
      FROM stock_level_alerts sla
      LEFT JOIN stock_levels sl ON sla.stock_level_id = sl.id
      LEFT JOIN products p ON sl.product_id = p.id
      LEFT JOIN stores s ON sl.store_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY sla.created_at DESC
      ${params?.limit ? `LIMIT $${paramCount++}` : ''}
      ${params?.offset ? `OFFSET $${paramCount++}` : ''}
    `;

    // LIMIT/OFFSETパラメータを追加
    if (params?.limit) queryParams.push(params.limit);
    if (params?.offset) queryParams.push(params.offset);

    const result = await this.db.query(dataQuery, queryParams);
    
    // 結果の変換
    const alerts = result.rows.map(row => this.transformAlertRow(row));

    return { alerts, total };
  }

  /**
   * 発注提案を取得
   */
  async getSuggestedOrders(storeId: string): Promise<Array<{
    productId: string;
    product: {
      id: string;
      productCode: string;
      name: string;
      brand: string;
      category: string;
      costPrice: number;
    };
    currentQuantity: number;
    safetyStock: number;
    maxStock: number;
    suggestedQuantity: number;
    suggestedCost: number;
  }>> {
    const query = `
      SELECT 
        sl.product_id,
        sl.current_quantity,
        sl.safety_stock,
        sl.max_stock,
        p.id as "product.id",
        p.product_code as "product.productCode", 
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.cost_price as "product.costPrice"
      FROM stock_levels sl
      LEFT JOIN products p ON sl.product_id = p.id
      WHERE sl.store_id = $1
        AND sl.current_quantity <= sl.safety_stock
        AND sl.auto_order_enabled = true
        AND p.is_active = true
      ORDER BY (sl.safety_stock - sl.current_quantity) DESC
    `;
    
    const result = await this.db.query(query, [storeId]);
    
    return result.rows.map(row => {
      const suggestedQuantity = Math.max(row.max_stock - row.current_quantity, row.safety_stock);
      const costPrice = parseFloat(row['product.costPrice'] || '0');
      
      return {
        productId: row.product_id,
        product: {
          id: row['product.id'],
          productCode: row['product.productCode'],
          name: row['product.name'],
          brand: row['product.brand'],
          category: row['product.category'],
          costPrice: costPrice
        },
        currentQuantity: row.current_quantity,
        safetyStock: row.safety_stock,
        maxStock: row.max_stock,
        suggestedQuantity,
        suggestedCost: suggestedQuantity * costPrice
      };
    });
  }

  /**
   * 在庫レベル行データの変換
   */
  private transformStockLevelRow(row: any): StockLevel {
    return {
      id: row.id,
      productId: row.productId,
      product: row['product.id'] ? {
        id: row['product.id'],
        productCode: row['product.productCode'],
        name: row['product.name'],
        brand: row['product.brand'],
        category: row['product.category'],
        managementType: 'quantity',
        retailPrice: parseFloat(row['product.retailPrice'] || '0'),
        costPrice: parseFloat(row['product.costPrice'] || '0'),
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      storeId: row.storeId,
      store: row['store.id'] ? {
        id: row['store.id'],
        storeCode: row['store.storeCode'],
        name: row['store.name'],
        address: row['store.address'],
        phone: '',
        managerName: '',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      currentQuantity: row.currentQuantity,
      safetyStock: row.safetyStock,
      maxStock: row.maxStock,
      lastOrderQuantity: row.lastOrderQuantity,
      lastOrderDate: row.lastOrderDate,
      averageUsage: parseFloat(row.averageUsage || '0'),
      autoOrderEnabled: row.autoOrderEnabled,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * アラート行データの変換
   */
  private transformAlertRow(row: any): StockLevelAlert {
    return {
      id: row.id,
      stockLevelId: row.stockLevelId,
      stockLevel: {
        id: row.stockLevelId,
        productId: row['stockLevel.productId'],
        product: {
          id: row['stockLevel.productId'],
          productCode: row['stockLevel.product.productCode'],
          name: row['stockLevel.product.name'],
          brand: '',
          category: row['stockLevel.product.category'],
          managementType: 'quantity',
          retailPrice: 0,
          isActive: true,
          createdAt: '',
          updatedAt: ''
        },
        storeId: row['stockLevel.storeId'],
        store: {
          id: row['stockLevel.storeId'],
          storeCode: row['stockLevel.store.storeCode'],
          name: row['stockLevel.store.name'],
          address: '',
          phone: '',
          managerName: '',
          isActive: true,
          createdAt: '',
          updatedAt: ''
        },
        currentQuantity: 0,
        safetyStock: 0,
        maxStock: 0,
        autoOrderEnabled: false,
        createdAt: '',
        updatedAt: ''
      },
      alertType: row.alertType,
      currentQuantity: row.currentQuantity,
      thresholdQuantity: row.thresholdQuantity,
      suggestedOrderQuantity: row.suggestedOrderQuantity,
      isResolved: row.isResolved,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt
    };
  }
}