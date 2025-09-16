import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * @route   GET /api/inventory/products
 * @desc    数量管理商品の在庫一覧取得
 * @access  Private
 */
router.get('/products', inventoryController.getStockItems);

/**
 * @route   PUT /api/inventory/products/:productId/stock
 * @desc    在庫数量更新
 * @access  Private
 */
router.put('/products/:productId/stock', inventoryController.updateStock);

export default router;