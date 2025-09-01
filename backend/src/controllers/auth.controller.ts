import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/auth.service';
import { AuthValidator } from '../validators/auth.validator';
import { authUtils } from '../utils/auth';
import { logger } from '../utils/logger';
import { db } from '../config/database';
import { LoginRequest, ApiResponse } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService(db.getPool());
  }

  /**
   * ログイン処理
   */
  public async login(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    // キャメルケースからスネークケースに変換
    const { userCode, user_code, storeCode, store_code, password } = req.body;
    const credentials: LoginRequest = {
      user_code: userCode || user_code,
      store_code: storeCode || store_code,
      password
    };
    
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    logger.info(`[AUTH_CONTROLLER] ログインリクエスト受信: ${credentials.store_code}:${credentials.user_code}`);

    try {
      const result = await this.authService.login(
        credentials,
        ipAddress,
        userAgent
      );

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_CONTROLLER] ログイン処理完了 (${duration}ms)`);

      if (!result.success) {
        const statusCode = result.error?.code === 'ACCOUNT_LOCKED' ? 423 : 401;
        res.status(statusCode).json({
          success: false,
          error: result.error
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[AUTH_CONTROLLER] ログイン処理エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ログイン処理中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * ログアウト処理
   */
  public async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: '認証が必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[AUTH_CONTROLLER] ログアウトリクエスト受信: ${req.user.userCode}`);

    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await this.authService.logout(req.user.userId, token);
      }

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_CONTROLLER] ログアウト処理完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: { message: 'ログアウトしました' }
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[AUTH_CONTROLLER] ログアウト処理エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ログアウト処理中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * トークンリフレッシュ処理
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { refreshToken } = req.body;

    logger.info(`[AUTH_CONTROLLER] トークンリフレッシュリクエスト受信`);

    try {
      const result = await this.authService.refreshToken(refreshToken);

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_CONTROLLER] トークンリフレッシュ処理完了 (${duration}ms)`);

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: result.error
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[AUTH_CONTROLLER] トークンリフレッシュ処理エラー:', error);
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'トークンリフレッシュに失敗しました'
        }
      } as ApiResponse);
    }
  }

  /**
   * 現在のユーザー情報取得
   */
  public async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    const startTime = Date.now();

    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: '認証が必要です'
        }
      } as ApiResponse);
      return;
    }

    logger.info(`[AUTH_CONTROLLER] ユーザー情報リクエスト受信: ${req.user.userCode}`);

    try {
      const user = await this.authService.getCurrentUser(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません'
          }
        } as ApiResponse);
        return;
      }

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_CONTROLLER] ユーザー情報取得完了 (${duration}ms)`);

      res.status(200).json({
        success: true,
        data: user
      } as ApiResponse);
    } catch (error: any) {
      logger.error('[AUTH_CONTROLLER] ユーザー情報取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザー情報の取得中にエラーが発生しました'
        }
      } as ApiResponse);
    }
  }
}