import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dbHelper from './db-test-helper';

class TestAuthHelper {
  constructor() {
    this.testUsers = new Map();
    this.testStores = new Map();
  }

  generateUniqueEmail() {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
  }

  generateUniqueUserCode() {
    return `TEST${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  generateUniqueStoreCode() {
    return `ST${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  async createTestStore(overrides = {}) {
    const storeId = uuidv4();
    const storeCode = overrides.store_code || this.generateUniqueStoreCode();
    
    const store = {
      id: storeId,
      store_code: storeCode,
      name: overrides.name || `テスト店舗 ${storeCode}`,
      address: overrides.address || '東京都渋谷区テスト1-1-1',
      phone: overrides.phone || '03-1234-5678',
      manager_name: overrides.manager_name || 'テスト店長',
      is_active: overrides.is_active !== undefined ? overrides.is_active : true
    };

    const query = `
      INSERT INTO stores (id, store_code, name, address, phone, manager_name, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await dbHelper.pool.query(query, [
      store.id,
      store.store_code,
      store.name,
      store.address,
      store.phone,
      store.manager_name,
      store.is_active
    ]);

    const createdStore = result.rows[0];
    this.testStores.set(storeCode, createdStore);
    return createdStore;
  }

  async createTestUser(storeId, overrides = {}) {
    const userId = uuidv4();
    const userCode = overrides.user_code || this.generateUniqueUserCode();
    const password = overrides.password || 'TestPassword123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: userId,
      user_code: userCode,
      name: overrides.name || `テストユーザー ${userCode}`,
      email: overrides.email || this.generateUniqueEmail(),
      password: hashedPassword,
      role: overrides.role || 'staff',
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      store_id: storeId,
      failed_login_count: 0
    };

    const query = `
      INSERT INTO users (
        id, user_code, name, email, password, role, 
        is_active, store_id, failed_login_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await dbHelper.pool.query(query, [
      user.id,
      user.user_code,
      user.name,
      user.email,
      user.password,
      user.role,
      user.is_active,
      user.store_id,
      user.failed_login_count
    ]);

    const createdUser = result.rows[0];
    createdUser.plainPassword = password; // テスト用に平文パスワードを保持
    this.testUsers.set(userCode, createdUser);
    return createdUser;
  }

  async createTestUserWithStore(userOverrides = {}, storeOverrides = {}) {
    const store = await this.createTestStore(storeOverrides);
    const user = await this.createTestUser(store.id, userOverrides);
    return { user, store };
  }

  async lockUserAccount(userId, minutes = 30) {
    const lockedUntil = new Date(Date.now() + minutes * 60 * 1000);
    const query = `
      UPDATE users 
      SET locked_until = $2, failed_login_count = 5
      WHERE id = $1
    `;
    await dbHelper.pool.query(query, [userId, lockedUntil]);
  }

  async simulateFailedLogins(userCode, storeCode, count = 5) {
    for (let i = 0; i < count; i++) {
      const query = `
        INSERT INTO login_attempts (
          user_code, store_code, ip_address, success, failure_reason
        ) VALUES ($1, $2, $3, $4, $5)
      `;
      await dbHelper.pool.query(query, [
        userCode,
        storeCode,
        '127.0.0.1',
        false,
        'INVALID_PASSWORD'
      ]);
    }

    // ユーザーの失敗回数も更新
    const updateQuery = `
      UPDATE users u
      SET failed_login_count = $3
      FROM stores s
      WHERE u.store_id = s.id 
        AND u.user_code = $1 
        AND s.store_code = $2
    `;
    await dbHelper.pool.query(updateQuery, [userCode, storeCode, count]);
  }

  async cleanupTestData() {
    // 作成したテストユーザーを削除
    for (const [_, user] of this.testUsers) {
      try {
        await dbHelper.pool.query('DELETE FROM users WHERE id = $1', [user.id]);
      } catch (error) {
        console.warn(`テストユーザー削除失敗: ${user.user_code}`, error.message);
      }
    }

    // 作成したテスト店舗を削除
    for (const [_, store] of this.testStores) {
      try {
        await dbHelper.pool.query('DELETE FROM stores WHERE id = $1', [store.id]);
      } catch (error) {
        console.warn(`テスト店舗削除失敗: ${store.store_code}`, error.message);
      }
    }

    this.testUsers.clear();
    this.testStores.clear();
  }

  extractTokenFromResponse(response) {
    if (response.body?.data?.token) {
      return response.body.data.token;
    }
    return null;
  }

  getAuthHeader(token) {
    return {
      Authorization: `Bearer ${token}`
    };
  }
}

export default new TestAuthHelper();