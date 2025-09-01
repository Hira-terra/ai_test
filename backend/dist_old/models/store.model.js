"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreRepository = void 0;
class StoreRepository {
    constructor(db) {
        this.db = db;
    }
    async findByStoreCode(storeCode) {
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
    async findById(id) {
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
    async findAll() {
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
exports.StoreRepository = StoreRepository;
//# sourceMappingURL=store.model.js.map