"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTest = exports.isDevelopment = exports.isProduction = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'glasses_store',
        user: process.env.DB_USER || 'glasses_user',
        password: process.env.DB_PASSWORD || 'glasses_password',
        ssl: process.env.DB_SSL === 'true',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true,
    },
    upload: {
        maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '5242880', 10),
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        directory: process.env.UPLOAD_DIRECTORY || path_1.default.join(__dirname, '../../uploads'),
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: process.env.LOG_DIRECTORY || path_1.default.join(__dirname, '../../logs'),
    },
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
        lockoutTime: parseInt(process.env.LOCKOUT_TIME || '900000', 10),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10),
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
};
exports.isProduction = exports.config.env === 'production';
exports.isDevelopment = exports.config.env === 'development';
exports.isTest = exports.config.env === 'test';
//# sourceMappingURL=index.js.map