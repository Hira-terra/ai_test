import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const productController = new ProductController();

// 認証が必要なすべてのルートに認証ミドルウェアを適用
router.use(authenticate);

/**
 * @route   GET /api/products
 * @desc    商品一覧取得
 * @access  Private (認証必要)
 * @query   category - 商品カテゴリでフィルター (optional)
 * @query   available_only - 利用可能商品のみ取得 (optional)
 */
router.get('/', productController.getProducts.bind(productController));

/**
 * @route   GET /api/products/frames
 * @desc    利用可能フレーム一覧取得
 * @access  Private (認証必要)
 */
router.get('/frames', productController.getAvailableFrames.bind(productController));

/**
 * @route   GET /api/products/:id
 * @desc    商品詳細取得
 * @access  Private (認証必要)
 */
router.get('/:id', productController.getProductById.bind(productController));

export default router;