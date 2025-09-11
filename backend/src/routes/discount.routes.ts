import { Router } from 'express';
import { discountController } from '../controllers/discount.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// 値引きAPI
router.get('/', discountController.getActiveDiscounts); // 有効な値引き一覧
router.get('/applicable', discountController.getApplicableDiscounts); // 適用可能な値引き一覧
router.post('/calculate', discountController.calculateDiscount); // 値引き額計算
router.post('/calculate-total', discountController.calculateTotalDiscount); // 複数値引きの合計計算

// 受注値引きAPI
router.post('/orders/:orderId/discounts', discountController.applyDiscountToOrder); // 値引き適用
router.get('/orders/:orderId/discounts', discountController.getOrderDiscounts); // 受注の値引き一覧
router.delete('/orders/:orderId/discounts/:discountId', discountController.removeDiscountFromOrder); // 値引き削除

export default router;