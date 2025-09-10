import { Router } from 'express';
import { supplierController } from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// 全てのルートで認証を要求
router.use(authenticate);

// 仕入先関連のルート
router.get('/', supplierController.getSuppliers);                // 仕入先一覧取得
router.get('/:id', supplierController.getSupplierById);          // 仕入先詳細取得
router.post('/', supplierController.createSupplier);             // 仕入先作成
router.put('/:id', supplierController.updateSupplier);           // 仕入先更新
router.delete('/:id', supplierController.deleteSupplier);        // 仕入先削除

export default router;