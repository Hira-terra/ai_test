import { Router } from 'express';
import { purchaseOrderController } from '../controllers/purchaseOrder.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// 発注待ち受注一覧取得
router.get('/available-orders', purchaseOrderController.getAvailableOrders);

// 仕入先一覧取得
router.get('/suppliers', purchaseOrderController.getSuppliers);

// 発注統計取得
router.get('/statistics', purchaseOrderController.getStatistics);

// 発注関連
router.get('/', purchaseOrderController.getPurchaseOrders);
router.get('/:id', purchaseOrderController.getPurchaseOrderById);
router.post('/', purchaseOrderController.createPurchaseOrder);
router.put('/:id/status', purchaseOrderController.updateStatus);
router.put('/:id/send', purchaseOrderController.sendPurchaseOrder);

export default router;