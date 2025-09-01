"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const user_model_1 = require("../models/user.model");
const store_model_1 = require("../models/store.model");
const session_model_1 = require("../models/session.model");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
class AuthRepository {
    constructor(db) {
        this.db = db;
        this.userRepo = new user_model_1.UserRepository(db);
        this.storeRepo = new store_model_1.StoreRepository(db);
        this.sessionRepo = new session_model_1.SessionRepository(db);
    }
    async findUserWithStore(userCode, storeCode) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_REPO] ユーザー検索開始: ${userCode}@${storeCode}`);
        try {
            const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
            if (!user) {
                logger_1.logger.warn(`[AUTH_REPO] ユーザーが見つかりません: ${userCode}@${storeCode}`);
                return null;
            }
            const store = await this.storeRepo.findById(user.store_id);
            if (!store) {
                logger_1.logger.error(`[AUTH_REPO] 店舗が見つかりません: storeId=${user.store_id}`);
                return null;
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_REPO] ユーザー検索完了: ${userCode}@${storeCode} (${duration}ms)`);
            return { user, store };
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] ユーザー検索エラー: ${userCode}@${storeCode}`, error);
            throw error;
        }
    }
    async getUserById(userId) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_REPO] ユーザーID検索開始: ${userId}`);
        try {
            const user = await this.userRepo.findById(userId);
            if (!user) {
                logger_1.logger.warn(`[AUTH_REPO] ユーザーが見つかりません: userId=${userId}`);
                return null;
            }
            const store = await this.storeRepo.findById(user.store_id);
            if (!store) {
                logger_1.logger.error(`[AUTH_REPO] 店舗が見つかりません: storeId=${user.store_id}`);
                return null;
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_REPO] ユーザーID検索完了: ${userId} (${duration}ms)`);
            return { user, store };
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] ユーザーID検索エラー: ${userId}`, error);
            throw error;
        }
    }
    async isAccountLocked(userCode, storeCode) {
        try {
            const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
            if (!user) {
                return false;
            }
            return await this.userRepo.isAccountLocked(user.id);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] アカウントロック確認エラー: ${userCode}@${storeCode}`, error);
            throw error;
        }
    }
    async recordLoginAttempt(userCode, storeCode, ipAddress, userAgent, success, failureReason) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_REPO] ログイン試行記録: ${userCode}@${storeCode} - ${success ? '成功' : '失敗'}`);
        try {
            await this.sessionRepo.logLoginAttempt(userCode, storeCode, ipAddress, userAgent, success, failureReason);
            if (!success) {
                const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
                if (user) {
                    const failedCount = await this.userRepo.incrementFailedLoginCount(user.id);
                    logger_1.logger.warn(`[AUTH_REPO] ログイン失敗回数: ${userCode}@${storeCode} - ${failedCount}回`);
                    if (failedCount >= 5) {
                        const lockUntil = new Date(Date.now() + 30 * 60 * 1000);
                        await this.userRepo.lockAccount(user.id, lockUntil);
                        logger_1.logger.warn(`[AUTH_REPO] アカウントロック: ${userCode}@${storeCode} - ${lockUntil.toISOString()}`);
                    }
                }
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_REPO] ログイン試行記録完了 (${duration}ms)`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] ログイン試行記録エラー: ${userCode}@${storeCode}`, error);
            throw error;
        }
    }
    async resetLoginAttempts(userId) {
        try {
            await this.userRepo.resetFailedLoginCount(userId);
            logger_1.logger.info(`[AUTH_REPO] ログイン失敗回数リセット: userId=${userId}`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] ログイン失敗回数リセットエラー: userId=${userId}`, error);
            throw error;
        }
    }
    async updateLastLoginAt(userId) {
        try {
            await this.userRepo.updateLastLoginAt(userId);
            logger_1.logger.info(`[AUTH_REPO] 最終ログイン時刻更新: userId=${userId}`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] 最終ログイン時刻更新エラー: userId=${userId}`, error);
            throw error;
        }
    }
    async createSession(userId, deviceInfo, ipAddress, userAgent, expiresIn) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_REPO] セッション作成開始: userId=${userId}`);
        try {
            const sessionId = (0, uuid_1.v4)();
            const refreshTokenJti = (0, uuid_1.v4)();
            const expiresAt = new Date(Date.now() + expiresIn * 1000);
            const session = await this.sessionRepo.createSession(userId, sessionId, refreshTokenJti, deviceInfo, ipAddress, userAgent, expiresAt);
            await this.sessionRepo.cleanupOldSessions(userId, 3);
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_REPO] セッション作成完了: sessionId=${sessionId} (${duration}ms)`);
            return session;
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] セッション作成エラー: userId=${userId}`, error);
            throw error;
        }
    }
    async validateSession(sessionId) {
        try {
            const session = await this.sessionRepo.findActiveSession(sessionId);
            if (session) {
                await this.sessionRepo.updateLastActivity(sessionId);
            }
            return session;
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] セッション検証エラー: sessionId=${sessionId}`, error);
            throw error;
        }
    }
    async revokeSession(sessionId) {
        try {
            await this.sessionRepo.revokeSession(sessionId);
            logger_1.logger.info(`[AUTH_REPO] セッション無効化: sessionId=${sessionId}`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] セッション無効化エラー: sessionId=${sessionId}`, error);
            throw error;
        }
    }
    async revokeAllUserSessions(userId, exceptSessionId) {
        try {
            await this.sessionRepo.revokeAllUserSessions(userId, exceptSessionId);
            logger_1.logger.info(`[AUTH_REPO] 全セッション無効化: userId=${userId}`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] 全セッション無効化エラー: userId=${userId}`, error);
            throw error;
        }
    }
    async getAllStores() {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_REPO] 全店舗取得開始`);
        try {
            const stores = await this.storeRepo.findAll();
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_REPO] 全店舗取得完了: ${stores.length}店舗 (${duration}ms)`);
            return stores;
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_REPO] 全店舗取得エラー`, error);
            throw error;
        }
    }
}
exports.AuthRepository = AuthRepository;
//# sourceMappingURL=auth.repository.js.map