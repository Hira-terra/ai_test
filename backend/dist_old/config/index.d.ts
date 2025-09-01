interface Config {
    env: string;
    port: number;
    host: string;
    database: {
        host: string;
        port: number;
        name: string;
        user: string;
        password: string;
        ssl: boolean;
    };
    redis: {
        host: string;
        port: number;
        password?: string;
    };
    jwt: {
        secret: string;
        refreshSecret: string;
        expiresIn: string;
        refreshExpiresIn: string;
    };
    cors: {
        origin: string[];
        credentials: boolean;
    };
    upload: {
        maxFileSize: number;
        allowedTypes: string[];
        directory: string;
    };
    email: {
        host: string;
        port: number;
        secure: boolean;
        user: string;
        password: string;
    };
    logging: {
        level: string;
        directory: string;
    };
    security: {
        bcryptRounds: number;
        maxLoginAttempts: number;
        lockoutTime: number;
        rateLimitWindow: number;
        rateLimitMax: number;
    };
}
export declare const config: Config;
export declare const isProduction: boolean;
export declare const isDevelopment: boolean;
export declare const isTest: boolean;
export {};
//# sourceMappingURL=index.d.ts.map