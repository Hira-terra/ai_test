"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
class AuthController {
    constructor() {
        this.authService = new auth_service_1.AuthService(database_1.db.getPool());
    }
    async login(req, res) {
        const startTime = Date.now();
        const { userCode, user_code, storeCode, store_code, password } = req.body;
        const credentials = {
            user_code: userCode || user_code,
            store_code: storeCode || store_code,
            password
        };
        const ipAddress = req.ip || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        logger_1.logger.info(`[AUTH_CONTROLLER] ログインリクエスト受信: ${credentials.store_code}:${credentials.user_code}`);
        try {
            const result = await this.authService.login(credentials, ipAddress, userAgent);
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_CONTROLLER] ログイン処理完了 (${duration}ms)`);
            if (!result.success) {
                const statusCode = result.error?.code === 'ACCOUNT_LOCKED' ? 423 : 401;
                res.status(statusCode).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('[AUTH_CONTROLLER] ログイン処理エラー:', error);
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
        const startTime = Date.now();
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
        logger_1.logger.info(`[AUTH_CONTROLLER] ログアウトリクエスト受信: ${req.user.userCode}`);
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                await this.authService.logout(req.user.userId, token);
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_CONTROLLER] ログアウト処理完了 (${duration}ms)`);
            res.status(200).json({
                success: true,
                data: { message: 'ログアウトしました' }
            });
        }
        catch (error) {
            logger_1.logger.error('[AUTH_CONTROLLER] ログアウト処理エラー:', error);
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
        const startTime = Date.now();
        const { refreshToken } = req.body;
        logger_1.logger.info(`[AUTH_CONTROLLER] トークンリフレッシュリクエスト受信`);
        try {
            const result = await this.authService.refreshToken(refreshToken);
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_CONTROLLER] トークンリフレッシュ処理完了 (${duration}ms)`);
            if (!result.success) {
                res.status(401).json({
                    success: false,
                    error: result.error
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result.data
            });
        }
        catch (error) {
            logger_1.logger.error('[AUTH_CONTROLLER] トークンリフレッシュ処理エラー:', error);
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
        const startTime = Date.now();
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
        logger_1.logger.info(`[AUTH_CONTROLLER] ユーザー情報リクエスト受信: ${req.user.userCode}`);
        try {
            const user = await this.authService.getCurrentUser(req.user.userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'ユーザーが見つかりません'
                    }
                });
                return;
            }
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[AUTH_CONTROLLER] ユーザー情報取得完了 (${duration}ms)`);
            res.status(200).json({
                success: true,
                data: user
            });
        }
        catch (error) {
            logger_1.logger.error('[AUTH_CONTROLLER] ユーザー情報取得エラー:', error);
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
//# sourceMappingURL=auth.controller.js.map