import { Pool } from 'pg';
import { config } from '../../src/config';

class DatabaseTestHelper {
  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl
    });
  }

  async connect() {
    try {
      await this.pool.query('SELECT 1');
      console.log('✅ データベース接続成功');
      return true;
    } catch (error) {
      console.error('❌ データベース接続失敗:', error.message);
      throw error;
    }
  }

  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  async rollbackTransaction(client) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
  }

  async commitTransaction(client) {
    if (client) {
      await client.query('COMMIT');
      client.release();
    }
  }

  async clearTable(tableName) {
    await this.pool.query(`DELETE FROM ${tableName}`);
  }

  async clearAllTestData() {
    // テストで作成されたデータを全て削除（順序重要）
    const tables = [
      'token_blacklist',
      'user_sessions',
      'login_attempts',
      'customer_memos',
      'image_annotations',
      'customer_images',
      'order_items',
      'payments',
      'orders',
      'prescriptions',
      'customers',
      'users',
      'stores'
    ];

    for (const table of tables) {
      try {
        await this.clearTable(table);
        console.log(`✅ ${table}テーブルをクリア`);
      } catch (error) {
        console.warn(`⚠️ ${table}テーブルのクリア失敗:`, error.message);
      }
    }
  }

  async close() {
    await this.pool.end();
  }

  getPool() {
    return this.pool;
  }
}

export default new DatabaseTestHelper();