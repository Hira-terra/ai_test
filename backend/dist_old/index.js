"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.application = void 0;
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const config_1 = require("@/config");
const database_1 = require("@/config/database");
const redis_1 = require("@/utils/redis");
const logger_1 = require("@/utils/logger");
const auth_routes_1 = __importDefault(require("@/routes/auth.routes"));
const store_routes_1 = __importDefault(require("@/routes/store.routes"));
const customers_1 = __importDefault(require("@/routes/customers"));
const rateLimiter_1 = require("@/middleware/rateLimiter");
class Application {
    constructor() {
        this.app = (0, express_1.default)();
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }
    initializeMiddlewares() {
        this.app.use((0, helmet_1.default)({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
            crossOriginEmbedderPolicy: false
        }));
        this.app.use((0, cors_1.default)({
            origin: config_1.config.cors.origin,
            credentials: config_1.config.cors.credentials,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));
        this.app.use((0, compression_1.default)());
        this.app.use((0, morgan_1.default)(config_1.isProduction ? 'combined' : 'dev', { stream: logger_1.morganStream }));
        this.app.use(express_1.default.json({
            limit: '10mb',
            strict: true
        }));
        this.app.use(express_1.default.urlencoded({
            extended: true,
            limit: '10mb'
        }));
        this.app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
            maxAge: config_1.isProduction ? '7d' : '0',
            etag: true,
            lastModified: true
        }));
        this.app.use('/static', express_1.default.static(path_1.default.join(__dirname, '../public')));
        this.app.use('/mockups', express_1.default.static(path_1.default.join(__dirname, '../../mockups')));
        this.app.use('/api/', rateLimiter_1.rateLimiter.apiRequests);
    }
    initializeRoutes() {
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: '眼鏡店顧客管理システム API サーバー',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    api: '/api',
                    auth: '/api/auth',
                    stores: '/api/stores',
                    customers: '/api/customers'
                }
            });
        });
        this.app.get('/health', async (req, res) => {
            try {
                const dbHealthy = await database_1.db.testConnection();
                const redisHealthy = redis_1.redis.isReady();
                const health = {
                    status: dbHealthy && redisHealthy ? 'OK' : 'ERROR',
                    timestamp: new Date().toISOString(),
                    services: {
                        database: dbHealthy ? 'OK' : 'ERROR',
                        redis: redisHealthy ? 'OK' : 'ERROR'
                    }
                };
                res.status(health.status === 'OK' ? 200 : 503).json(health);
            }
            catch (error) {
                res.status(503).json({
                    status: 'ERROR',
                    timestamp: new Date().toISOString(),
                    error: 'ヘルスチェック失敗'
                });
            }
        });
        this.app.use('/api/auth', auth_routes_1.default);
        this.app.use('/api/stores', store_routes_1.default);
        this.app.use('/api/customers', customers_1.default);
        this.app.use('/api/*', (req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'APIエンドポイントが見つかりません'
                }
            });
        });
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'リソースが見つかりません'
                }
            });
        });
    }
    initializeErrorHandling() {
        this.app.use((error, req, res, next) => {
            logger_1.logger.error('未処理エラー:', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            if (res.headersSent) {
                return next(error);
            }
            const statusCode = error.statusCode || 500;
            const message = config_1.isProduction && statusCode === 500
                ? 'サーバー内部エラーが発生しました'
                : error.message || 'サーバーエラーが発生しました';
            res.status(statusCode).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message,
                    ...(config_1.isProduction ? {} : { details: error.stack })
                }
            });
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('未処理のPromise拒否:', reason);
            this.gracefulShutdown('unhandledRejection');
        });
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('未処理の例外:', error);
            this.gracefulShutdown('uncaughtException');
        });
        process.on('SIGTERM', () => {
            logger_1.logger.info('SIGTERM受信 - 適切なシャットダウンを開始します');
            this.gracefulShutdown('SIGTERM');
        });
        process.on('SIGINT', () => {
            logger_1.logger.info('SIGINT受信 - 適切なシャットダウンを開始します');
            this.gracefulShutdown('SIGINT');
        });
    }
    async healthCheck(req, res) {
        try {
            const dbHealthy = await database_1.db.testConnection();
            const redisHealthy = redis_1.redis.isReady();
            const health = {
                status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version || '1.0.0',
                environment: config_1.config.env,
                services: {
                    database: dbHealthy ? 'healthy' : 'unhealthy',
                    redis: redisHealthy ? 'healthy' : 'unhealthy'
                }
            };
            const statusCode = health.status === 'healthy' ? 200 : 503;
            res.status(statusCode).json(health);
        }
        catch (error) {
            logger_1.logger.error('ヘルスチェックエラー:', error);
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: 'ヘルスチェックに失敗しました'
            });
        }
    }
    gracefulShutdown(signal) {
        logger_1.logger.info(`${signal}によるシャットダウン開始`);
        this.server?.close(async () => {
            logger_1.logger.info('HTTPサーバーを停止しました');
            try {
                await database_1.db.close();
                logger_1.logger.info('データベース接続を閉じました');
                await redis_1.redis.disconnect();
                logger_1.logger.info('Redis接続を閉じました');
                logger_1.logger.info('適切にシャットダウンしました');
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error('シャットダウン中にエラーが発生しました:', error);
                process.exit(1);
            }
        });
        setTimeout(() => {
            logger_1.logger.error('適切なシャットダウンがタイムアウトしました - 強制終了します');
            process.exit(1);
        }, 15000);
    }
    async start() {
        try {
            if (!redis_1.redis.isReady()) {
                await redis_1.redis.connect();
            }
            const dbHealthy = await database_1.db.testConnection();
            if (!dbHealthy) {
                throw new Error('データベース接続に失敗しました');
            }
            this.server = this.app.listen(config_1.config.port, config_1.config.host, () => {
                logger_1.logger.info(`🚀 眼鏡店顧客管理システム API サーバーが起動しました`);
                logger_1.logger.info(`📡 ポート: ${config_1.config.port}`);
                logger_1.logger.info(`🌍 環境: ${config_1.config.env}`);
                logger_1.logger.info(`🔗 URL: http://localhost:${config_1.config.port}`);
                if (!config_1.isProduction) {
                    logger_1.logger.info(`🏥 ヘルスチェック: http://localhost:${config_1.config.port}/health`);
                    logger_1.logger.info(`📋 API ベース: http://localhost:${config_1.config.port}/api`);
                }
            });
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    logger_1.logger.error(`ポート ${config_1.config.port} は既に使用されています`);
                }
                else {
                    logger_1.logger.error('サーバーエラー:', error);
                }
                process.exit(1);
            });
        }
        catch (error) {
            logger_1.logger.error('アプリケーション起動エラー:', error);
            process.exit(1);
        }
    }
    getApp() {
        return this.app;
    }
}
const application = new Application();
exports.application = application;
if (require.main === module) {
    application.start().catch((error) => {
        logger_1.logger.error('アプリケーション起動に失敗しました:', error);
        process.exit(1);
    });
}
exports.default = application.getApp();
//# sourceMappingURL=index.js.map