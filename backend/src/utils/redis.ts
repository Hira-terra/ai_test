import { createClient, RedisClientType } from 'redis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;

  private constructor() {
    const clientConfig: any = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
    };

    // パスワードが設定されている場合のみ追加
    if (config.redis.password) {
      clientConfig.password = config.redis.password;
    }

    this.client = createClient(clientConfig);

    this.client.on('connect', () => {
      logger.info('Redisに接続しました');
    });

    this.client.on('error', (err) => {
      logger.error('Redis接続エラー:', err);
    });

    this.client.on('end', () => {
      logger.info('Redis接続を終了しました');
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Redis接続失敗:', error);
      throw error;
    }
  }

  public async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    try {
      if (expireInSeconds) {
        await this.client.setEx(key, expireInSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Redis SET エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Redis DEL エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return (await this.client.expire(key, seconds)) === true;
    } catch (error) {
      logger.error(`Redis EXPIRE エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Redis INCR エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error(`Redis TTL エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async hSet(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error(`Redis HSET エラー (key: ${key}, field: ${field}):`, error);
      throw error;
    }
  }

  public async hGet(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error(`Redis HGET エラー (key: ${key}, field: ${field}):`, error);
      throw error;
    }
  }

  public async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error(`Redis HGETALL エラー (key: ${key}):`, error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }

  public isReady(): boolean {
    return this.client.isReady;
  }
}

export const redis = RedisClient.getInstance();