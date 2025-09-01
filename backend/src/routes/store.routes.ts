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

export default router;