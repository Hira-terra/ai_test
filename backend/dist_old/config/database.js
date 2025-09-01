"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.Database = void 0;
const pg_1 = require("pg");
const index_1 = require("./index");
const logger_1 = require("@/utils/logger");
class Database {
    constructor() {
        const poolConfig = {
            host: index_1.config.database.host,
            port: index_1.config.database.port,
            database: index_1.config.database.name,
            user: index_1.config.database.user,
            password: index_1.config.database.password,
            ssl: index_1.config.database.ssl ? {
                rejectUnauthorized: false
            } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            statement_timeout: 30000,
            query_timeout: 30000,
        };
        this.pool = new pg_1.Pool(poolConfig);
        this.pool.on('connect', () => {
            logger_1.logger.info('データベースに接続しました');
        });
        this.pool.on('error', (err) => {
            logger_1.logger.error('データベース接続エラー:', err);
        });
    }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    async query(text, params) {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger_1.logger.debug(`クエリ実行: ${duration}ms`, { query: text, params });
            return result;
        }
        catch (error) {
            logger_1.logger.error('クエリエラー:', { query: text, params, error });
            throw error;
        }
    }
    async getClient() {
        return await this.pool.connect();
    }
    async transaction(callback) {
        const client = await this.getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async testConnection() {
        try {
            await this.query('SELECT NOW()');
            return true;
        }
        catch (error) {
            logger_1.logger.error('データベース接続テスト失敗:', error);
            return false;
        }
    }
    async close() {
        await this.pool.end();
        logger_1.logger.info('データベース接続を終了しました');
    }
    getPool() {
        return this.pool;
    }
}
exports.Database = Database;
exports.db = Database.getInstance();
//# sourceMappingURL=database.js.map