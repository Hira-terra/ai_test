"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoreController = void 0;
const auth_service_1 = require("../services/auth.service");
const logger_1 = require("../utils/logger");
const database_1 = require("../config/database");
class StoreController {
    constructor() {
        this.authService = new auth_service_1.AuthService(database_1.db.getPool());
    }
    async getStores(req, res) {
        const startTime = Date.now();
        logger_1.logger.info(`[STORE_CONTROLLER] 店舗一覧リクエスト受信`);
        try {
            const stores = await this.authService.getAllStores();
            const duration = Date.now() - startTime;
            logger_1.logger.info(`[STORE_CONTROLLER] 店舗一覧取得完了: ${stores.length}件 (${duration}ms)`);
            res.status(200).json({
                success: true,
                data: stores
            });
        }
        catch (error) {
            logger_1.logger.error('[STORE_CONTROLLER] 店舗一覧取得エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '店舗情報の取得中にエラーが発生しました'
                }
            });
        }
    }
}
exports.StoreController = StoreController;
//# sourceMappingURL=store.controller.js.map