"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAnyPermission = exports.requirePermission = exports.requireStoreAccess = exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const auth_1 = require("@/utils/auth");
const auth_repository_1 = require("@/repositories/auth.repository");
const database_1 = require("@/config/database");
const logger_1 = require("@/utils/logger");
const authenticate = async (req, res, next) => {
    const authRepo = new auth_repository_1.AuthRepository(database_1.db.getPool());
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: '認証が必要です'
                }
            });
            return;
        }
        const token = authHeader.substring(7);
        const isBlacklisted = await auth_1.authUtils.isTokenBlacklisted(token);
        if (isBlacklisted) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'TOKEN_REVOKED',
                    message: 'トークンが無効化されています'
                }
            });
            return;
        }
        const payload = auth_1.authUtils.verifyAccessToken(token);
        const userData = await authRepo.getUserById(payload.userId);
        if (!userData || !userData.user.is_active) {
            logger_1.logger.warn(`[AUTH_MIDDLEWARE] ユーザー無効: userId=${payload.userId}`);
            res.status(401).json({
                success: false,
                error: {
                    code: 'USER_INACTIVE',
                    message: 'ユーザーアカウントが無効です'
                }
            });
            return;
        }
        req.user = {
            userId: payload.userId,
            userCode: payload.userCode,
            storeId: payload.storeId,
            role: payload.role,
            sessionId: payload.sessionId,
            permissions: payload.permissions || []
        };
        next();
    }
    catch (error) {
        logger_1.logger.warn('[AUTH_MIDDLEWARE] 認証エラー:', error.message);
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_FAILED',
                message: '認証に失敗しました'
            }
        });
    }
};
exports.authenticate = authenticate;
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: '認証が必要です'
                }
            });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            logger_1.logger.warn(`認可エラー: ユーザー ${req.user.userCode} (役割: ${req.user.role}) が権限を持たないリソースにアクセスを試行`);
            res.status(403).json({
                success: false,
                error: {
                    code: 'AUTHORIZATION_FAILED',
                    message: 'このリソースへのアクセス権限がありません'
                }
            });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const isBlacklisted = await auth_1.authUtils.isTokenBlacklisted(token);
            if (!isBlacklisted) {
                try {
                    const payload = auth_1.authUtils.verifyAccessToken(token);
                    req.user = {
                        userId: payload.userId,
                        userCode: payload.userCode,
                        storeId: payload.storeId,
                        role: payload.role,
                    };
                }
                catch (error) {
                }
            }
        }
        next();
    }
    catch (error) {
        next();
    }
};
exports.optionalAuth = optionalAuth;
const requireStoreAccess = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: '認証が必要です'
            }
        });
        return;
    }
    if (req.user.role === 'admin') {
        next();
        return;
    }
    const requestedStoreId = req.params.storeId || req.body.storeId;
    if (requestedStoreId && requestedStoreId !== req.user.storeId) {
        logger_1.logger.warn(`店舗アクセス権限エラー: ユーザー ${req.user.userCode} が他店舗 ${requestedStoreId} のデータにアクセスを試行`);
        res.status(403).json({
            success: false,
            error: {
                code: 'STORE_ACCESS_DENIED',
                message: '他店舗のデータにはアクセスできません'
            }
        });
        return;
    }
    next();
};
exports.requireStoreAccess = requireStoreAccess;
const requirePermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: '認証が必要です'
                }
            });
            return;
        }
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes(requiredPermission)) {
            logger_1.logger.warn(`[AUTH_MIDDLEWARE] 権限不足: ユーザー ${req.user.userCode} に権限 ${requiredPermission} がありません`);
            res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'この操作を実行する権限がありません'
                }
            });
            return;
        }
        next();
    };
};
exports.requirePermission = requirePermission;
const requireAnyPermission = (requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: '認証が必要です'
                }
            });
            return;
        }
        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.some(permission => userPermissions.includes(permission));
        if (!hasPermission) {
            logger_1.logger.warn(`[AUTH_MIDDLEWARE] 権限不足: ユーザー ${req.user.userCode} に必要な権限がありません`);
            res.status(403).json({
                success: false,
                error: {
                    code: 'PERMISSION_DENIED',
                    message: 'この操作を実行する権限がありません'
                }
            });
            return;
        }
        next();
    };
};
exports.requireAnyPermission = requireAnyPermission;
//# sourceMappingURL=auth.js.map