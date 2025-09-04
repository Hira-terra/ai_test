import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { generateOperationId } from '../utils/helpers';
import { logger } from '../utils/logger';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // ユーザー一覧取得
  async getUsers(req: Request, res: Response): Promise<void> {
    const operationId = generateOperationId('getUsers');
    const startTime = Date.now();

    try {
      logger.info(`[UserController:getUsers] ユーザー一覧取得開始 - ${operationId}`);

      const params = {
        storeId: req.query.storeId as string,
        role: req.query.role as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50
      };

      const result = await this.userService.getUsers(params, operationId);

      const duration = Date.now() - startTime;
      logger.info(`[UserController:getUsers] ユーザー一覧取得完了 - ${operationId}`, {
        duration: `${duration}ms`,
        success: result.success
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
        res.status(status).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserController:getUsers] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバーエラーが発生しました。'
        }
      });
    }
  }

  // ユーザー詳細取得
  async getUserById(req: Request, res: Response): Promise<void> {
    const operationId = generateOperationId('getUserById');
    const startTime = Date.now();

    try {
      logger.info(`[UserController:getUserById] ユーザー詳細取得開始 - ${operationId}`, {
        userId: req.params.id
      });

      const result = await this.userService.getUserById(req.params.id!, operationId);

      const duration = Date.now() - startTime;
      logger.info(`[UserController:getUserById] ユーザー詳細取得完了 - ${operationId}`, {
        duration: `${duration}ms`,
        success: result.success
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = result.error?.code === 'NOT_FOUND' ? 404 : 500;
        res.status(status).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserController:getUserById] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        userId: req.params.id,
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバーエラーが発生しました。'
        }
      });
    }
  }

  // ユーザー作成
  async createUser(req: Request, res: Response): Promise<void> {
    const operationId = generateOperationId('createUser');
    const startTime = Date.now();

    try {
      logger.info(`[UserController:createUser] ユーザー作成開始 - ${operationId}`, {
        userCode: req.body.userCode,
        storeId: req.body.storeId,
        role: req.body.role
      });

      const result = await this.userService.createUser(req.body, operationId);

      const duration = Date.now() - startTime;
      logger.info(`[UserController:createUser] ユーザー作成完了 - ${operationId}`, {
        duration: `${duration}ms`,
        success: result.success
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        const status = result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserController:createUser] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        requestData: req.body,
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバーエラーが発生しました。'
        }
      });
    }
  }

  // ユーザー更新
  async updateUser(req: Request, res: Response): Promise<void> {
    const operationId = generateOperationId('updateUser');
    const startTime = Date.now();

    try {
      logger.info(`[UserController:updateUser] ユーザー更新開始 - ${operationId}`, {
        userId: req.params.id,
        updateFields: Object.keys(req.body)
      });

      const result = await this.userService.updateUser(req.params.id!, req.body, operationId);

      const duration = Date.now() - startTime;
      logger.info(`[UserController:updateUser] ユーザー更新完了 - ${operationId}`, {
        duration: `${duration}ms`,
        success: result.success
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        const status = result.error?.code === 'NOT_FOUND' ? 404 : result.error?.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json(result);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserController:updateUser] 予期しないエラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        userId: req.params.id,
        updateData: req.body,
        duration: `${duration}ms`
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'サーバーエラーが発生しました。'
        }
      });
    }
  }
}

// シングルトンインスタンスをエクスポート
export const userController = new UserController();