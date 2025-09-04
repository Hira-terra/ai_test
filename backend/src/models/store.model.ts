import { Pool, PoolClient } from 'pg';
import { Store, UUID, DateString, CreateStoreRequest, UpdateStoreRequest } from '../types';

export interface StoreModel {
  id: UUID;
  store_code: string;
  name: string;
  address: string;
  phone?: string;
  manager_name?: string;
  is_active: boolean;
  created_at: DateString;
  updated_at: DateString;
}

export class StoreRepository {
  constructor(private db: Pool) {}

  async findByStoreCode(storeCode: string, client?: PoolClient): Promise<StoreModel | null> {
    const db = client || this.db;
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name, is_active,
        created_at, updated_at
      FROM stores
      WHERE store_code = $1
    `;

    const result = await db.query(query, [storeCode]);
    return result.rows[0] || null;
  }

  async findById(id: UUID, client?: PoolClient): Promise<StoreModel | null> {
    const db = client || this.db;
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name, is_active,
        created_at, updated_at
      FROM stores
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(includeInactive = false): Promise<StoreModel[]> {
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name, is_active,
        created_at, updated_at
      FROM stores
      ${includeInactive ? '' : 'WHERE is_active = true'}
      ORDER BY store_code ASC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  async create(data: CreateStoreRequest, client?: PoolClient): Promise<StoreModel> {
    const db = client || this.db;
    const query = `
      INSERT INTO stores (
        store_code, name, address, phone, manager_name, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.storeCode,
      data.name,
      data.address,
      data.phone || null,
      data.managerName || null,
      data.isActive !== false
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async update(id: UUID, data: UpdateStoreRequest, client?: PoolClient): Promise<StoreModel> {
    const db = client || this.db;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.storeCode !== undefined) {
      updates.push(`store_code = $${paramCount++}`);
      values.push(data.storeCode);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(data.address);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.managerName !== undefined) {
      updates.push(`manager_name = $${paramCount++}`);
      values.push(data.managerName);
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE stores
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async softDelete(id: UUID, client?: PoolClient): Promise<void> {
    const db = client || this.db;
    const query = `
      UPDATE stores
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(query, [id]);
  }

  async countUsers(storeId: UUID, client?: PoolClient): Promise<number> {
    const db = client || this.db;
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE store_id = $1 AND is_active = true
    `;

    const result = await db.query(query, [storeId]);
    return parseInt(result.rows[0].count, 10);
  }

  async countCustomers(storeId: UUID, client?: PoolClient): Promise<number> {
    const db = client || this.db;
    const query = `
      SELECT COUNT(*) as count
      FROM customers
      WHERE store_id = $1
    `;

    const result = await db.query(query, [storeId]);
    return parseInt(result.rows[0].count, 10);
  }
}