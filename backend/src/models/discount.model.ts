import { Discount, UUID } from '../types';
import { logger } from '../utils/logger';

export class DiscountModel {
  private db: any; // Database | Pool

  constructor(database: any) {
    this.db = database;
    logger.info('[DiscountModel] 初期化完了');
  }

  // 値引き一覧取得
  async findAll(): Promise<{ discounts: Discount[]; total: number }> {
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
          requires_manager_approval,
          is_active,
          description,
          created_at,
          updated_at
        FROM discounts 
        ORDER BY display_order ASC, created_at DESC
      `;
      
      const result = await this.db.query(query);
      
      const discounts: Discount[] = result.rows.map((row: any) => ({
        id: row.id,
        discountCode: row.discount_code,
        name: row.name,
        description: row.description || '',
        type: row.type,
        value: parseFloat(row.value.toString()),
        maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount.toString()) : undefined,
        minOrderAmount: parseFloat(row.min_order_amount?.toString() || '0'),
        applicableTo: row.applicable_to || 'order',
        productCategoryFilter: row.product_category_filter ? JSON.parse(row.product_category_filter) : undefined,
        customerTypeFilter: row.customer_type_filter ? JSON.parse(row.customer_type_filter) : undefined,
        validFrom: row.valid_from ? row.valid_from.toISOString() : undefined,
        validTo: row.valid_to ? row.valid_to.toISOString() : undefined,
        requiresManagerApproval: row.requires_manager_approval || false,
        maxUsesPerCustomer: row.max_uses_per_customer || undefined,
        maxUsesTotal: row.max_uses_total || undefined,
        currentUses: row.current_uses || 0,
        isActive: row.is_active !== false,
        displayOrder: row.display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
      
      return { discounts, total: discounts.length };
    } catch (error) {
      logger.error('[DiscountModel] 値引き一覧取得エラー:', error);
      throw error;
    }
  }

  // 値引き作成
  async create(discountData: Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>, createdBy: UUID): Promise<Discount> {
    try {
      await this.db.query('BEGIN');
      
      const query = `
        INSERT INTO discounts (
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          requires_manager_approval,
          is_active,
          description,
          created_by,
          applicable_to
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'order')
        RETURNING 
          id,
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          requires_manager_approval,
          is_active,
          description,
          created_at,
          updated_at
      `;
      
      const values = [
        discountData.discountCode,
        discountData.name,
        discountData.type,
        discountData.value,
        discountData.minOrderAmount,
        discountData.maxDiscountAmount,
        discountData.requiresManagerApproval,
        discountData.isActive,
        discountData.description,
        createdBy,
      ];
      
      const result = await this.db.query(query, values);
      await this.db.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id,
        discountCode: row.discount_code,
        name: row.name,
        description: row.description || '',
        type: row.type,
        value: parseFloat(row.value.toString()),
        maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount.toString()) : undefined,
        minOrderAmount: parseFloat(row.min_order_amount?.toString() || '0'),
        applicableTo: row.applicable_to || 'order',
        productCategoryFilter: row.product_category_filter ? JSON.parse(row.product_category_filter) : undefined,
        customerTypeFilter: row.customer_type_filter ? JSON.parse(row.customer_type_filter) : undefined,
        validFrom: row.valid_from ? row.valid_from.toISOString() : undefined,
        validTo: row.valid_to ? row.valid_to.toISOString() : undefined,
        requiresManagerApproval: row.requires_manager_approval || false,
        maxUsesPerCustomer: row.max_uses_per_customer || undefined,
        maxUsesTotal: row.max_uses_total || undefined,
        currentUses: row.current_uses || 0,
        isActive: row.is_active !== false,
        displayOrder: row.display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  // 値引き更新
  async update(id: UUID, discountData: Partial<Omit<Discount, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Discount | null> {
    // Database型対応のため、直接queryメソッドを使用
    
    try {
      await this.db.query('BEGIN');
      
      const setParts: string[] = [];
      const values: any[] = [];
      let paramCount = 1;
      
      if (discountData.discountCode !== undefined) {
        setParts.push(`discount_code = $${paramCount++}`);
        values.push(discountData.discountCode);
      }
      
      if (discountData.name !== undefined) {
        setParts.push(`name = $${paramCount++}`);
        values.push(discountData.name);
      }
      
      if (discountData.type !== undefined) {
        setParts.push(`type = $${paramCount++}`);
        values.push(discountData.type);
      }
      
      if (discountData.value !== undefined) {
        setParts.push(`value = $${paramCount++}`);
        values.push(discountData.value);
      }
      
      if (discountData.minOrderAmount !== undefined) {
        setParts.push(`min_order_amount = $${paramCount++}`);
        values.push(discountData.minOrderAmount);
      }
      
      if (discountData.maxDiscountAmount !== undefined) {
        setParts.push(`max_discount_amount = $${paramCount++}`);
        values.push(discountData.maxDiscountAmount);
      }
      
      if (discountData.requiresManagerApproval !== undefined) {
        setParts.push(`requires_manager_approval = $${paramCount++}`);
        values.push(discountData.requiresManagerApproval);
      }
      
      if (discountData.isActive !== undefined) {
        setParts.push(`is_active = $${paramCount++}`);
        values.push(discountData.isActive);
      }
      
      if (discountData.description !== undefined) {
        setParts.push(`description = $${paramCount++}`);
        values.push(discountData.description);
      }
      
      if (setParts.length === 0) {
        return this.findById(id);
      }
      
      setParts.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const query = `
        UPDATE discounts 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING 
          id,
          discount_code,
          name,
          type,
          value,
          min_order_amount,
          max_discount_amount,
          requires_manager_approval,
          is_active,
          description,
          created_at,
          updated_at
      `;
      
      const result = await this.db.query(query, values);
      await this.db.query('COMMIT');
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        discountCode: row.discount_code,
        name: row.name,
        description: row.description || '',
        type: row.type,
        value: parseFloat(row.value.toString()),
        maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount.toString()) : undefined,
        minOrderAmount: parseFloat(row.min_order_amount?.toString() || '0'),
        applicableTo: row.applicable_to || 'order',
        productCategoryFilter: row.product_category_filter ? JSON.parse(row.product_category_filter) : undefined,
        customerTypeFilter: row.customer_type_filter ? JSON.parse(row.customer_type_filter) : undefined,
        validFrom: row.valid_from ? row.valid_from.toISOString() : undefined,
        validTo: row.valid_to ? row.valid_to.toISOString() : undefined,
        requiresManagerApproval: row.requires_manager_approval || false,
        maxUsesPerCustomer: row.max_uses_per_customer || undefined,
        maxUsesTotal: row.max_uses_total || undefined,
        currentUses: row.current_uses || 0,
        isActive: row.is_active !== false,
        displayOrder: row.display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  // 値引き削除（論理削除）
  async delete(id: UUID): Promise<boolean> {
    // Database型対応のため、直接queryメソッドを使用
    
    try {
      await this.db.query('BEGIN');
      
      const query = `
        UPDATE discounts 
        SET 
          is_active = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      await this.db.query('COMMIT');
      
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  // 値引き詳細取得
  async findById(id: UUID): Promise<Discount | null> {
    // Database型対応のため、直接queryメソッドを使用
    
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
          requires_manager_approval,
          is_active,
          description,
          created_at,
          updated_at
        FROM discounts 
        WHERE id = $1
      `;
      
      const result = await this.db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        discountCode: row.discount_code,
        name: row.name,
        description: row.description || '',
        type: row.type,
        value: parseFloat(row.value.toString()),
        maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount.toString()) : undefined,
        minOrderAmount: parseFloat(row.min_order_amount?.toString() || '0'),
        applicableTo: row.applicable_to || 'order',
        productCategoryFilter: row.product_category_filter ? JSON.parse(row.product_category_filter) : undefined,
        customerTypeFilter: row.customer_type_filter ? JSON.parse(row.customer_type_filter) : undefined,
        validFrom: row.valid_from ? row.valid_from.toISOString() : undefined,
        validTo: row.valid_to ? row.valid_to.toISOString() : undefined,
        requiresManagerApproval: row.requires_manager_approval || false,
        maxUsesPerCustomer: row.max_uses_per_customer || undefined,
        maxUsesTotal: row.max_uses_total || undefined,
        currentUses: row.current_uses || 0,
        isActive: row.is_active !== false,
        displayOrder: row.display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } catch (error) {
      await this.db.query('ROLLBACK');
      logger.error('[DiscountModel] 値引き削除エラー:', error);
      throw error;
    }
  }

  // アクティブな値引き一覧取得
  async findActive(): Promise<Discount[]> {
    // Database型対応のため、直接queryメソッドを使用
    
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
          requires_manager_approval,
          is_active,
          description,
          created_at,
          updated_at
        FROM discounts 
        WHERE is_active = true
        ORDER BY display_order ASC, created_at DESC
      `;
      
      const result = await this.db.query(query);
      
      const discounts = result.rows.map((row: any) => ({
        id: row.id,
        discountCode: row.discount_code,
        name: row.name,
        description: row.description || '',
        type: row.type,
        value: parseFloat(row.value.toString()),
        maxDiscountAmount: row.max_discount_amount ? parseFloat(row.max_discount_amount.toString()) : undefined,
        minOrderAmount: parseFloat(row.min_order_amount?.toString() || '0'),
        applicableTo: row.applicable_to || 'order',
        productCategoryFilter: row.product_category_filter ? JSON.parse(row.product_category_filter) : undefined,
        customerTypeFilter: row.customer_type_filter ? JSON.parse(row.customer_type_filter) : undefined,
        validFrom: row.valid_from ? row.valid_from.toISOString() : undefined,
        validTo: row.valid_to ? row.valid_to.toISOString() : undefined,
        requiresManagerApproval: row.requires_manager_approval || false,
        maxUsesPerCustomer: row.max_uses_per_customer || undefined,
        maxUsesTotal: row.max_uses_total || undefined,
        currentUses: row.current_uses || 0,
        isActive: row.is_active !== false,
        displayOrder: row.display_order || 0,
        createdBy: row.created_by,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      }));
      
      return discounts;
    } catch (error) {
      logger.error('[DiscountModel] アクティブ値引き一覧取得エラー:', error);
      throw error;
    }
  }
}