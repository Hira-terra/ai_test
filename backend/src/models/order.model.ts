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
  Prescription
} from '../types';

export interface OrderModel {
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

export interface OrderItemModel {
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

export interface PaymentModel {
  id: UUID;
  order_id: UUID;
  payment_date: DateString;
  payment_amount: number;
  payment_method: PaymentMethod;
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

  private transformToOrder(row: OrderModel & { 
    customer_last_name?: string;
    customer_first_name?: string;
    customer_code?: string;
    store_name?: string;
    store_code?: string;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private transformToOrderItem(row: OrderItemModel & {
    product_name?: string;
    product_code?: string;
    product_brand?: string;
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
        category: 'frame', // デフォルト値
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
    page?: number;
    limit?: number;
    storeId?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    const { customerId, status, fromDate, toDate, page = 1, limit = 50, storeId } = params;
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

    const query = `
      SELECT 
        o.*,
        c.last_name as customer_last_name,
        c.first_name as customer_first_name,
        c.customer_code,
        s.name as store_name,
        s.store_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      WHERE ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.db.query(query, queryParams),
      this.db.query(countQuery, queryParams.slice(0, -2)) // LIMIT, OFFSETを除く
    ]);

    const orders = result.rows.map((row: any) => this.transformToOrder(row));
    const total = parseInt(countResult.rows[0].total);

    // 各受注の明細と入金情報を取得
    for (const order of orders) {
      const [items, payments] = await Promise.all([
        this.findOrderItems(order.id),
        this.findPayments(order.id)
      ]);
      order.items = items;
      order.payments = payments;
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
        s.store_code
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const order = this.transformToOrder(result.rows[0]);
    
    // 明細と入金情報を取得
    const [items, payments] = await Promise.all([
      this.findOrderItems(order.id),
      this.findPayments(order.id)
    ]);
    
    order.items = items;
    order.payments = payments;

    return order;
  }

  // 受注明細取得
  async findOrderItems(orderId: string): Promise<OrderItem[]> {
    const query = `
      SELECT 
        oi.*,
        p.name as product_name,
        p.product_code,
        p.brand as product_brand,
        f.serial_number as frame_serial_number,
        f.color as frame_color
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN frames f ON oi.frame_id = f.id
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `;

    const result = await this.db.query(query, [orderId]);
    return result.rows.map((row: any) => this.transformToOrderItem(row));
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

  // 受注作成
  async createOrder(orderData: {
    orderNumber: string;
    customerId: string;
    storeId: string;
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
          'ordered', $5, $6, $7, $8, $9, $10, $11
        ) RETURNING *
      `;

      const orderResult = await client.query(orderQuery, [
        orderData.orderNumber,
        orderData.customerId,
        orderData.storeId,
        orderData.deliveryDate,
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
            unit_price, prescription_id, notes
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
          )
        `;

        await client.query(itemQuery, [
          orderId,
          item.productId,
          item.frameId,
          item.quantity,
          item.unitPrice,
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