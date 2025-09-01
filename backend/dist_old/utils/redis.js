"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const config_1 = require("@/config");
const logger_1 = require("@/utils/logger");
class RedisClient {
    constructor() {
        const clientConfig = {
            socket: {
                host: config_1.config.redis.host,
                port: config_1.config.redis.port,
            },
        };
        if (config_1.config.redis.password) {
            clientConfig.password = config_1.config.redis.password;
        }
        this.client = (0, redis_1.createClient)(clientConfig);
        this.client.on('connect', () => {
            logger_1.logger.info('Redisに接続しました');
        });
        this.client.on('error', (err) => {
            logger_1.logger.error('Redis接続エラー:', err);
        });
        this.client.on('end', () => {
            logger_1.logger.info('Redis接続を終了しました');
        });
    }
    static getInstance() {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }
    async connect() {
        try {
            await this.client.connect();
        }
        catch (error) {
            logger_1.logger.error('Redis接続失敗:', error);
            throw error;
        }
    }
    async set(key, value, expireInSeconds) {
        try {
            if (expireInSeconds) {
                await this.client.setEx(key, expireInSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (error) {
            logger_1.logger.error(`Redis SET エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis GET エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            return await this.client.del(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis DEL エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            return await this.client.exists(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis EXISTS エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async expire(key, seconds) {
        try {
            return (await this.client.expire(key, seconds)) === true;
        }
        catch (error) {
            logger_1.logger.error(`Redis EXPIRE エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async incr(key) {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis INCR エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async ttl(key) {
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis TTL エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async hSet(key, field, value) {
        try {
            return await this.client.hSet(key, field, value);
        }
        catch (error) {
            logger_1.logger.error(`Redis HSET エラー (key: ${key}, field: ${field}):`, error);
            throw error;
        }
    }
    async hGet(key, field) {
        try {
            return await this.client.hGet(key, field);
        }
        catch (error) {
            logger_1.logger.error(`Redis HGET エラー (key: ${key}, field: ${field}):`, error);
            throw error;
        }
    }
    async hGetAll(key) {
        try {
            return await this.client.hGetAll(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis HGETALL エラー (key: ${key}):`, error);
            throw error;
        }
    }
    async disconnect() {
        await this.client.quit();
    }
    isReady() {
        return this.client.isReady;
    }
}
exports.redis = RedisClient.getInstance();
//# sourceMappingURL=redis.js.map