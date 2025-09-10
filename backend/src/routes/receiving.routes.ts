import { Router } from 'express';
import { receivingController } from '../controllers/receiving.controller';
import { authenticate } from '../middleware/auth';
// import { validateRequest } from '../middleware/validation';
// import { receivingValidators } from '../validators/receiving.validator';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// 入庫待ち発注一覧取得
router.get('/pending-orders', receivingController.getPendingOrders);

// 発注書詳細取得（入庫用）
router.get('/purchase-orders/:purchaseOrderId', receivingController.getPurchaseOrderDetail);

// 入庫登録
router.post(
  '/',
  // validateRequest(receivingValidators.createReceiving),
  receivingController.createReceiving
);

// 入庫履歴取得
router.get('/history', receivingController.getReceivingHistory);

// 入庫済み発注一覧取得（買掛一覧用）
router.get('/received-orders', receivingController.getReceivedOrders);

// 入庫詳細取得
router.get('/:receivingId', receivingController.getReceivingDetail);

// 入庫ステータス更新
router.patch(
  '/:receivingId/status',
  // validateRequest(receivingValidators.updateStatus),
  receivingController.updateReceivingStatus
);

// 品質検査結果更新
router.patch(
  '/items/:itemId/quality',
  // validateRequest(receivingValidators.updateQuality),
  receivingController.updateQualityStatus
);

export default router;