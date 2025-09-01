"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authUtils = exports.AuthUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const config_1 = require("@/config");
const redis_1 = require("@/utils/redis");
const logger_1 = require("@/utils/logger");
class AuthUtils {
    constructor() { }
    static getInstance() {
        if (!AuthUtils.instance) {
            AuthUtils.instance = new AuthUtils();
        }
        return AuthUtils.instance;
    }
    async hashPassword(password) {
        try {
            return await bcryptjs_1.default.hash(password, config_1.config.security.bcryptRounds);
        }
        catch (error) {
            logger_1.logger.error('パスワードハッシュ化エラー:', error);
            throw new Error('パスワードハッシュ化に失敗しました');
        }
    }
    async verifyPassword(password, hashedPassword) {
        try {
            return await bcryptjs_1.default.compare(password, hashedPassword);
        }
        catch (error) {
            logger_1.logger.error('パスワード検証エラー:', error);
            throw new Error('パスワード検証に失敗しました');
        }
    }
    generateTokenPair(payload) {
        try {
            const accessTokenOptions = {
                expiresIn: config_1.config.jwt.expiresIn,
                issuer: 'glasses-store-api',
                audience: 'glasses-store-client',
            };
            const refreshTokenOptions = {
                expiresIn: config_1.config.jwt.refreshExpiresIn,
                issuer: 'glasses-store-api',
                audience: 'glasses-store-client',
            };
            const accessToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, accessTokenOptions);
            const refreshToken = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.refreshSecret, refreshTokenOptions);
            const decoded = jsonwebtoken_1.default.decode(accessToken);
            const expiresIn = decoded.exp - decoded.iat;
            return {
                accessToken,
                refreshToken,
                expiresIn,
            };
        }
        catch (error) {
            logger_1.logger.error('トークン生成エラー:', error);
            throw new Error('トークン生成に失敗しました');
        }
    }
    verifyAccessToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret, {
                issuer: 'glasses-store-api',
                audience: 'glasses-store-client',
            });
        }
        catch (error) {
            logger_1.logger.warn('アクセストークン検証失敗:', error);
            throw new Error('無効なトークンです');
        }
    }
    verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, config_1.config.jwt.refreshSecret, {
                issuer: 'glasses-store-api',
                audience: 'glasses-store-client',
            });
        }
        catch (error) {
            logger_1.logger.warn('リフレッシュトークン検証失敗:', error);
            throw new Error('無効なリフレッシュトークンです');
        }
    }
    async storeRefreshToken(userId, refreshToken) {
        try {
            const key = `refresh_token:${userId}`;
            const expirationSeconds = this.parseExpirationTime(config_1.config.jwt.refreshExpiresIn);
            await redis_1.redis.set(key, refreshToken, expirationSeconds);
        }
        catch (error) {
            logger_1.logger.error('リフレッシュトークン保存エラー:', error);
            throw new Error('リフレッシュトークンの保存に失敗しました');
        }
    }
    async getStoredRefreshToken(userId) {
        try {
            const key = `refresh_token:${userId}`;
            return await redis_1.redis.get(key);
        }
        catch (error) {
            logger_1.logger.error('リフレッシュトークン取得エラー:', error);
            throw new Error('リフレッシュトークンの取得に失敗しました');
        }
    }
    async revokeRefreshToken(userId) {
        try {
            const key = `refresh_token:${userId}`;
            await redis_1.redis.del(key);
        }
        catch (error) {
            logger_1.logger.error('リフレッシュトークン無効化エラー:', error);
            throw new Error('リフレッシュトークンの無効化に失敗しました');
        }
    }
    async blacklistToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded?.exp) {
                const key = `blacklist:${token}`;
                const ttl = decoded.exp - Math.floor(Date.now() / 1000);
                if (ttl > 0) {
                    await redis_1.redis.set(key, '1', ttl);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('トークンブラックリスト登録エラー:', error);
            throw new Error('トークンの無効化に失敗しました');
        }
    }
    async isTokenBlacklisted(token) {
        try {
            const key = `blacklist:${token}`;
            const exists = await redis_1.redis.exists(key);
            return exists === 1;
        }
        catch (error) {
            logger_1.logger.error('トークンブラックリスト確認エラー:', error);
            return false;
        }
    }
    async recordLoginAttempt(identifier) {
        try {
            const key = `login_attempts:${identifier}`;
            const attempts = await redis_1.redis.incr(key);
            if (attempts === 1) {
                await redis_1.redis.expire(key, Math.floor(config_1.config.security.lockoutTime / 1000));
            }
            return attempts;
        }
        catch (error) {
            logger_1.logger.error('ログイン試行回数記録エラー:', error);
            throw new Error('ログイン試行回数の記録に失敗しました');
        }
    }
    async getLoginAttempts(identifier) {
        try {
            const key = `login_attempts:${identifier}`;
            const attempts = await redis_1.redis.get(key);
            return attempts ? parseInt(attempts, 10) : 0;
        }
        catch (error) {
            logger_1.logger.error('ログイン試行回数取得エラー:', error);
            return 0;
        }
    }
    async resetLoginAttempts(identifier) {
        try {
            const key = `login_attempts:${identifier}`;
            await redis_1.redis.del(key);
        }
        catch (error) {
            logger_1.logger.error('ログイン試行回数リセットエラー:', error);
            throw new Error('ログイン試行回数のリセットに失敗しました');
        }
    }
    async isAccountLocked(identifier) {
        try {
            const attempts = await this.getLoginAttempts(identifier);
            return attempts >= config_1.config.security.maxLoginAttempts;
        }
        catch (error) {
            logger_1.logger.error('アカウントロック状態確認エラー:', error);
            return false;
        }
    }
    parseExpirationTime(expiration) {
        const match = expiration.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error(`無効な有効期限形式: ${expiration}`);
        }
        const value = parseInt(match[1], 10);
        const unit = match[2];
        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 60 * 60 * 24;
            default: throw new Error(`未対応の時間単位: ${unit}`);
        }
    }
    generateSecureCode(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    sanitizeUserData(user) {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
    }
}
exports.AuthUtils = AuthUtils;
exports.authUtils = AuthUtils.getInstance();
//# sourceMappingURL=auth.js.map