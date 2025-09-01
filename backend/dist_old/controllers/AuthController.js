"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_1 = require("@/utils/auth");
const logger_1 = require("@/utils/logger");
const database_1 = require("@/config/database");
class AuthController {
    async login(req, res) {
        try {
            const { user_code, password, store_code } = req.body;
            if (!user_code || !password || !store_code) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'ユーザーコード、パスワード、店舗コードは必須です'
                    }
                });
                return;
            }
            const loginIdentifier = `${store_code}:${user_code}`;
            const isLocked = await auth_1.authUtils.isAccountLocked(loginIdentifier);
            if (isLocked) {
                res.status(423).json({
                    success: false,
                    error: {
                        code: 'ACCOUNT_LOCKED',
                        message: 'アカウントがロックされています。しばらく待ってから再試行してください'
                    }
                });
                return;
            }
            const userQuery = `
        SELECT 
          u.id, u.user_code, u.name, u.email, u.role, u.is_active, 
          u.password_hash as password, u.last_login_at,
          s.id as store_id, s.store_code, s.name as store_name, 
          s.address as store_address, s.phone as store_phone, s.manager_name
        FROM users u
        INNER JOIN stores s ON u.store_id = s.id
        WHERE u.user_code = $1 AND s.store_code = $2 AND u.is_active = true
      `;
            const userResult = await database_1.db.query(userQuery, [user_code, store_code]);
            if (userResult.rows.length === 0) {
                await auth_1.authUtils.recordLoginAttempt(loginIdentifier);
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: 'ユーザーコードまたは店舗コードが正しくありません'
                    }
                });
                return;
            }
            const userData = userResult.rows[0];
            const isValidPassword = await auth_1.authUtils.verifyPassword(password, userData.password);
            if (!isValidPassword) {
                await auth_1.authUtils.recordLoginAttempt(loginIdentifier);
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: 'パスワードが正しくありません'
                    }
                });
                return;
            }
            await auth_1.authUtils.resetLoginAttempts(loginIdentifier);
            const user = {
                id: userData.id,
                userCode: userData.user_code,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                isActive: userData.is_active,
                store: {
                    id: userData.store_id,
                    storeCode: userData.store_code,
                    name: userData.store_name,
                    address: userData.store_address,
                    phone: userData.store_phone,
                    managerName: userData.manager_name
                },
                lastLoginAt: userData.last_login_at
            };
            const tokenPair = auth_1.authUtils.generateTokenPair({
                userId: user.id,
                userCode: user.userCode,
                storeId: user.store.id,
                role: user.role
            });
            await auth_1.authUtils.storeRefreshToken(user.id, tokenPair.refreshToken);
            await database_1.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
            const response = {
                user: auth_1.authUtils.sanitizeUserData(user),
                token: tokenPair.accessToken,
                expiresIn: tokenPair.expiresIn
            };
            logger_1.logger.info(`ユーザーログイン成功: ${user.userCode} (${user.store.name})`);
            res.status(200).json({
                success: true,
                data: response
            });
        }
        catch (error) {
            logger_1.logger.error('ログインエラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'ログイン処理中にエラーが発生しました'
                }
            });
        }
    }
    async logout(req, res) {
        try {
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
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                await auth_1.authUtils.blacklistToken(token);
            }
            await auth_1.authUtils.revokeRefreshToken(req.user.userId);
            logger_1.logger.info(`ユーザーログアウト: ${req.user.userCode}`);
            res.status(200).json({
                success: true,
                data: { message: 'ログアウトしました' }
            });
        }
        catch (error) {
            logger_1.logger.error('ログアウトエラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'ログアウト処理中にエラーが発生しました'
                }
            });
        }
    }
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'リフレッシュトークンが必要です'
                    }
                });
                return;
            }
            const payload = auth_1.authUtils.verifyRefreshToken(refreshToken);
            const storedToken = await auth_1.authUtils.getStoredRefreshToken(payload.userId);
            if (!storedToken || storedToken !== refreshToken) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_FAILED',
                        message: '無効なリフレッシュトークンです'
                    }
                });
                return;
            }
            const newTokenPair = auth_1.authUtils.generateTokenPair({
                userId: payload.userId,
                userCode: payload.userCode,
                storeId: payload.storeId,
                role: payload.role
            });
            res.status(200).json({
                success: true,
                data: {
                    token: newTokenPair.accessToken,
                    expiresIn: newTokenPair.expiresIn
                }
            });
        }
        catch (error) {
            logger_1.logger.warn('トークンリフレッシュエラー:', error.message);
            res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_FAILED',
                    message: 'トークンリフレッシュに失敗しました'
                }
            });
        }
    }
    async me(req, res) {
        try {
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
            const userQuery = `
        SELECT 
          u.id, u.user_code, u.name, u.email, u.role, u.is_active, u.last_login_at,
          s.id as store_id, s.store_code, s.name as store_name, 
          s.address as store_address, s.phone as store_phone, s.manager_name
        FROM users u
        INNER JOIN stores s ON u.store_id = s.id
        WHERE u.id = $1 AND u.is_active = true
      `;
            const userResult = await database_1.db.query(userQuery, [req.user.userId]);
            if (userResult.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'ユーザーが見つかりません'
                    }
                });
                return;
            }
            const userData = userResult.rows[0];
            const user = {
                id: userData.id,
                userCode: userData.user_code,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                isActive: userData.is_active,
                store: {
                    id: userData.store_id,
                    storeCode: userData.store_code,
                    name: userData.store_name,
                    address: userData.store_address,
                    phone: userData.store_phone,
                    managerName: userData.manager_name
                },
                lastLoginAt: userData.last_login_at
            };
            res.status(200).json({
                success: true,
                data: user
            });
        }
        catch (error) {
            logger_1.logger.error('ユーザー情報取得エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'ユーザー情報の取得中にエラーが発生しました'
                }
            });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map