import { Pool } from 'pg';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types';

export class PurchaseOrderModel {
  constructor(private db: Pool) {}

  /**
   * 発注一覧を取得
   */
  async findAll(params?: {
    supplierId?: string;
    status?: PurchaseOrderStatus;
    storeId?: string;
    orderDateFrom?: string;
    orderDateTo?: string;
    expectedDeliveryFrom?: string;
    expectedDeliveryTo?: string;
    limit?: number;
    offset?: number;
    sort?: string;
  }): Promise<{ purchaseOrders: PurchaseOrder[]; total: number }> {
    let whereConditions: string[] = ['1=1'];
    let queryParams: any[] = [];
    let paramCount = 1;

    // フィルタ条件の構築
    if (params?.supplierId) {
      whereConditions.push(`po.supplier_id = $${paramCount++}`);
      queryParams.push(params.supplierId);
    }
    if (params?.status) {
      whereConditions.push(`po.status = $${paramCount++}`);
      queryParams.push(params.status);
    }
    if (params?.storeId) {
      whereConditions.push(`po.store_id = $${paramCount++}`);
      queryParams.push(params.storeId);
    }
    if (params?.orderDateFrom) {
      whereConditions.push(`po.order_date >= $${paramCount++}`);
      queryParams.push(params.orderDateFrom);
    }
    if (params?.orderDateTo) {
      whereConditions.push(`po.order_date <= $${paramCount++}`);
      queryParams.push(params.orderDateTo);
    }
    if (params?.expectedDeliveryFrom) {
      whereConditions.push(`po.expected_delivery_date >= $${paramCount++}`);
      queryParams.push(params.expectedDeliveryFrom);
    }
    if (params?.expectedDeliveryTo) {
      whereConditions.push(`po.expected_delivery_date <= $${paramCount++}`);
      queryParams.push(params.expectedDeliveryTo);
    }

    // ソート条件
    let orderClause = 'ORDER BY po.created_at DESC';
    if (params?.sort) {
      const [field, direction] = params.sort.split('_');
      const validFields = ['orderDate', 'expectedDeliveryDate', 'totalAmount', 'status'];
      if (field && validFields.includes(field)) {
        const dbField = field === 'orderDate' ? 'order_date' : 
                       field === 'expectedDeliveryDate' ? 'expected_delivery_date' :
                       field === 'totalAmount' ? 'total_amount' : field;
        orderClause = `ORDER BY po.${dbField} ${(direction || 'asc') === 'desc' ? 'DESC' : 'ASC'}`;
      }
    }

    // COUNT クエリ
    const countQuery = `
      SELECT COUNT(*) as total
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN stores st ON po.store_id = st.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // データ取得クエリ
    const dataQuery = `
      SELECT 
        po.id,
        po.purchase_order_number as "purchaseOrderNumber",
        po.supplier_id as "supplierId",
        po.store_id as "storeId",
        po.order_date as "orderDate",
        po.expected_delivery_date as "expectedDeliveryDate",
        po.actual_delivery_date as "actualDeliveryDate",
        po.status,
        po.subtotal_amount as "subtotalAmount",
        po.tax_amount as "taxAmount",
        po.total_amount as "totalAmount",
        po.notes,
        po.sent_at as "sentAt",
        po.confirmed_at as "confirmedAt",
        po.created_by as "createdBy",
        po.created_at as "createdAt",
        po.updated_at as "updatedAt",
        -- 仕入先情報
        s.id as "supplier.id",
        s.supplier_code as "supplier.supplierCode",
        s.name as "supplier.name",
        s.contact_info as "supplier.contactInfo",
        s.order_method as "supplier.orderMethod",
        s.is_active as "supplier.isActive",
        -- 店舗情報
        st.id as "store.id",
        st.store_code as "store.storeCode",
        st.name as "store.name",
        st.address as "store.address"
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN stores st ON po.store_id = st.id
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
    const purchaseOrders = result.rows.map(row => this.transformRow(row));

    return { purchaseOrders, total };
  }

  /**
   * 発注をIDで取得（明細込み）
   */
  async findById(id: string): Promise<PurchaseOrder | null> {
    const query = `
      SELECT 
        po.id,
        po.purchase_order_number as "purchaseOrderNumber",
        po.supplier_id as "supplierId",
        po.store_id as "storeId",
        po.order_date as "orderDate",
        po.expected_delivery_date as "expectedDeliveryDate",
        po.actual_delivery_date as "actualDeliveryDate",
        po.status,
        po.subtotal_amount as "subtotalAmount",
        po.tax_amount as "taxAmount",
        po.total_amount as "totalAmount",
        po.notes,
        po.sent_at as "sentAt",
        po.confirmed_at as "confirmedAt",
        po.created_by as "createdBy",
        po.created_at as "createdAt",
        po.updated_at as "updatedAt",
        -- 仕入先情報
        s.id as "supplier.id",
        s.supplier_code as "supplier.supplierCode",
        s.name as "supplier.name",
        s.contact_info as "supplier.contactInfo",
        s.order_method as "supplier.orderMethod",
        -- 店舗情報
        st.id as "store.id",
        st.store_code as "store.storeCode",
        st.name as "store.name",
        st.address as "store.address"
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN stores st ON po.store_id = st.id
      WHERE po.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;

    const purchaseOrder = this.transformRow(result.rows[0]);
    
    // 発注明細を取得
    purchaseOrder.items = await this.findItemsByPurchaseOrderId(id);
    
    return purchaseOrder;
  }

  /**
   * 発注明細を取得
   */
  private async findItemsByPurchaseOrderId(purchaseOrderId: string): Promise<PurchaseOrderItem[]> {
    const query = `
      SELECT 
        poi.id,
        poi.purchase_order_id as "purchaseOrderId",
        poi.order_id as "orderId",
        poi.product_id as "productId",
        poi.prescription_id as "prescriptionId",
        poi.quantity,
        poi.unit_cost as "unitCost",
        poi.total_cost as "totalCost",
        poi.specifications,
        poi.notes,
        -- 商品情報
        p.id as "product.id",
        p.product_code as "product.productCode",
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.retail_price as "product.retailPrice",
        -- 受注情報
        o.id as "order.id",
        o.order_number as "order.orderNumber",
        o.customer_id as "order.customerId"
      FROM purchase_order_items poi
      LEFT JOIN products p ON poi.product_id = p.id
      LEFT JOIN orders o ON poi.order_id = o.id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.created_at
    `;
    
    const result = await this.db.query(query, [purchaseOrderId]);
    return result.rows.map(row => this.transformItemRow(row));
  }

  /**
   * 発注を作成
   */
  async create(purchaseOrderData: {
    purchaseOrderNumber: string;
    supplierId: string;
    storeId: string;
    expectedDeliveryDate?: string;
    orderIds: string[];
    notes?: string;
    createdBy: string;
  }, clientParam?: any): Promise<PurchaseOrder> {
    const client = clientParam || await this.db.connect();
    const shouldManageTransaction = !clientParam;
    
    try {
      if (shouldManageTransaction) {
        await client.query('BEGIN');
      }

      // 発注レコードを作成
      const insertPOQuery = `
        INSERT INTO purchase_orders (
          purchase_order_number, supplier_id, store_id, expected_delivery_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      
      const poResult = await client.query(insertPOQuery, [
        purchaseOrderData.purchaseOrderNumber,
        purchaseOrderData.supplierId,
        purchaseOrderData.storeId,
        purchaseOrderData.expectedDeliveryDate || null,
        purchaseOrderData.notes || null,
        purchaseOrderData.createdBy
      ]);
      
      const purchaseOrderId = poResult.rows[0].id;

      // 対象受注から発注明細を作成
      for (const orderId of purchaseOrderData.orderIds) {
        const orderItemsQuery = `
          SELECT 
            oi.product_id,
            oi.prescription_id,
            oi.quantity,
            p.cost_price
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = $1 AND p.category = 'lens'
        `;
        
        const orderItemsResult = await client.query(orderItemsQuery, [orderId]);
        
        for (const item of orderItemsResult.rows) {
          const insertItemQuery = `
            INSERT INTO purchase_order_items (
              purchase_order_id, order_id, product_id, prescription_id, 
              quantity, unit_cost, total_cost
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          
          const unitCost = item.cost_price || 0;
          const totalCost = unitCost * item.quantity;
          
          await client.query(insertItemQuery, [
            purchaseOrderId,
            orderId,
            item.product_id,
            item.prescription_id,
            item.quantity,
            unitCost,
            totalCost
          ]);
        }
      }

      // 合計金額を計算・更新
      await this.updateTotals(client, purchaseOrderId);
      
      if (shouldManageTransaction) {
        await client.query('COMMIT');
      }
      
      // 作成した発注を取得して返却
      const result = await this.findById(purchaseOrderId);
      return result!;
      
    } catch (error) {
      if (shouldManageTransaction) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (shouldManageTransaction) {
        client.release();
      }
    }
  }

  /**
   * 発注ステータスを更新
   */
  async updateStatus(id: string, status: PurchaseOrderStatus, updatedFields?: {
    sentAt?: string;
    confirmedAt?: string;
    actualDeliveryDate?: string;
  }): Promise<PurchaseOrder | null> {
    const updates = ['status = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [id, status];
    let paramCount = 3;

    if (updatedFields?.sentAt) {
      updates.push(`sent_at = $${paramCount++}`);
      values.push(updatedFields.sentAt);
    }
    if (updatedFields?.confirmedAt) {
      updates.push(`confirmed_at = $${paramCount++}`);
      values.push(updatedFields.confirmedAt);
    }
    if (updatedFields?.actualDeliveryDate) {
      updates.push(`actual_delivery_date = $${paramCount++}`);
      values.push(updatedFields.actualDeliveryDate);
    }

    const query = `
      UPDATE purchase_orders 
      SET ${updates.join(', ')}
      WHERE id = $1
    `;
    
    await this.db.query(query, values);
    return this.findById(id);
  }

  /**
   * 合計金額を計算・更新
   */
  private async updateTotals(client: any, purchaseOrderId: string): Promise<void> {
    const query = `
      UPDATE purchase_orders 
      SET 
        subtotal_amount = COALESCE((
          SELECT SUM(total_cost) 
          FROM purchase_order_items 
          WHERE purchase_order_id = $1
        ), 0),
        tax_amount = COALESCE((
          SELECT SUM(total_cost) * 0.10 
          FROM purchase_order_items 
          WHERE purchase_order_id = $1
        ), 0),
        total_amount = COALESCE((
          SELECT SUM(total_cost) * 1.10 
          FROM purchase_order_items 
          WHERE purchase_order_id = $1
        ), 0)
      WHERE id = $1
    `;
    
    await client.query(query, [purchaseOrderId]);
  }

  /**
   * 行データの変換
   */
  private transformRow(row: any): PurchaseOrder {
    return {
      id: row.id,
      purchaseOrderNumber: row.purchaseOrderNumber,
      supplierId: row.supplierId,
      supplier: row['supplier.id'] ? {
        id: row['supplier.id'],
        supplierCode: row['supplier.supplierCode'],
        name: row['supplier.name'],
        contactInfo: row['supplier.contactInfo'],
        orderMethod: row['supplier.orderMethod'],
        isActive: row['supplier.isActive'],
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
      orderDate: row.orderDate,
      expectedDeliveryDate: row.expectedDeliveryDate,
      actualDeliveryDate: row.actualDeliveryDate,
      status: row.status,
      subtotalAmount: parseFloat(row.subtotalAmount || '0'),
      taxAmount: parseFloat(row.taxAmount || '0'),
      totalAmount: parseFloat(row.totalAmount || '0'),
      notes: row.notes,
      sentAt: row.sentAt,
      confirmedAt: row.confirmedAt,
      createdBy: row.createdBy,
      items: [], // 別途取得
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * 発注を送信
   */
  async send(id: string, _sentBy: string): Promise<PurchaseOrder | null> {
    const query = `
      UPDATE purchase_orders 
      SET 
        status = 'sent',
        sent_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status = 'draft'
    `;
    
    const result = await this.db.query(query, [id]);
    
    if ((result.rowCount ?? 0) === 0) {
      return null;
    }
    
    return this.findById(id);
  }

  /**
   * 発注統計を取得
   */
  async getStatistics(params?: {
    storeId?: string;
    supplierId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<{
    totalCount: number;
    totalAmount: number;
    statusCounts: Record<PurchaseOrderStatus, number>;
    supplierCounts: Array<{ supplierId: string; supplierName: string; count: number; amount: number }>;
  }> {
    let whereConditions: string[] = ['1=1'];
    let queryParams: any[] = [];
    let paramCount = 1;

    // フィルタ条件の構築
    if (params?.storeId) {
      whereConditions.push(`po.store_id = $${paramCount++}`);
      queryParams.push(params.storeId);
    }
    if (params?.supplierId) {
      whereConditions.push(`po.supplier_id = $${paramCount++}`);
      queryParams.push(params.supplierId);
    }
    if (params?.fromDate) {
      whereConditions.push(`po.order_date >= $${paramCount++}`);
      queryParams.push(params.fromDate);
    }
    if (params?.toDate) {
      whereConditions.push(`po.order_date <= $${paramCount++}`);
      queryParams.push(params.toDate);
    }

    // 基本統計取得
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_count,
        SUM(total_amount) as total_amount
      FROM purchase_orders po
      WHERE ${whereConditions.join(' AND ')}
    `;

    const basicStatsResult = await this.db.query(basicStatsQuery, queryParams);
    const totalCount = parseInt(basicStatsResult.rows[0].total_count || '0');
    const totalAmount = parseFloat(basicStatsResult.rows[0].total_amount || '0');

    // ステータス別統計
    const statusStatsQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM purchase_orders po
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY status
    `;

    const statusStatsResult = await this.db.query(statusStatsQuery, queryParams);
    const statusCounts: Record<PurchaseOrderStatus, number> = {
      draft: 0,
      sent: 0,
      confirmed: 0,
      partially_delivered: 0,
      delivered: 0,
      cancelled: 0
    };

    statusStatsResult.rows.forEach(row => {
      statusCounts[row.status as PurchaseOrderStatus] = parseInt(row.count);
    });

    // 仕入先別統計
    const supplierStatsQuery = `
      SELECT 
        po.supplier_id,
        s.name as supplier_name,
        COUNT(*) as count,
        SUM(po.total_amount) as amount
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      GROUP BY po.supplier_id, s.name
      ORDER BY amount DESC
    `;

    const supplierStatsResult = await this.db.query(supplierStatsQuery, queryParams);
    const supplierCounts = supplierStatsResult.rows.map(row => ({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || 'Unknown',
      count: parseInt(row.count),
      amount: parseFloat(row.amount || '0')
    }));

    return {
      totalCount,
      totalAmount,
      statusCounts,
      supplierCounts
    };
  }

  /**
   * 明細行データの変換
   */
  private transformItemRow(row: any): PurchaseOrderItem {
    return {
      id: row.id,
      purchaseOrderId: row.purchaseOrderId,
      orderId: row.orderId,
      order: row['order.id'] ? {
        id: row['order.id'],
        orderNumber: row['order.orderNumber'],
        customerId: row['order.customerId'],
        storeId: '',
        orderDate: '',
        status: 'ordered',
        subtotalAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        paymentMethod: 'cash',
        items: [],
        createdBy: '',
        createdAt: '',
        updatedAt: ''
      } : undefined,
      productId: row.productId,
      product: row['product.id'] ? {
        id: row['product.id'],
        productCode: row['product.productCode'],
        name: row['product.name'],
        brand: row['product.brand'],
        category: row['product.category'],
        managementType: 'individual',
        retailPrice: parseFloat(row['product.retailPrice'] || '0'),
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      prescriptionId: row.prescriptionId,
      quantity: row.quantity,
      unitCost: parseFloat(row.unitCost || '0'),
      totalCost: parseFloat(row.totalCost || '0'),
      specifications: row.specifications,
      notes: row.notes
    };
  }
}