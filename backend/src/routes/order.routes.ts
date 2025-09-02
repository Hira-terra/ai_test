import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const orderController = new OrderController();

// ============================================
// 受注管理ルート
// ============================================

// 認証ミドルウェアをすべてのルートに適用
router.use(authenticate);

/**
 * @route GET /api/orders
 * @desc 受注一覧取得
 * @access Private
 * @permissions order:read
 */
router.get(
  '/',
  requirePermission('order:read'),
  orderController.getOrders
);

/**
 * @route GET /api/orders/summary
 * @desc 売上サマリー取得
 * @access Private
 * @permissions order:read
 */
router.get(
  '/summary',
  requirePermission('order:read'),
  orderController.getSalesSummary
);

/**
 * @route GET /api/orders/:id
 * @desc 受注詳細取得
 * @access Private
 * @permissions order:read
 */
router.get(
  '/:id',
  requirePermission('order:read'),
  orderController.getOrderById
);

/**
 * @route POST /api/orders
 * @desc 受注作成
 * @access Private
 * @permissions order:create
 */
router.post(
  '/',
  requirePermission('order:create'),
  orderController.createOrder
);

/**
 * @route PUT /api/orders/:id
 * @desc 受注更新
 * @access Private
 * @permissions order:write
 */
router.put(
  '/:id',
  requirePermission('order:write'),
  orderController.updateOrder
);

/**
 * @route PUT /api/orders/:id/cancel
 * @desc 受注キャンセル
 * @access Private
 * @permissions order:cancel
 */
router.put(
  '/:id/cancel',
  requirePermission('order:cancel'),
  orderController.cancelOrder
);

/**
 * @route POST /api/orders/:orderId/payments
 * @desc 入金追加
 * @access Private
 * @permissions order:write
 */
router.post(
  '/:orderId/payments',
  requirePermission('order:write'),
  orderController.addPayment
);

export default router;