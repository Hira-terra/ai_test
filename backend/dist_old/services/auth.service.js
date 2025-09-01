"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const auth_repository_1 = require("../repositories/auth.repository");
const auth_1 = require("../utils/auth");
const logger_1 = require("../utils/logger");
const uuid_1 = require("uuid");
class AuthService {
    constructor(db) {
        this.db = db;
        this.authRepo = new auth_repository_1.AuthRepository(db);
    }
    async login(credentials, ipAddress, userAgent) {
        const startTime = Date.now();
        const { user_code, password, store_code } = credentials;
        const loginIdentifier = `${store_code}:${user_code}`;
        logger_1.logger.info(`[AUTH_SERVICE] ログイン処理開始: ${loginIdentifier}`);
        try {
            const isLocked = await this.authRepo.isAccountLocked(user_code, store_code);
            if (isLocked) {
                logger_1.logger.warn(`[AUTH_SERVICE] アカウントロック中: ${loginIdentifier}`);
                return {
                    success: false,
                    error: {
                        code: 'ACCOUNT_LOCKED',
                        message: 'アカウントがロックされています。しばらく待ってから再試行してください'
                    }
                };
            }
            const userData = await this.authRepo.findUserWithStore(user_code, store_code);
            if (!userData) {
                await this.authRepo.recordLoginAttempt(user_code, store_code, ipAddress, userAgent, false, 'USER_NOT_FOUND');
                logger_1.logger.warn(`[AUTH_SERVICE] ユーザー未発見: ${loginIdentifier}`);
                return {
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: 'ユーザーコードまたは店舗コードが正しくありません'
                    }
                };
            }
            const { user, store } = userData;
            const isValidPassword = await auth_1.authUtils.verifyPassword(password, user.password);
            if (!isValidPassword) {
                await this.authRepo.recordLoginAttempt(user_code, store_code, ipAddress, userAgent, false, 'INVALID_PASSWORD');
                logger_1.logger.warn(`[AUTH_SERVICE] パスワード不一致: ${loginIdentifier}`);
                return {
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: 'パスワードが正しくありません'
                    }
                };
            }
            await this.authRepo.recordLoginAttempt(user_code, store_code, ipAddress, userAgent, true);
            await this.authRepo.resetLoginAttempts(user.id);
            await this.authRepo.updateLastLoginAt(user.id);
            const deviceInfo = {
                userAgent,
                ipAddress,
                platform: this.detectPlatform(userAgent)
            };
            const session = await this.authRepo.createSession(user.id, deviceInfo, ipAddress, userAgent, 30 * 24 * 60 * 60);
            const permissions = this.getRolePermissions(user.role);
            const tokenPayload = {
                userId: user.id,
                userCode: user.user_code,
                storeId: store.id,
                role: user.role,
                permissions,
                sessionId: session.session_id,
                jti: (0, uuid_1.v4)()
            };
            const tokenPair = auth_1.authUtils.generateTokenPair(tokenPayload);
            await auth_1.authUtils.storeRefreshToken(user.id, tokenPair.refreshToken);
            const userResponse = {
                id: user.id,
                userCode: user.user_code,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.is_active,
                store: {
                    id: store.id,
                    storeCode: store.store_code,
                    name: store.name,
                    address: store.address,
                    phone: store.phone,
                    managerName: store.manager_name
                },
                lastLoginAt: user.last_login_at
            };
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_SERVICE] ログイン成功: ${loginIdentifier} (${duration}ms)`);
            return {
                success: true,
                data: {
                    user: auth_1.authUtils.sanitizeUserData(userResponse),
                    token: tokenPair.accessToken,
                    expiresIn: tokenPair.expiresIn
                }
            };
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_SERVICE] ログインエラー: ${loginIdentifier}`, error);
            return {
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'ログイン処理中にエラーが発生しました'
                }
            };
        }
    }
    async logout(userId, token) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_SERVICE] ログアウト処理開始: userId=${userId}`);
        try {
            await auth_1.authUtils.blacklistToken(token);
            await auth_1.authUtils.revokeRefreshToken(userId);
            await this.authRepo.revokeAllUserSessions(userId);
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_SERVICE] ログアウト完了: userId=${userId} (${duration}ms)`);
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_SERVICE] ログアウトエラー: userId=${userId}`, error);
            throw error;
        }
    }
    async refreshToken(refreshToken) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_SERVICE] トークンリフレッシュ開始`);
        try {
            const payload = auth_1.authUtils.verifyRefreshToken(refreshToken);
            const storedToken = await auth_1.authUtils.getStoredRefreshToken(payload.userId);
            if (!storedToken || storedToken !== refreshToken) {
                logger_1.logger.warn(`[AUTH_SERVICE] 無効なリフレッシュトークン: userId=${payload.userId}`);
                return {
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: '無効なリフレッシュトークンです'
                    }
                };
            }
            if (payload.sessionId) {
                const session = await this.authRepo.validateSession(payload.sessionId);
                if (!session) {
                    logger_1.logger.warn(`[AUTH_SERVICE] 無効なセッション: sessionId=${payload.sessionId}`);
                    return {
                        success: false,
                        error: {
                            code: 'SESSION_EXPIRED',
                            message: 'セッションが無効です'
                        }
                    };
                }
            }
            const userData = await this.authRepo.getUserById(payload.userId);
            if (!userData || !userData.user.is_active) {
                logger_1.logger.warn(`[AUTH_SERVICE] 無効なユーザー: userId=${payload.userId}`);
                return {
                    success: false,
                    error: {
                        code: 'USER_INACTIVE',
                        message: 'ユーザーアカウントが無効です'
                    }
                };
            }
            const newTokenPayload = {
                userId: payload.userId,
                userCode: payload.userCode,
                storeId: payload.storeId,
                role: payload.role,
                permissions: payload.permissions,
                sessionId: payload.sessionId,
                jti: (0, uuid_1.v4)()
            };
            const newTokenPair = auth_1.authUtils.generateTokenPair(newTokenPayload);
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_SERVICE] トークンリフレッシュ成功 (${duration}ms)`);
            return {
                success: true,
                data: {
                    token: newTokenPair.accessToken,
                    expiresIn: newTokenPair.expiresIn
                }
            };
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_SERVICE] トークンリフレッシュエラー`, error);
            return {
                success: false,
                error: {
                    code: 'AUTHENTICATION_FAILED',
                    message: 'トークンリフレッシュに失敗しました'
                }
            };
        }
    }
    async getCurrentUser(userId) {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_SERVICE] ユーザー情報取得開始: userId=${userId}`);
        try {
            const userData = await this.authRepo.getUserById(userId);
            if (!userData) {
                logger_1.logger.warn(`[AUTH_SERVICE] ユーザー未発見: userId=${userId}`);
                return null;
            }
            const { user, store } = userData;
            const userResponse = {
                id: user.id,
                userCode: user.user_code,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.is_active,
                store: {
                    id: store.id,
                    storeCode: store.store_code,
                    name: store.name,
                    address: store.address,
                    phone: store.phone,
                    managerName: store.manager_name
                },
                lastLoginAt: user.last_login_at
            };
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_SERVICE] ユーザー情報取得完了: userId=${userId} (${duration}ms)`);
            return userResponse;
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_SERVICE] ユーザー情報取得エラー: userId=${userId}`, error);
            throw error;
        }
    }
    async getAllStores() {
        const startTime = Date.now();
        logger_1.logger.info(`[AUTH_SERVICE] 全店舗取得開始`);
        try {
            const stores = await this.authRepo.getAllStores();
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_SERVICE] 全店舗取得完了: ${stores.length}店舗 (${duration}ms)`);
            return stores.map(store => ({
                id: store.id,
                storeCode: store.store_code,
                name: store.name,
                address: store.address,
                phone: store.phone,
                managerName: store.manager_name
            }));
        }
        catch (error) {
            logger_1.logger.error(`[AUTH_SERVICE] 全店舗取得エラー`, error);
            throw error;
        }
    }
    getRolePermissions(role) {
        const rolePermissions = {
            staff: [
                'customer:read', 'customer:write', 'customer:create',
                'order:read', 'order:write', 'order:create', 'order:cancel',
                'register:operate',
                'inventory:read', 'inventory:write'
            ],
            manager: [
                'customer:read', 'customer:write', 'customer:create',
                'order:read', 'order:write', 'order:create', 'order:cancel',
                'register:operate', 'register:approve',
                'inventory:read', 'inventory:write',
                'analytics:store',
                'user:read'
            ],
            admin: [
                'customer:read', 'customer:write', 'customer:create', 'customer:delete',
                'order:read', 'order:write', 'order:create', 'order:cancel',
                'register:operate', 'register:approve',
                'inventory:read', 'inventory:write',
                'analytics:store', 'analytics:all',
                'user:read', 'user:write', 'user:create',
                'cost:read', 'sensitive:read'
            ]
        };
        return rolePermissions[role] || [];
    }
    detectPlatform(userAgent) {
        const ua = userAgent.toLowerCase();
        if (ua.includes('ipad') || ua.includes('tablet'))
            return 'tablet';
        if (ua.includes('iphone') || ua.includes('android'))
            return 'mobile';
        return 'desktop';
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map