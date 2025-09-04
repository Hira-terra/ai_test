import { Pool } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { 
  User, 
  UserRole, 
  Store,
  UUID, 
  DateString
} from '../types';

export interface UserModel {
  id: UUID;
  user_code: string;
  name: string;
  email?: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  store_id: UUID;
  last_login_at?: DateString;
  created_at: DateString;
  updated_at: DateString;
}

export interface CreateUserData {
  userCode: string;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  storeId: UUID;
  isActive: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserSearchParams {
  storeId?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class UserRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[UserRepository] 初期化完了');
  }

  private transformToUser(row: UserModel & {
    store_name?: string;
    store_code?: string;
    store_address?: string;
  }): User {
    return {
      id: row.id,
      userCode: row.user_code,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.is_active,
      store: {
        id: row.store_id,
        storeCode: row.store_code || '',
        name: row.store_name || '',
        address: row.store_address || ''
      } as Store,
      lastLoginAt: row.last_login_at
    };
  }

  async findByUserCodeAndStoreCode(userCode: string, storeCode: string): Promise<UserModel | null> {
    const query = `
      SELECT 
        u.id, u.user_code, u.name, u.email, u.role, u.is_active, 
        u.password_hash, u.store_id, 
        u.last_login_at, u.created_at, u.updated_at
      FROM users u
      INNER JOIN stores s ON u.store_id = s.id
      WHERE u.user_code = $1 AND s.store_code = $2
        AND u.is_active = true
    `;

    const result = await this.db.query(query, [userCode, storeCode]);
    return result.rows[0] || null;
  }

  async findById(id: UUID): Promise<UserModel | null> {
    const query = `
      SELECT 
        id, user_code, name, email, role, is_active, 
        password_hash, store_id, 
        last_login_at, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateLastLoginAt(id: UUID): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [id]
    );
  }

  async incrementFailedLoginCount(id: UUID): Promise<number> {
    // 簡略化：失敗ログイン回数のトラッキングは現在無効
    return 0;
  }

  async lockAccount(id: UUID, lockedUntil: Date): Promise<void> {
    // 簡略化：アカウントロック機能は現在無効
    return;
  }

  async resetFailedLoginCount(id: UUID): Promise<void> {
    // 簡略化：失敗ログイン回数のリセットは現在無効
    return;
  }

  async unlockAccount(id: UUID): Promise<void> {
    // 簡略化：アカウントアンロック機能は現在無効
    return;
  }

  async isAccountLocked(id: UUID): Promise<boolean> {
    // 簡略化：アカウントロック機能は現在無効
    // 必要に応じて後でlocked_untilカラムを追加して実装
    return false;
  }

  // ユーザー一覧取得（管理機能用）
  async findUsers(params: UserSearchParams): Promise<{ users: User[]; total: number }> {
    const { storeId, role, isActive, page = 1, limit = 50 } = params;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (storeId) {
      whereClause += ` AND u.store_id = $${paramIndex}`;
      queryParams.push(storeId);
      paramIndex++;
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`;
      queryParams.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereClause += ` AND u.is_active = $${paramIndex}`;
      queryParams.push(isActive);
      paramIndex++;
    }

    const query = `
      SELECT 
        u.*,
        s.name as store_name,
        s.store_code,
        s.address as store_address
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      this.db.query(query, queryParams),
      this.db.query(countQuery, queryParams.slice(0, -2))
    ]);

    const users = result.rows.map((row: any) => this.transformToUser(row));
    const total = parseInt(countResult.rows[0].total);

    return { users, total };
  }

  // ユーザー詳細取得（管理機能用）
  async findUserById(id: string): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        s.name as store_name,
        s.store_code,
        s.address as store_address
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToUser(result.rows[0]);
  }

  // ユーザーコードでの検索（重複チェック用）
  async findUserByUserCode(userCode: string): Promise<User | null> {
    const query = `
      SELECT 
        u.*,
        s.name as store_name,
        s.store_code,
        s.address as store_address
      FROM users u
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.user_code = $1
    `;

    const result = await this.db.query(query, [userCode]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.transformToUser(result.rows[0]);
  }

  // ユーザー作成（管理機能用）
  async createUser(userData: CreateUserData): Promise<User> {
    const query = `
      INSERT INTO users (
        id, user_code, name, email, password_hash, role, 
        store_id, is_active
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
      ) RETURNING *
    `;

    const result = await this.db.query(query, [
      userData.userCode,
      userData.name,
      userData.email,
      userData.password,
      userData.role,
      userData.storeId,
      userData.isActive
    ]);

    const userId = result.rows[0].id;
    return await this.findUserById(userId) as User;
  }

  // ユーザー更新（管理機能用）
  async updateUser(id: string, updates: UpdateUserData): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(updates.email);
      paramIndex++;
    }

    if (updates.password !== undefined) {
      fields.push(`password_hash = $${paramIndex}`);
      values.push(updates.password);
      paramIndex++;
    }

    if (updates.role !== undefined) {
      fields.push(`role = $${paramIndex}`);
      values.push(updates.role);
      paramIndex++;
    }

    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex}`);
      values.push(updates.isActive);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.findUserById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.findUserById(id);
  }
}