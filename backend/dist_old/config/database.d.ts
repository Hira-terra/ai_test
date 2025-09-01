import { Pool, PoolClient } from 'pg';
export declare class Database {
    private static instance;
    private pool;
    private constructor();
    static getInstance(): Database;
    query(text: string, params?: any[]): Promise<any>;
    getClient(): Promise<PoolClient>;
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    testConnection(): Promise<boolean>;
    close(): Promise<void>;
    getPool(): Pool;
}
export declare const db: Database;
//# sourceMappingURL=database.d.ts.map