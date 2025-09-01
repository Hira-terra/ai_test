import { Pool } from 'pg';
import { User, UserRole, UUID, DateString } from '../types';

export interface UserModel {
  id: UUID;
  user_code: string;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  is_active: boolean;
  store_id: UUID;
  last_login_at?: DateString;
  created_at: DateString;
  updated_at: DateString;
}

export class UserRepository {
  constructor(private db: Pool) {}

  async findByUserCodeAndStoreCode(userCode: string, storeCode: string): Promise<UserModel | null> {
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

  async findById(id: UUID): Promise<UserModel | null> {
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
}