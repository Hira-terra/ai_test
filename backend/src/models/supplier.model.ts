import { Pool } from 'pg';
import { Supplier } from '../types';

export class SupplierModel {
  constructor(private db: Pool) {}

  /**
   * 仕入先一覧を取得
   */
  async findAll(params?: { isActive?: boolean }): Promise<Supplier[]> {
    let whereClause = '1=1';
    const queryParams: any[] = [];
    
    if (params?.isActive !== undefined) {
      whereClause += ' AND is_active = $1';
      queryParams.push(params.isActive);
    }
    
    const query = `
      SELECT 
        id,
        supplier_code as "supplierCode",
        name,
        contact_info as "contactInfo",
        order_method as "orderMethod",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM suppliers 
      WHERE ${whereClause}
      ORDER BY name
    `;
    
    const result = await this.db.query(query, queryParams);
    return result.rows;
  }

  /**
   * 仕入先をIDで取得
   */
  async findById(id: string): Promise<Supplier | null> {
    const query = `
      SELECT 
        id,
        supplier_code as "supplierCode",
        name,
        contact_info as "contactInfo",
        order_method as "orderMethod",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM suppliers 
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * 仕入先をコードで取得
   */
  async findByCode(supplierCode: string): Promise<Supplier | null> {
    const query = `
      SELECT 
        id,
        supplier_code as "supplierCode",
        name,
        contact_info as "contactInfo",
        order_method as "orderMethod",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM suppliers 
      WHERE supplier_code = $1
    `;
    
    const result = await this.db.query(query, [supplierCode]);
    return result.rows[0] || null;
  }

  /**
   * 仕入先を作成
   */
  async create(supplierData: {
    supplierCode: string;
    name: string;
    contactInfo?: string;
    orderMethod: 'edi' | 'csv' | 'fax' | 'email';
    isActive?: boolean;
  }): Promise<Supplier> {
    const query = `
      INSERT INTO suppliers (
        supplier_code, name, contact_info, order_method, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        supplier_code as "supplierCode",
        name,
        contact_info as "contactInfo",
        order_method as "orderMethod",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const values = [
      supplierData.supplierCode,
      supplierData.name,
      supplierData.contactInfo || null,
      supplierData.orderMethod,
      supplierData.isActive ?? true
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * 仕入先を更新
   */
  async update(id: string, supplierData: {
    name?: string;
    contactInfo?: string;
    orderMethod?: 'edi' | 'csv' | 'fax' | 'email';
    isActive?: boolean;
  }): Promise<Supplier | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (supplierData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(supplierData.name);
    }
    if (supplierData.contactInfo !== undefined) {
      updates.push(`contact_info = $${paramCount++}`);
      values.push(supplierData.contactInfo);
    }
    if (supplierData.orderMethod !== undefined) {
      updates.push(`order_method = $${paramCount++}`);
      values.push(supplierData.orderMethod);
    }
    if (supplierData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(supplierData.isActive);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE suppliers 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        supplier_code as "supplierCode",
        name,
        contact_info as "contactInfo",
        order_method as "orderMethod",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * 仕入先を削除
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM suppliers WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }
}