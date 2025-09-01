"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
class UserRepository {
    constructor(db) {
        this.db = db;
    }
    async findByUserCodeAndStoreCode(userCode, storeCode) {
        const query = `
      SELECT 
        u.id, u.user_code, u.name, u.email, u.role, u.is_active, 
        u.password_hash as password, u.store_id, 
        u.last_login_at, u.created_at, u.updated_at
      FROM users u
      INNER JOIN stores s ON u.store_id = s.id
      WHERE u.user_code = $1 AND s.store_code = $2
        AND u.is_active = true
    `;
        const result = await this.db.query(query, [userCode, storeCode]);
        return result.rows[0] || null;
    }
    async findById(id) {
        const query = `
      SELECT 
        id, user_code, name, email, role, is_active, 
        password_hash as password, store_id, 
        last_login_at, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
        const result = await this.db.query(query, [id]);
        return result.rows[0] || null;
    }
    async updateLastLoginAt(id) {
        await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
    }
    async incrementFailedLoginCount(id) {
        return 0;
    }
    async lockAccount(id, lockedUntil) {
        return;
    }
    async resetFailedLoginCount(id) {
        return;
    }
    async unlockAccount(id) {
        return;
    }
    async isAccountLocked(id) {
        return false;
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.model.js.map