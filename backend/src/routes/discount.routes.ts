import { Router } from 'express';
import { discountController } from '../controllers/discount.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// ===== 値引きマスタ管理API =====
router.get('/master', discountController.getAllDiscounts); // 値引きマスタ一覧取得
router.get('/master/:id', discountController.getDiscountById); // 値引きマスタ詳細取得
router.post('/master', discountController.createDiscount); // 値引きマスタ作成
router.put('/master/:id', discountController.updateDiscount); // 値引きマスタ更新
router.delete('/master/:id', discountController.deleteDiscount); // 値引きマスタ削除

// ===== 受注値引きAPI（既存） =====
router.get('/', discountController.getActiveDiscounts); // 有効な値引き一覧
router.get('/applicable', discountController.getApplicableDiscounts); // 適用可能な値引き一覧
router.post('/calculate', discountController.calculateDiscount); // 値引き額計算
router.post('/calculate-total', discountController.calculateTotalDiscount); // 複数値引きの合計計算

// 受注値引きAPI
router.post('/orders/:orderId/discounts', discountController.applyDiscountToOrder); // 値引き適用
router.get('/orders/:orderId/discounts', discountController.getOrderDiscounts); // 受注の値引き一覧
router.delete('/orders/:orderId/discounts/:discountId', discountController.removeDiscountFromOrder); // 値引き削除

export default router;