import { Pool, PoolClient } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { 
  Order, 
  OrderItem,
  Payment,
  UUID, 
  DateString, 
  OrderStatus,
  PaymentMethod,
  Customer,
  Store,
  Product,
  Frame,
  Prescription,
  User
} from '../types';

export interface OrderModelData {
  id: UUID;
  order_number: string;
  customer_id: UUID;
  store_id: UUID;
  order_date: DateString;
  delivery_date?: DateString;
  status: OrderStatus;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  created_by: UUID;
  created_at: DateString;
  updated_at: DateString;
}

export interface OrderItemModelData {
  id: UUID;
  order_id: UUID;
  product_id: UUID;
  frame_id?: UUID;
  quantity: number;
  unit_price: number;
  total_price: number;
  prescription_id?: UUID;
  notes?: string;
}

export class OrderModel {
  constructor(private pool: Pool) {}

  /**
   * 発注待ち受注を取得
   * A. レンズ商品: 処方箋作成済み、かつ未発注
   * B. フレーム等: 受注済み、在庫不足、かつ未発注
   */
  async findAvailableForPurchase(params?: {
    storeId?: string;
    customerId?: string;
    customerName?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Order[]> {
    console.log('🔍 [ORDER_MODEL] Received params:', params);
    let whereConditions: string[] = [
      `(
        (o.status = 'prescription_done' AND EXISTS (
          SELECT 1 FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = o.id 
          AND p.category = 'lens'
          AND NOT EXISTS (
            SELECT 1 FROM purchase_order_items poi
            WHERE poi.order_id = o.id AND poi.product_id = p.id
          )
        ))
        OR
        (o.status IN ('ordered', 'prescription_done') AND EXISTS (
          SELECT 1 FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN frames f ON oi.frame_id = f.id
          WHERE oi.order_id = o.id 
          AND p.category IN ('frame', 'contact', 'accessory')
          AND (
            -- フレーム商品の場合は個体番号がnullの場合のみ発注対象（在庫品選択時は除外）
            (p.category = 'frame' AND oi.frame_id IS NULL)
            OR
            -- コンタクト・アクセサリーは常に発注対象
            (p.category IN ('contact', 'accessory'))
          )
          AND NOT EXISTS (
            SELECT 1 FROM purchase_order_items poi
            WHERE poi.order_id = o.id AND poi.product_id = p.id
          )
        ))
      )`
    ];
    
    let queryParams: any[] = [];
    let paramCount = 1;

    if (params?.storeId) {
      whereConditions.push(`o.store_id = $${paramCount++}`);
      queryParams.push(params.storeId);
    }
    if (params?.customerId) {
      // UUIDフォーマットチェック
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(params.customerId)) {
        whereConditions.push(`o.customer_id = $${paramCount++}`);
        queryParams.push(params.customerId);
      }
    }
    if (params?.customerName) {
      whereConditions.push(`(CONCAT(c.last_name, ' ', c.first_name) LIKE $${paramCount++} OR CONCAT(c.last_name, c.first_name) LIKE $${paramCount++})`);
      queryParams.push(`%${params.customerName}%`);
      queryParams.push(`%${params.customerName}%`);
    }
    if (params?.fromDate) {
      whereConditions.push(`o.order_date >= $${paramCount++}`);
      queryParams.push(params.fromDate);
    }
    if (params?.toDate) {
      whereConditions.push(`o.order_date <= $${paramCount++}`);
      queryParams.push(params.toDate);
    }

    console.log('🔍 [ORDER_MODEL] Search conditions:', whereConditions);
    console.log('🔍 [ORDER_MODEL] Query parameters:', queryParams);

    const query = `
      SELECT 
        o.id,
        o.order_number as "orderNumber",
        o.customer_id as "customerId",
        o.store_id as "storeId",
        o.order_date as "orderDate",
        o.delivery_date as "deliveryDate",
        o.status,
        o.subtotal_amount as "subtotalAmount",
        o.tax_amount as "taxAmount",
        o.total_amount as "totalAmount",
        o.paid_amount as "paidAmount",
        o.balance_amount as "balanceAmount",
        o.payment_method as "paymentMethod",
        o.notes,
        o.created_by as "createdBy",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt",
        -- 顧客情報
        c.id as "customer.id",
        c.customer_code as "customer.customerCode",
        c.last_name as "customer.lastName",
        c.first_name as "customer.firstName",
        CONCAT(c.last_name, ' ', c.first_name) as "customer.fullName",
        c.phone as "customer.phone",
        -- 店舗情報
        s.id as "store.id",
        s.store_code as "store.storeCode",
        s.name as "store.name"
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY o.order_date DESC
    `;

    const result = await this.pool.query(query, queryParams);
    
    // 各受注の商品情報も取得
    const orders = [];
    for (const row of result.rows) {
      const items = await this.getAllOrderItems(row.id);
      const order = this.transformRow(row);
      order.items = items;
      orders.push(order);
    }

    return orders;
  }

  /**
   * レンズ商品を含む受注明細を取得
   */
  private async getOrderItemsWithLens(orderId: string): Promise<OrderItem[]> {
    const query = `
      SELECT 
        oi.id,
        oi.order_id as "orderId",
        oi.product_id as "productId",
        oi.frame_id as "frameId",
        oi.quantity,
        oi.unit_price as "unitPrice",
        oi.total_price as "totalPrice",
        oi.prescription_id as "prescriptionId",
        oi.notes,
        -- 商品情報
        p.id as "product.id",
        p.product_code as "product.productCode",
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.retail_price as "product.retailPrice",
        p.cost_price as "product.costPrice",
        -- 処方箋情報
        pr.id as "prescription.id",
        pr.measured_date as "prescription.measuredDate",
        pr.right_eye_sphere as "prescription.rightEyeSphere",
        pr.right_eye_cylinder as "prescription.rightEyeCylinder",
        pr.right_eye_axis as "prescription.rightEyeAxis",
        pr.left_eye_sphere as "prescription.leftEyeSphere",
        pr.left_eye_cylinder as "prescription.leftEyeCylinder",
        pr.left_eye_axis as "prescription.leftEyeAxis",
        pr.pupil_distance as "prescription.pupilDistance"
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN prescriptions pr ON oi.prescription_id = pr.id
      WHERE oi.order_id = $1 AND p.category = 'lens'
      ORDER BY oi.created_at
    `;

    const result = await this.pool.query(query, [orderId]);
    return result.rows.map(row => this.transformItemRow(row));
  }

  /**
   * 全ての受注明細を取得（レンズ・フレーム含む）
   */
  private async getAllOrderItems(orderId: string): Promise<OrderItem[]> {
    const query = `
      SELECT 
        oi.id,
        oi.order_id as "orderId",
        oi.product_id as "productId",
        oi.frame_id as "frameId",
        oi.quantity,
        oi.unit_price as "unitPrice",
        oi.total_price as "totalPrice",
        oi.prescription_id as "prescriptionId",
        oi.notes,
        -- 商品情報
        p.id as "product.id",
        p.product_code as "product.productCode",
        p.name as "product.name",
        p.brand as "product.brand",
        p.category as "product.category",
        p.retail_price as "product.retailPrice",
        p.cost_price as "product.costPrice",
        -- 処方箋情報
        pr.id as "prescription.id",
        pr.measured_date as "prescription.measuredDate",
        pr.right_eye_sphere as "prescription.rightEyeSphere",
        pr.right_eye_cylinder as "prescription.rightEyeCylinder",
        pr.right_eye_axis as "prescription.rightEyeAxis",
        pr.left_eye_sphere as "prescription.leftEyeSphere",
        pr.left_eye_cylinder as "prescription.leftEyeCylinder",
        pr.left_eye_axis as "prescription.leftEyeAxis",
        pr.pupil_distance as "prescription.pupilDistance"
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN prescriptions pr ON oi.prescription_id = pr.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at
    `;

    const result = await this.pool.query(query, [orderId]);
    return result.rows.map(row => this.transformItemRow(row));
  }

  /**
   * 受注のステータスを更新
   */
  async updateStatus(orderId: string, status: OrderStatus): Promise<boolean> {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    const result = await this.pool.query(query, [status, orderId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * 複数受注のステータスを一括更新
   */
  async updateMultipleStatus(orderIds: string[], status: OrderStatus): Promise<number> {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `;
    
    const result = await this.pool.query(query, [status, orderIds]);
    return result.rowCount ?? 0;
  }

  /**
   * 行データの変換
   */
  private transformRow(row: any): Order {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      customerId: row.customerId,
      customer: row['customer.id'] ? {
        id: row['customer.id'],
        customerCode: row['customer.customerCode'],
        lastName: row['customer.lastName'],
        firstName: row['customer.firstName'],
        fullName: row['customer.fullName'],
        fullNameKana: '',
        gender: undefined,
        phone: row['customer.phone'],
        visitCount: 0,
        totalPurchaseAmount: 0,
        registeredStoreId: '',
        createdAt: '',
        updatedAt: ''
      } : undefined,
      storeId: row.storeId,
      store: row['store.id'] ? {
        id: row['store.id'],
        storeCode: row['store.storeCode'],
        name: row['store.name'],
        address: '',
        createdAt: '',
        updatedAt: ''
      } : undefined,
      orderDate: row.orderDate,
      deliveryDate: row.deliveryDate,
      status: row.status,
      subtotalAmount: parseFloat(row.subtotalAmount || '0'),
      taxAmount: parseFloat(row.taxAmount || '0'),
      totalAmount: parseFloat(row.totalAmount || '0'),
      paidAmount: parseFloat(row.paidAmount || '0'),
      balanceAmount: parseFloat(row.balanceAmount || '0'),
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      items: [],
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * 明細行データの変換
   */
  private transformItemRow(row: any): OrderItem {
    return {
      id: row.id,
      orderId: row.orderId,
      productId: row.productId,
      product: row['product.id'] ? {
        id: row['product.id'],
        productCode: row['product.productCode'],
        name: row['product.name'],
        brand: row['product.brand'],
        category: row['product.category'],
        retailPrice: parseFloat(row['product.retailPrice'] || '0'),
        costPrice: parseFloat(row['product.costPrice'] || '0'),
        managementType: 'individual',
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } : undefined,
      frameId: row.frameId,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unitPrice || '0'),
      totalPrice: parseFloat(row.totalPrice || '0'),
      prescriptionId: row.prescriptionId,
      prescription: row['prescription.id'] ? {
        id: row['prescription.id'],
        customerId: '',
        measuredDate: row['prescription.measuredDate'],
        rightEyeSphere: row['prescription.rightEyeSphere'],
        rightEyeCylinder: row['prescription.rightEyeCylinder'],
        rightEyeAxis: row['prescription.rightEyeAxis'],
        leftEyeSphere: row['prescription.leftEyeSphere'],
        leftEyeCylinder: row['prescription.leftEyeCylinder'],
        leftEyeAxis: row['prescription.leftEyeAxis'],
        pupilDistance: row['prescription.pupilDistance'],
        createdBy: '',
        createdAt: ''
      } : undefined,
      notes: row.notes
    };
  }
}

export interface PaymentModel {
  id: UUID;
  order_id: UUID;
  payment_date: DateString;
  payment_amount: number;
  payment_method: PaymentMethod;
  payment_timing?: string; // 'order_time' | 'delivery_time'
  notes?: string;
  created_by: UUID;
  created_at: DateString;
}

export class OrderRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[OrderRepository] 初期化完了');
  }

  private transformToOrder(row: OrderModelData & { 
    customer_last_name?: string;
    customer_first_name?: string;
    customer_code?: string;
    store_name?: string;
    store_code?: string;
    created_by_name?: string;
    created_by_user_code?: string;
  }): Order {
    return {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customer: row.customer_last_name ? {
        id: row.customer_id,
        customerCode: row.customer_code || '',
        lastName: row.customer_last_name,
        firstName: row.customer_first_name || '',
        fullName: `${row.customer_last_name} ${row.customer_first_name || ''}`.trim(),
        visitCount: 0,
        totalPurchaseAmount: 0,
        createdAt: '',
        updatedAt: ''
      } as Customer : undefined,
      storeId: row.store_id,
      store: row.store_name ? {
        id: row.store_id,
        storeCode: row.store_code || '',
        name: row.store_name,
        address: ''
      } as Store : undefined,
      orderDate: row.order_date,
      deliveryDate: row.delivery_date,
      status: row.status,
      subtotalAmount: row.subtotal_amount,
      taxAmount: row.tax_amount,
      totalAmount: row.total_amount,
      paidAmount: row.paid_amount,
      balanceAmount: row.balance_amount,
      paymentMethod: row.payment_method,
      notes: row.notes,
      items: [], // 別途取得
      payments: [], // 別途取得
      createdBy: row.created_by,
      createdByUser: row.created_by_name ? {
        id: row.created_by,
        userCode: row.created_by_user_code || '',
        name: row.created_by_name,
        role: 'staff',
        isActive: true,
        store: {
          id: row.store_id,
          storeCode: row.store_code || '',
          name: row.store_name || '',
          address: ''
        }
      } as User : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformToOrderItem(row: OrderItemModelData & {
    product_name?: string;
    product_code?: string;
    product_brand?: string;
    product_category?: string;
    frame_serial_number?: string;
    frame_color?: string;
  }): OrderItem {
    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      product: row.product_name ? {
        id: row.product_id,
        productCode: row.product_code || '',
        name: row.product_name,
        brand: row.product_brand,
        category: row.product_category as any || 'frame', // 実際のカテゴリーを使用
        managementType: 'individual',
        retailPrice: row.unit_price,
        isActive: true,
        createdAt: '',
        updatedAt: ''
      } as Product : undefined,
      frameId: row.frame_id,
      frame: row.frame_serial_number ? {
        id: row.frame_id!,
        productId: row.product_id,
        storeId: '', // 必要に応じて取得
        serialNumber: row.frame_serial_number,
        color: row.frame_color,
        purchaseDate: '',
        status: 'sold',
        createdAt: '',
        updatedAt: ''
      } as Frame : undefined,
      quantity: row.quantity,
      unitPrice: row.unit_price,
      totalPrice: row.total_price,
      prescriptionId: row.prescription_id,
      notes: row.notes
    };
  }

  private transformToPayment(row: PaymentModel): Payment {
    return {
      id: row.id,
      orderId: row.order_id,
      paymentDate: row.payment_date,
      paymentAmount: row.payment_amount,
      paymentMethod: row.payment_method,
      paymentTiming: (row.payment_timing as 'order_time' | 'delivery_time') || 'order_time',
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  // 受注一覧取得
  async findOrders(params: {
    customerId?: string;
    status?: OrderStatus;
    fromDate?: string;
    toDate?: string;
    orderNumber?: string;
    customerName?: string;
    page?: number;
    limit?: number;
    storeId?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    const { customerId, status, fromDate, toDate, orderNumber, customerName, page = 1, limit = 50, storeId } = params;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (customerId) {
      whereClause += ` AND o.customer_id = $${paramIndex}`;
      queryParams.push(customerId);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (fromDate) {
      whereClause += ` AND o.order_date >= $${paramIndex}`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause += ` AND o.order_date <= $${paramIndex}`;
      queryParams.push(toDate);
      paramIndex++;
    }

    if (storeId) {
      whereClause += ` AND o.store_id = $${paramIndex}`;
      queryParams.push(storeId);
      paramIndex++;
    }

    if (orderNumber) {
      whereClause += ` AND o.order_number ILIKE $${paramIndex}`;
      queryParams.push(`%${orderNumber}%`);
      paramIndex++;
    }

    if (customerName) {
      whereClause += ` AND (CONCAT(c.last_name, ' ', c.first_name) ILIKE $${paramIndex} OR CONCAT(c.last_name, c.first_name) ILIKE $${paramIndex + 1})`;
      queryParams.push(`%${customerName}%`, `%${customerName}%`);
      paramIndex += 2;
    }

    const query = `
      SELECT 
        o.*,
        c.last_name as customer_last_name,
        c.first_name as customer_first_name,
        c.customer_code,
        s.name as store_name,
        s.store_code,
        u.name as created_by_name,
        u.user_code as created_by_user_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.db.query(query, queryParams),
      this.db.query(countQuery, queryParams.slice(0, -2)) // LIMIT, OFFSETを除く
    ]);

    const orders = result.rows.map((row: any) => this.transformToOrder(row));
    const total = parseInt(countResult.rows[0].total);

    // 各受注の明細、入金情報、値引き情報を取得
    for (const order of orders) {
      const [items, payments, discounts] = await Promise.all([
        this.findOrderItems(order.id),
        this.findPayments(order.id),
        this.findOrderDiscounts(order.id)
      ]);
      order.items = items;
      order.payments = payments;
      order.discounts = discounts;
      
      // すべての金額フィールドを確実に数値に変換
      order.subtotalAmount = parseFloat(order.subtotalAmount.toString());
      order.taxAmount = parseFloat(order.taxAmount.toString());
      order.totalAmount = parseFloat(order.totalAmount.toString());
      order.paidAmount = parseFloat(order.paidAmount.toString());
      order.balanceAmount = parseFloat(order.balanceAmount.toString());
      
      console.log(`🔍 [ORDER_MODEL] Order ${order.orderNumber} before recalculation:`, {
        subtotalAmount: order.subtotalAmount,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount,
        balanceAmount: order.balanceAmount,
        discountsCount: discounts ? discounts.length : 0
      });
      
      // 値引き情報をログ出力（金額は上書きしない）
      if (discounts && discounts.length > 0) {
        const totalDiscountAmount = discounts.reduce((sum, discount) => sum + discount.discountAmount, 0);
        
        console.log(`🔍 [ORDER_MODEL] Order ${order.orderNumber} discount info:`, {
          totalDiscountAmount,
          originalTotal: order.subtotalAmount + order.taxAmount,
          discountedTotal: Math.max(0, order.subtotalAmount + order.taxAmount - totalDiscountAmount),
          keepingOriginalTotalAmount: order.totalAmount,
          balanceAmount: order.balanceAmount
        });
        
        // totalAmountは元の値を保持（データベースの計算カラムbalance_amountとの整合性のため）
        // 値引き後の金額はフロントエンドで計算または別途フィールドで管理
      }
      
      console.log(`🔍 [ORDER_MODEL] Order ${order.orderNumber} after recalculation:`, {
        totalAmount: order.totalAmount,
        balanceAmount: order.balanceAmount
      });
    }

    return { orders, total };
  }

  // 受注詳細取得
  async findOrderById(id: string): Promise<Order | null> {
    const query = `
      SELECT 
        o.*,
        c.last_name as customer_last_name,
        c.first_name as customer_first_name,
        c.customer_code,
        s.name as store_name,
        s.store_code,
        u.name as created_by_name,
        u.user_code as created_by_user_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const order = this.transformToOrder(result.rows[0]);
    
    // 明細、入金情報、値引き情報を取得
    const [items, payments, discounts] = await Promise.all([
      this.findOrderItems(order.id),
      this.findPayments(order.id),
      this.findOrderDiscounts(order.id)
    ]);
    
    order.items = items;
    order.payments = payments;
    order.discounts = discounts;
    
    // 値引き後の金額を再計算
    if (discounts && discounts.length > 0) {
      const totalDiscountAmount = discounts.reduce((sum, discount) => sum + discount.discountAmount, 0);
      order.totalAmount = Math.max(0, order.subtotalAmount + order.taxAmount - totalDiscountAmount);
      order.balanceAmount = Math.max(0, order.totalAmount - order.paidAmount);
    }

    return order;
  }

  // 受注明細取得
  async findOrderItems(orderId: string): Promise<OrderItem[]> {
    const query = `
      SELECT 
        oi.*,
        p.id as product_id,
        p.name as product_name,
        p.product_code,
        p.brand as product_brand,
        p.category as product_category,
        p.retail_price,
        p.cost_price,
        p.management_type,
        p.is_active,
        f.serial_number as frame_serial_number,
        f.color as frame_color
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN frames f ON oi.frame_id = f.id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `;

    const result = await this.db.query(query, [orderId]);
    return result.rows.map((row: any) => this.transformToOrderItemWithProduct(row));
  }

  private transformToOrderItemWithProduct(row: any): OrderItem {
    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      product: {
        id: row.product_id,
        productCode: row.product_code || '',
        name: row.product_name || '',
        brand: row.product_brand || '',
        category: row.product_category || 'frame',
        managementType: row.management_type || 'individual',
        retailPrice: parseFloat(row.retail_price) || 0,
        costPrice: parseFloat(row.cost_price) || 0,
        isActive: row.is_active || true,
        createdAt: '',
        updatedAt: ''
      } as Product,
      frameId: row.frame_id,
      frame: row.frame_serial_number ? {
        id: row.frame_id!,
        productId: row.product_id,
        storeId: '', // 必要に応じて取得
        serialNumber: row.frame_serial_number,
        color: row.frame_color,
        purchaseDate: '',
        status: 'sold',
        createdAt: '',
        updatedAt: ''
      } as Frame : undefined,
      quantity: row.quantity,
      unitPrice: parseFloat(row.unit_price) || 0,
      totalPrice: parseFloat(row.total_price) || 0,
      prescriptionId: row.prescription_id,
      notes: row.notes
    };
  }

  // 入金履歴取得
  async findPayments(orderId: string): Promise<Payment[]> {
    const query = `
      SELECT * FROM payments
      WHERE order_id = $1
      ORDER BY payment_date DESC
    `;

    const result = await this.db.query(query, [orderId]);
    return result.rows.map((row: any) => this.transformToPayment(row));
  }

  // 受注値引き保存
  async addOrderDiscount(discountData: {
    orderId: string;
    discountId: string;
    discountAmount: number;
    originalAmount: number;
    createdBy: string;
  }): Promise<void> {
    // 値引きの詳細情報を取得
    const discountQuery = `
      SELECT discount_code, name, type, value 
      FROM discounts 
      WHERE id = $1
    `;
    const discountResult = await this.db.query(discountQuery, [discountData.discountId]);
    
    if (discountResult.rows.length === 0) {
      throw new Error(`Discount not found: ${discountData.discountId}`);
    }
    
    const discount = discountResult.rows[0];
    
    const insertQuery = `
      INSERT INTO order_discounts (
        id, order_id, discount_id, discount_code, discount_name,
        discount_type, discount_value, original_amount, discount_amount,
        discounted_amount, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP
      )
    `;
    
    await this.db.query(insertQuery, [
      discountData.orderId,
      discountData.discountId,
      discount.discount_code,
      discount.name,
      discount.type,
      discount.value,
      discountData.originalAmount,
      discountData.discountAmount,
      discountData.originalAmount - discountData.discountAmount
    ]);
  }

  // 受注値引き情報取得
  async findOrderDiscounts(orderId: string): Promise<any[]> {
    console.log(`🔍 [ORDER_MODEL] findOrderDiscounts called for orderId: ${orderId}`);
    
    const query = `
      SELECT 
        od.*,
        d.discount_code,
        d.name as discount_name,
        d.type as discount_type,
        d.value as discount_value
      FROM order_discounts od
      LEFT JOIN discounts d ON od.discount_id = d.id
      WHERE od.order_id = $1
      ORDER BY od.created_at DESC
    `;

    const result = await this.db.query(query, [orderId]);
    console.log(`🔍 [ORDER_MODEL] findOrderDiscounts result: ${result.rows.length} rows for orderId: ${orderId}`);
    
    const discounts = result.rows.map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      discountId: row.discount_id,
      discountCode: row.discount_code,
      discountName: row.discount_name,
      discountType: row.discount_type,
      discountValue: row.discount_value,
      originalAmount: parseFloat(row.original_amount || '0'),
      discountAmount: parseFloat(row.discount_amount || '0'),
      discountedAmount: parseFloat(row.discounted_amount || '0'),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at
    }));
    
    console.log(`🔍 [ORDER_MODEL] findOrderDiscounts mapped discounts:`, discounts.map(d => ({
      id: d.id,
      discountName: d.discountName,
      discountAmount: d.discountAmount
    })));
    
    return discounts;
  }

  // 受注作成
  async createOrder(orderData: {
    orderNumber: string;
    customerId: string;
    storeId: string;
    status?: OrderStatus;
    deliveryDate?: string;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    createdBy: string;
    items: Array<{
      productId: string;
      frameId?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      prescriptionId?: string;
      notes?: string;
    }>;
  }): Promise<Order> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 受注作成（balance_amountは計算カラムなので除外）
      const orderQuery = `
        INSERT INTO orders (
          id, order_number, customer_id, store_id, order_date, delivery_date,
          status, subtotal_amount, tax_amount, total_amount, paid_amount, 
          payment_method, notes, created_by
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, NOW(), $4,
          $5, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderData.orderNumber,
        orderData.customerId,
        orderData.storeId,
        orderData.deliveryDate,
        orderData.status || 'ordered', // フロントエンドから送信されたステータスを使用
        orderData.subtotalAmount,
        orderData.taxAmount,
        orderData.totalAmount,
        orderData.paidAmount,
        orderData.paymentMethod,
        orderData.notes,
        orderData.createdBy
      ]);

      const orderId = orderResult.rows[0].id;

      // 受注明細作成
      for (const item of orderData.items) {
        const itemQuery = `
          INSERT INTO order_items (
            id, order_id, product_id, frame_id, quantity, 
            unit_price, total_price, prescription_id, notes
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8
          )
        `;

        await client.query(itemQuery, [
          orderId,
          item.productId,
          item.frameId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.prescriptionId,
          item.notes
        ]);
      }

      // 入金レコード作成（部分入金の場合）
      if (orderData.paidAmount > 0) {
        const paymentQuery = `
          INSERT INTO payments (
            id, order_id, payment_date, payment_amount, 
            payment_method, notes, created_by
          ) VALUES (
            gen_random_uuid(), $1, NOW(), $2, $3, $4, $5
          )
        `;

        await client.query(paymentQuery, [
          orderId,
          orderData.paidAmount,
          orderData.paymentMethod,
          '受注時入金',
          orderData.createdBy
        ]);
      }

      await client.query('COMMIT');

      // 作成した受注を取得して返す
      return await this.findOrderById(orderId) as Order;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 受注更新
  async updateOrder(id: string, updates: {
    status?: OrderStatus;
    deliveryDate?: string;
    notes?: string;
  }): Promise<Order | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.deliveryDate !== undefined) {
      fields.push(`delivery_date = $${paramIndex}`);
      values.push(updates.deliveryDate);
      paramIndex++;
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updates.notes);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findOrderById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE orders 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.findOrderById(id);
  }

  // 入金追加
  async addPayment(paymentData: {
    orderId: string;
    paymentAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    createdBy: string;
  }): Promise<Payment> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 入金レコード作成
      const paymentQuery = `
        INSERT INTO payments (
          id, order_id, payment_date, payment_amount, 
          payment_method, notes, created_by
        ) VALUES (
          gen_random_uuid(), $1, NOW(), $2, $3, $4, $5
        ) RETURNING *
      `;

      const paymentResult = await client.query(paymentQuery, [
        paymentData.orderId,
        paymentData.paymentAmount,
        paymentData.paymentMethod,
        paymentData.notes,
        paymentData.createdBy
      ]);

      // 受注の入金額を更新（balance_amountは自動計算）
      const updateOrderQuery = `
        UPDATE orders 
        SET 
          paid_amount = paid_amount + $1,
          updated_at = NOW()
        WHERE id = $2
      `;

      await client.query(updateOrderQuery, [
        paymentData.paymentAmount,
        paymentData.orderId
      ]);

      await client.query('COMMIT');
      return this.transformToPayment(paymentResult.rows[0]);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}