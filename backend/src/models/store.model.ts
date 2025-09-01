import { Pool } from 'pg';
import { Store, UUID, DateString } from '../types';

export interface StoreModel {
  id: UUID;
  store_code: string;
  name: string;
  address: string;
  phone?: string;
  manager_name?: string;
  created_at: DateString;
  updated_at: DateString;
}

export class StoreRepository {
  constructor(private db: Pool) {}

  async findByStoreCode(storeCode: string): Promise<StoreModel | null> {
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name,
        created_at, updated_at
      FROM stores
      WHERE store_code = $1
    `;

    const result = await this.db.query(query, [storeCode]);
    return result.rows[0] || null;
  }

  async findById(id: UUID): Promise<StoreModel | null> {
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name,
        created_at, updated_at
      FROM stores
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<StoreModel[]> {
    const query = `
      SELECT 
        id, store_code, name, address, phone, manager_name,
        created_at, updated_at
      FROM stores
      ORDER BY store_code ASC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}