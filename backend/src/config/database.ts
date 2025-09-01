import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from './index';
import { logger } from '@/utils/logger';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    const poolConfig: PoolConfig = {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? {
        rejectUnauthorized: false
      } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000,
      query_timeout: 30000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('connect', () => {
      logger.info('データベースに接続しました');
    });

    this.pool.on('error', (err) => {
      logger.error('データベース接続エラー:', err);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug(`クエリ実行: ${duration}ms`, { query: text, params });
      return result;
    } catch (error) {
      logger.error('クエリエラー:', { query: text, params, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT NOW()');
      return true;
    } catch (error) {
      logger.error('データベース接続テスト失敗:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    logger.info('データベース接続を終了しました');
  }

  public getPool(): Pool {
    return this.pool;
  }
}

export const db = Database.getInstance();