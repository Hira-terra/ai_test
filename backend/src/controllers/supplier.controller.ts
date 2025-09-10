import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupplierModel } from '../models/supplier.model';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';
import { db } from '../config/database';

export class SupplierController {
  private supplierModel: SupplierModel;

  constructor() {
    this.supplierModel = new SupplierModel(db.getPool());
  }

  /**
   * 仕入先一覧取得
   * GET /api/suppliers
   */
  getSuppliers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      logger.info('[SUPPLIER_CONTROLLER] 仕入先一覧取得開始', {
        userId: req.user?.userId
      });

      const suppliers = await this.supplierModel.findAll();

      const response: ApiResponse = {
        success: true,
        data: suppliers
      };

      res.json(response);
      logger.info('[SUPPLIER_CONTROLLER] 仕入先一覧取得成功', {
        userId: req.user?.userId,
        count: suppliers.length
      });

    } catch (error: any) {
      logger.error('[SUPPLIER_CONTROLLER] 仕入先一覧取得エラー', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.userId
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '仕入先一覧の取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * 仕入先詳細取得
   * GET /api/suppliers/:id
   */
  getSupplierById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('[SUPPLIER_CONTROLLER] 仕入先詳細取得開始', {
        supplierId: id,
        userId: req.user?.userId
      });

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '仕入先IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const supplier = await this.supplierModel.findById(id);

      if (!supplier) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '仕入先が見つかりません'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: supplier
      };

      res.json(response);
      logger.info('[SUPPLIER_CONTROLLER] 仕入先詳細取得成功', {
        supplierId: id,
        userId: req.user?.userId
      });

    } catch (error: any) {
      logger.error('[SUPPLIER_CONTROLLER] 仕入先詳細取得エラー', {
        error: error.message,
        stack: error.stack,
        supplierId: req.params.id,
        userId: req.user?.userId
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '仕入先詳細の取得に失敗しました'
        }
      };

      res.status(500).json(response);
    }
  }

  /**
   * 仕入先作成
   * POST /api/suppliers
   */
  createSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      logger.info('[SUPPLIER_CONTROLLER] 仕入先作成開始', {
        data: req.body,
        userId: req.user?.userId
      });

      const supplier = await this.supplierModel.create(req.body);

      const response: ApiResponse = {
        success: true,
        data: supplier
      };

      res.status(201).json(response);
      logger.info('[SUPPLIER_CONTROLLER] 仕入先作成成功', {
        supplierId: supplier.id,
        userId: req.user?.userId
      });

    } catch (error: any) {
      logger.error('[SUPPLIER_CONTROLLER] 仕入先作成エラー', {
        error: error.message,
        stack: error.stack,
        data: req.body,
        userId: req.user?.userId
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '仕入先の作成に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }

  /**
   * 仕入先更新
   * PUT /api/suppliers/:id
   */
  updateSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('[SUPPLIER_CONTROLLER] 仕入先更新開始', {
        supplierId: id,
        data: req.body,
        userId: req.user?.userId
      });

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '仕入先IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const supplier = await this.supplierModel.update(id, req.body);

      if (!supplier) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '仕入先が見つかりません'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: supplier
      };

      res.json(response);
      logger.info('[SUPPLIER_CONTROLLER] 仕入先更新成功', {
        supplierId: id,
        userId: req.user?.userId
      });

    } catch (error: any) {
      logger.error('[SUPPLIER_CONTROLLER] 仕入先更新エラー', {
        error: error.message,
        stack: error.stack,
        supplierId: req.params.id,
        data: req.body,
        userId: req.user?.userId
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '仕入先の更新に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }

  /**
   * 仕入先削除
   * DELETE /api/suppliers/:id
   */
  deleteSupplier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('[SUPPLIER_CONTROLLER] 仕入先削除開始', {
        supplierId: id,
        userId: req.user?.userId
      });

      if (!id) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '仕入先IDが必要です'
          }
        };
        res.status(400).json(response);
        return;
      }

      const deleted = await this.supplierModel.delete(id);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '仕入先が見つかりません'
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: { message: '仕入先が削除されました' }
      };

      res.json(response);
      logger.info('[SUPPLIER_CONTROLLER] 仕入先削除成功', {
        supplierId: id,
        userId: req.user?.userId
      });

    } catch (error: any) {
      logger.error('[SUPPLIER_CONTROLLER] 仕入先削除エラー', {
        error: error.message,
        stack: error.stack,
        supplierId: req.params.id,
        userId: req.user?.userId
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '仕入先の削除に失敗しました'
        }
      };

      res.status(400).json(response);
    }
  }
}

export const supplierController = new SupplierController();