"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = exports.rateLimiter = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const redis_1 = require("@/utils/redis");
const logger_1 = require("@/utils/logger");
class RateLimiter {
    constructor() {
        this.loginAttempts = async (req, res, next) => {
            const key = `${req.ip}_${req.body.user_code || 'unknown'}_${req.body.store_code || 'unknown'}`;
            await this.checkRateLimit(this.loginLimiter, key, req, res, next, 'login');
        };
        this.apiRequests = async (req, res, next) => {
            const key = req.ip || 'unknown';
            await this.checkRateLimit(this.apiLimiter, key, req, res, next, 'api');
        };
        this.tokenRefresh = async (req, res, next) => {
            const key = req.ip || 'unknown';
            await this.checkRateLimit(this.refreshLimiter, key, req, res, next, 'refresh');
        };
        this.fileUpload = async (req, res, next) => {
            const key = req.ip || 'unknown';
            await this.checkRateLimit(this.uploadLimiter, key, req, res, next, 'upload');
        };
        this.authenticatedRequests = async (req, res, next) => {
            if (!req.user) {
                return this.apiRequests(req, res, next);
            }
            const authenticatedLimiter = new rate_limiter_flexible_1.RateLimiterMemory({
                keyPrefix: 'auth_api_limit',
                points: 500,
                duration: 900,
                blockDuration: 60,
            });
            const key = req.user.userId;
            await this.checkRateLimit(authenticatedLimiter, key, req, res, next, 'authenticated_api');
        };
        const useRedis = redis_1.redis.isReady();
        this.loginLimiter = useRedis
            ? new rate_limiter_flexible_1.RateLimiterRedis({
                storeClient: redis_1.redis,
                keyPrefix: 'login_limit',
                points: 5,
                duration: 900,
                blockDuration: 900,
            })
            : new rate_limiter_flexible_1.RateLimiterMemory({
                keyPrefix: 'login_limit',
                points: 5,
                duration: 900,
                blockDuration: 900,
            });
        this.apiLimiter = useRedis
            ? new rate_limiter_flexible_1.RateLimiterRedis({
                storeClient: redis_1.redis,
                keyPrefix: 'api_limit',
                points: 100,
                duration: 900,
                blockDuration: 60,
            })
            : new rate_limiter_flexible_1.RateLimiterMemory({
                keyPrefix: 'api_limit',
                points: 100,
                duration: 900,
                blockDuration: 60,
            });
        this.refreshLimiter = useRedis
            ? new rate_limiter_flexible_1.RateLimiterRedis({
                storeClient: redis_1.redis,
                keyPrefix: 'refresh_limit',
                points: 10,
                duration: 3600,
                blockDuration: 3600,
            })
            : new rate_limiter_flexible_1.RateLimiterMemory({
                keyPrefix: 'refresh_limit',
                points: 10,
                duration: 3600,
                blockDuration: 3600,
            });
        this.uploadLimiter = useRedis
            ? new rate_limiter_flexible_1.RateLimiterRedis({
                storeClient: redis_1.redis,
                keyPrefix: 'upload_limit',
                points: 20,
                duration: 3600,
                blockDuration: 300,
            })
            : new rate_limiter_flexible_1.RateLimiterMemory({
                keyPrefix: 'upload_limit',
                points: 20,
                duration: 3600,
                blockDuration: 300,
            });
    }
    async checkRateLimit(limiter, key, req, res, next, limitType) {
        try {
            await limiter.consume(key);
            next();
        }
        catch (rateLimiterRes) {
            if (rateLimiterRes instanceof rate_limiter_flexible_1.RateLimiterRes) {
                const remainingPoints = rateLimiterRes.remainingPoints;
                const msBeforeNext = rateLimiterRes.msBeforeNext;
                logger_1.logger.warn(`レート制限に達しました: ${limitType}`, {
                    key,
                    remainingPoints,
                    msBeforeNext,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
                res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'リクエスト回数の制限に達しました。しばらく待ってから再試行してください。',
                        details: {
                            retryAfter: Math.round(msBeforeNext / 1000),
                            remainingPoints
                        }
                    }
                });
            }
            else {
                logger_1.logger.error('レート制限チェックエラー:', rateLimiterRes);
                next();
            }
        }
    }
}
exports.rateLimiter = new RateLimiter();
const createRateLimiter = (options) => {
    const useRedis = redis_1.redis.isReady();
    const limiter = useRedis
        ? new rate_limiter_flexible_1.RateLimiterRedis({
            storeClient: redis_1.redis,
            keyPrefix: 'custom_limit',
            points: options.points,
            duration: options.duration,
            blockDuration: options.blockDuration || options.duration,
        })
        : new rate_limiter_flexible_1.RateLimiterMemory({
            keyPrefix: 'custom_limit',
            points: options.points,
            duration: options.duration,
            blockDuration: options.blockDuration || options.duration,
        });
    return async (req, res, next) => {
        const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || 'unknown';
        try {
            await limiter.consume(key);
            next();
        }
        catch (rateLimiterRes) {
            if (rateLimiterRes instanceof rate_limiter_flexible_1.RateLimiterRes) {
                const msBeforeNext = rateLimiterRes.msBeforeNext;
                logger_1.logger.warn('カスタムレート制限に達しました', {
                    key,
                    remainingPoints: rateLimiterRes.remainingPoints,
                    msBeforeNext,
                    ip: req.ip
                });
                res.status(429).json({
                    success: false,
                    error: {
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: 'リクエスト回数の制限に達しました',
                        details: {
                            retryAfter: Math.round(msBeforeNext / 1000)
                        }
                    }
                });
            }
            else {
                next();
            }
        }
    };
};
exports.createRateLimiter = createRateLimiter;
//# sourceMappingURL=rateLimiter.js.map