import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { logger } from '../utils/logger';
import {
  Customer,
  Prescription,
  CustomerImage,
  CustomerMemo,
  CustomerSearchParams,
  UUID
} from '../types';
import { validateUuidParam } from '../validators/customer.validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 認証済みリクエスト型定義
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    userCode: string;
    storeId: string;
    role: string;
    sessionId?: string;
    permissions?: string[];
  };
}

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
    logger.info('[CustomerController] 初期化完了');
  }

  // ============================================
  // 顧客管理エンドポイント
  // ============================================

  /**
   * 顧客検索
   * GET /api/customers
   */
  searchCustomers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-search-${Date.now()}`;
    const userId = req.user?.userId;
    
    logger.info(`[${operationId}] 顧客検索API開始`, { 
      query: req.query,
      userId 
    });

    try {
      const searchParams: CustomerSearchParams = {
        search: req.query.search as string,
        phone: req.query.phone as string,
        address: req.query.address as string,
        ownStoreOnly: req.query.ownStoreOnly === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        sort: req.query.sort as 'name' | 'kana' | 'last_visit_date'
      };

      const result = await this.customerService.searchCustomers(
        searchParams, 
        searchParams.ownStoreOnly ? req.user?.storeId : undefined
      );

      if (result.success) {
        logger.info(`[${operationId}] 顧客検索API成功`, { 
          found: result.data?.length,
          total: result.meta?.pagination?.total 
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客検索API失敗`, { error: result.error });
        res.status(result.error?.code === 'VALIDATION_ERROR' ? 400 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客検索APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客詳細取得
   * GET /api/customers/:id
   */
  getCustomerById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-getById-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.id;

    logger.info(`[${operationId}] 顧客詳細取得API開始`, { customerId, userId });

    try {
      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.getCustomerById(customerId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客詳細取得API成功`, { 
          customerCode: result.data?.customerCode 
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客詳細取得API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客詳細取得APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客作成
   * POST /api/customers
   */
  createCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-create-${Date.now()}`;
    const userId = req.user?.userId;

    logger.info(`[${operationId}] 顧客作成API開始`, { 
      fullName: req.body.fullName,
      userId 
    });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // registeredStoreIdの設定
      // フロントエンドから送られた値を優先し、なければ現在ユーザーの店舗IDを使用
      const customerData = {
        ...req.body,
        registeredStoreId: req.body.registeredStoreId || req.user?.storeId
      };
      
      logger.info(`[${operationId}] 顧客データ準備完了`, { 
        registeredStoreId: customerData.registeredStoreId,
        userStoreId: req.user?.storeId,
        hasUser: !!req.user
      });
      
      const result = await this.customerService.createCustomer(customerData, userId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客作成API成功`, { 
          customerId: result.data?.id,
          customerCode: result.data?.customerCode 
        });
        res.status(201).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客作成API失敗`, { error: result.error });
        res.status(result.error?.code === 'VALIDATION_ERROR' ? 400 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客作成APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客更新
   * PUT /api/customers/:id
   */
  updateCustomer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-update-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.id;

    logger.info(`[${operationId}] 顧客更新API開始`, { 
      customerId, 
      userId,
      requestBody: req.body 
    });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.updateCustomer(customerId, req.body, userId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客更新API成功`, { 
          customerCode: result.data?.customerCode 
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客更新API失敗`, { error: result.error });
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客更新APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  // ============================================
  // 処方箋管理エンドポイント
  // ============================================

  /**
   * 処方箋作成
   * POST /api/customers/:customerId/prescriptions
   */
  createPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-prescription-create-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.info(`[${operationId}] 処方箋作成API開始`, { customerId, userId });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      // リクエストボディにcustomerIdを設定
      const prescriptionData = {
        ...req.body,
        customerId
      };

      const result = await this.customerService.createPrescription(prescriptionData, userId);

      if (result.success) {
        logger.info(`[${operationId}] 処方箋作成API成功`, { 
          prescriptionId: result.data?.id 
        });
        res.status(201).json(result);
      } else {
        logger.warn(`[${operationId}] 処方箋作成API失敗`, { error: result.error });
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 処方箋作成APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客処方箋一覧取得
   * GET /api/customers/:customerId/prescriptions
   */
  getCustomerPrescriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-prescription-list-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.debug(`[${operationId}] 顧客処方箋一覧取得API開始`, { customerId, userId });

    try {
      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.getCustomerPrescriptions(customerId);

      if (result.success) {
        logger.debug(`[${operationId}] 顧客処方箋一覧取得API成功`, { 
          count: result.data?.length 
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客処方箋一覧取得API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客処方箋一覧取得APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  // ============================================
  // 画像管理エンドポイント
  // ============================================

  /**
   * 顧客画像アップロード
   * POST /api/customers/:customerId/images
   */
  uploadCustomerImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-image-upload-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.info(`[${operationId}] 顧客画像アップロードAPI開始`, { customerId, userId });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      // アップロードファイル確認
      if (!req.file) {
        logger.warn(`[${operationId}] アップロードファイルなし`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'アップロードするファイルを選択してください。'
          }
        });
        return;
      }

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const imageData = {
        customerId,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        imageType: (req.body.imageType as any) || 'other',
        title: req.body.title,
        description: req.body.description,
        capturedDate: req.body.capturedDate ? new Date(req.body.capturedDate).toISOString() : undefined,
        uploadedBy: userId
      };

      const result = await this.customerService.uploadCustomerImage(imageData, userId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客画像アップロードAPI成功`, { 
          imageId: result.data?.id 
        });
        res.status(201).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客画像アップロードAPI失敗`, { error: result.error });
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像アップロードAPIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客画像一覧取得
   * GET /api/customers/:customerId/images
   */
  getCustomerImages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-image-list-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.debug(`[${operationId}] 顧客画像一覧取得API開始`, { customerId, userId });

    try {
      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.getCustomerImages(customerId);

      if (result.success) {
        logger.debug(`[${operationId}] 顧客画像一覧取得API成功`, {
          count: result.data?.length,
          firstImage: result.data?.[0]
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客画像一覧取得API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像一覧取得APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客画像削除
   * DELETE /api/customers/:customerId/images/:imageId
   */
  deleteCustomerImage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-image-delete-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;
    const imageId = req.params.imageId;

    logger.info(`[${operationId}] 顧客画像削除API開始`, { customerId, imageId, userId });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });
      validateUuidParam({ id: imageId });

      if (!customerId || !imageId) {
        logger.warn(`[${operationId}] パラメータが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDと画像IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.deleteCustomerImage(imageId, customerId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客画像削除API成功`, { deleted: result.data });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客画像削除API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像削除APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  // ============================================
  // 購入履歴管理エンドポイント
  // ============================================

  /**
   * 顧客購入履歴取得
   * GET /api/customers/:customerId/orders
   */
  getCustomerOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-orders-list-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.debug(`[${operationId}] 顧客購入履歴取得API開始`, { customerId, userId });

    try {
      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }

      const result = await this.customerService.getCustomerOrders(customerId);

      if (result.success) {
        logger.debug(`[${operationId}] 顧客購入履歴取得API成功`, {
          count: result.data?.length
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客購入履歴取得API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客購入履歴取得APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  // ============================================
  // メモ管理エンドポイント
  // ============================================

  /**
   * 顧客メモ作成
   * POST /api/customers/:customerId/memos
   */
  createCustomerMemo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-memo-create-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.info(`[${operationId}] 顧客メモ作成API開始`, { customerId, userId });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      // リクエストボディにcustomerIdを設定
      const memoData = {
        ...req.body,
        customerId
      };

      const result = await this.customerService.createCustomerMemo(memoData, userId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客メモ作成API成功`, { 
          memoId: result.data?.id 
        });
        res.status(201).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客メモ作成API失敗`, { error: result.error });
        const statusCode = result.error?.code === 'NOT_FOUND' ? 404 :
                          result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ作成APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客メモ一覧取得
   * GET /api/customers/:customerId/memos
   */
  getCustomerMemos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-memo-list-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;

    logger.debug(`[${operationId}] 顧客メモ一覧取得API開始`, { customerId, userId });

    try {
      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });

      if (!customerId) {
        logger.warn(`[${operationId}] customerIdが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.getCustomerMemos(customerId);

      if (result.success) {
        logger.debug(`[${operationId}] 顧客メモ一覧取得API成功`, { 
          count: result.data?.length 
        });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客メモ一覧取得API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ一覧取得APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };

  /**
   * 顧客メモ削除
   * DELETE /api/customers/:customerId/memos/:memoId
   */
  deleteCustomerMemo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const operationId = `controller-memo-delete-${Date.now()}`;
    const userId = req.user?.userId;
    const customerId = req.params.customerId;
    const memoId = req.params.memoId;

    logger.info(`[${operationId}] 顧客メモ削除API開始`, { customerId, memoId, userId });

    try {
      if (!userId) {
        logger.warn(`[${operationId}] 認証エラー: ユーザー情報が見つかりません`);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '認証が必要です。'
          }
        });
        return;
      }

      // UUIDパラメータ検証
      validateUuidParam({ id: customerId });
      validateUuidParam({ id: memoId });

      if (!customerId || !memoId) {
        logger.warn(`[${operationId}] パラメータが不正です`);
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '顧客IDとメモIDが必要です。'
          }
        });
        return;
      }
      
      const result = await this.customerService.deleteCustomerMemo(memoId, customerId);

      if (result.success) {
        logger.info(`[${operationId}] 顧客メモ削除API成功`, { deleted: result.data });
        res.status(200).json(result);
      } else {
        logger.warn(`[${operationId}] 顧客メモ削除API失敗`, { error: result.error });
        res.status(result.error?.code === 'NOT_FOUND' ? 404 : 500).json(result);
      }

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ削除APIエラー:`, error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。'
        }
      });
    }
  };
}

// Multer設定（画像アップロード用）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.CUSTOMER_IMAGES_DIR || './uploads/customers';

    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
        logger.info(`[MULTER] アップロードディレクトリを作成しました: ${uploadDir}`);
      } catch (error) {
        logger.error(`[MULTER] ディレクトリ作成エラー: ${uploadDir}`, error);
        return cb(error as Error, uploadDir);
      }
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = (process.env.IMAGE_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif').split(',');
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`許可されていないファイル形式です。許可されている形式: ${allowedTypes.join(', ')}`));
    }
  }
});