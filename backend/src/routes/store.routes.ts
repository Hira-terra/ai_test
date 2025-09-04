import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';

const router = Router();
const storeController = new StoreController();

/**
 * @route GET /api/stores
 * @desc 店舗一覧取得
 * @access Public
 */
router.get(
  '/',
  storeController.getStores.bind(storeController)
);

/**
 * @route GET /api/stores/:id
 * @desc 店舗詳細取得
 * @access Public
 */
router.get(
  '/:id',
  storeController.getStoreById.bind(storeController)
);

/**
 * @route POST /api/stores
 * @desc 店舗作成
 * @access Public
 */
router.post(
  '/',
  storeController.createStore.bind(storeController)
);

/**
 * @route PUT /api/stores/:id
 * @desc 店舗更新
 * @access Public
 */
router.put(
  '/:id',
  storeController.updateStore.bind(storeController)
);

/**
 * @route DELETE /api/stores/:id
 * @desc 店舗削除
 * @access Public
 */
router.delete(
  '/:id',
  storeController.deleteStore.bind(storeController)
);

/**
 * @route GET /api/stores/:id/statistics
 * @desc 店舗統計取得
 * @access Public
 */
router.get(
  '/:id/statistics',
  storeController.getStoreStatistics.bind(storeController)
);

export default router;