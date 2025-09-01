declare class RedisClient {
    private static instance;
    private client;
    private constructor();
    static getInstance(): RedisClient;
    connect(): Promise<void>;
    set(key: string, value: string, expireInSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    incr(key: string): Promise<number>;
    ttl(key: string): Promise<number>;
    hSet(key: string, field: string, value: string): Promise<number>;
    hGet(key: string, field: string): Promise<string | undefined>;
    hGetAll(key: string): Promise<Record<string, string>>;
    disconnect(): Promise<void>;
    isReady(): boolean;
}
export declare const redis: RedisClient;
export {};
//# sourceMappingURL=redis.d.ts.map