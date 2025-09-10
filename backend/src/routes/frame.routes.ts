import { Router } from 'express';
import { frameController } from '../controllers/frame.controller';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// 全ルートで認証が必要
router.use(authenticate);

// レート制限適用
router.use(rateLimiter.apiRequests);

/**
 * 個体管理品の一括登録
 * POST /api/frames/individual-items
 */
router.post('/individual-items', frameController.createIndividualItems.bind(frameController));

/**
 * 店舗別フレーム個体一覧取得
 * GET /api/frames?storeId=xxx&status=xxx&productId=xxx&serialNumber=xxx
 */
router.get('/', frameController.getFrames.bind(frameController));

/**
 * 商品別フレーム個体一覧取得
 * GET /api/frames/product/:productId
 */
router.get('/product/:productId', frameController.getFramesByProduct.bind(frameController));

/**
 * 個体番号検索
 * GET /api/frames/serial/:serialNumber
 */
router.get('/serial/:serialNumber', frameController.getFrameBySerialNumber.bind(frameController));

/**
 * 在庫サマリー取得
 * GET /api/frames/inventory-summary
 */
router.get('/inventory-summary', frameController.getInventorySummary.bind(frameController));

/**
 * フレーム個体詳細取得
 * GET /api/frames/:id
 */
router.get('/:id', frameController.getFrameById.bind(frameController));

/**
 * フレーム個体のステータス履歴取得
 * GET /api/frames/:id/history
 */
router.get('/:id/history', frameController.getFrameStatusHistory.bind(frameController));

/**
 * フレーム個体のステータス更新
 * PUT /api/frames/:id/status
 */
router.put('/:id/status', frameController.updateFrameStatus.bind(frameController));

/**
 * フレーム個体更新
 * PUT /api/frames/:id
 */
router.put('/:id', frameController.updateFrame.bind(frameController));

/**
 * フレーム個体削除
 * DELETE /api/frames/:id
 */
router.delete('/:id', frameController.deleteFrame.bind(frameController));

export default router;