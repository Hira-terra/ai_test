import { Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { authUtils } from '@/utils/auth';
import { redis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { db } from '@/config/database';
import { config } from '@/config';
import { LoginRequest, LoginResponse, User, ApiResponse } from '@/types';

export class AuthController {
  /**
   * ログイン処理
   */
  public async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { user_code, password, store_code }: LoginRequest = req.body;

      if (!user_code || !password || !store_code) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ユーザーコード、パスワード、店舗コードは必須です'
          }
        });
        return;
      }

      const loginIdentifier = `${store_code}:${user_code}`;

      // アカウントロック状態確認
      const isLocked = await authUtils.isAccountLocked(loginIdentifier);
      if (isLocked) {
        res.status(423).json({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'アカウントがロックされています。しばらく待ってから再試行してください'
          }
        });
        return;
      }

      // ユーザー検索（店舗情報も含めて取得）
      const userQuery = `
        SELECT 
          u.id, u.user_code, u.name, u.email, u.role, u.is_active, 
          u.password_hash as password, u.last_login_at,
          s.id as store_id, s.store_code, s.name as store_name, 
          s.address as store_address, s.phone as store_phone, s.manager_name
        FROM users u
        INNER JOIN stores s ON u.store_id = s.id
        WHERE u.user_code = $1 AND s.store_code = $2 AND u.is_active = true
      `;

      const userResult = await db.query(userQuery, [user_code, store_code]);

      if (userResult.rows.length === 0) {
        await authUtils.recordLoginAttempt(loginIdentifier);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'ユーザーコードまたは店舗コードが正しくありません'
          }
        });
        return;
      }

      const userData = userResult.rows[0];

      // パスワード検証
      const isValidPassword = await authUtils.verifyPassword(password, userData.password);
      if (!isValidPassword) {
        await authUtils.recordLoginAttempt(loginIdentifier);
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'パスワードが正しくありません'
          }
        });
        return;
      }

      // ログイン成功 - 試行回数リセット
      await authUtils.resetLoginAttempts(loginIdentifier);

      // ユーザー情報構築
      const user: User = {
        id: userData.id,
        userCode: userData.user_code,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isActive: userData.is_active,
        store: {
          id: userData.store_id,
          storeCode: userData.store_code,
          name: userData.store_name,
          address: userData.store_address,
          phone: userData.store_phone,
          managerName: userData.manager_name
        },
        lastLoginAt: userData.last_login_at
      };

      // トークン生成
      const tokenPair = authUtils.generateTokenPair({
        userId: user.id,
        userCode: user.userCode,
        storeId: user.store.id,
        role: user.role
      });

      // リフレッシュトークンをRedisに保存
      await authUtils.storeRefreshToken(user.id, tokenPair.refreshToken);

      // 最終ログイン時刻を更新
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );

      const response: LoginResponse = {
        user: authUtils.sanitizeUserData(user),
        token: tokenPair.accessToken,
        expiresIn: tokenPair.expiresIn
      };

      logger.info(`ユーザーログイン成功: ${user.userCode} (${user.store.name})`);

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error: any) {
      logger.error('ログインエラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ログイン処理中にエラーが発生しました'
        }
      });
    }
  }

  /**
   * ログアウト処理
   */
  public async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: '認証が必要です'
          }
        });
        return;
      }

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // トークンをブラックリストに追加
        await authUtils.blacklistToken(token);
      }

      // リフレッシュトークンを無効化
      await authUtils.revokeRefreshToken(req.user.userId);

      logger.info(`ユーザーログアウト: ${req.user.userCode}`);

      res.status(200).json({
        success: true,
        data: { message: 'ログアウトしました' }
      });
    } catch (error: any) {
      logger.error('ログアウトエラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ログアウト処理中にエラーが発生しました'
        }
      });
    }
  }

  /**
   * トークンリフレッシュ処理
   */
  public async refresh(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リフレッシュトークンが必要です'
          }
        });
        return;
      }

      // リフレッシュトークンの検証
      const payload = authUtils.verifyRefreshToken(refreshToken);

      // 保存されているリフレッシュトークンと比較
      const storedToken = await authUtils.getStoredRefreshToken(payload.userId);
      if (!storedToken || storedToken !== refreshToken) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '無効なリフレッシュトークンです'
          }
        });
        return;
      }

      // 新しいアクセストークンを生成
      const newTokenPair = authUtils.generateTokenPair({
        userId: payload.userId,
        userCode: payload.userCode,
        storeId: payload.storeId,
        role: payload.role
      });

      res.status(200).json({
        success: true,
        data: {
          token: newTokenPair.accessToken,
          expiresIn: newTokenPair.expiresIn
        }
      });
    } catch (error: any) {
      logger.warn('トークンリフレッシュエラー:', error.message);
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'トークンリフレッシュに失敗しました'
        }
      });
    }
  }

  /**
   * 現在のユーザー情報取得
   */
  public async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: '認証が必要です'
          }
        });
        return;
      }

      // 最新のユーザー情報を取得
      const userQuery = `
        SELECT 
          u.id, u.user_code, u.name, u.email, u.role, u.is_active, u.last_login_at,
          s.id as store_id, s.store_code, s.name as store_name, 
          s.address as store_address, s.phone as store_phone, s.manager_name
        FROM users u
        INNER JOIN stores s ON u.store_id = s.id
        WHERE u.id = $1 AND u.is_active = true
      `;

      const userResult = await db.query(userQuery, [req.user.userId]);

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'ユーザーが見つかりません'
          }
        });
        return;
      }

      const userData = userResult.rows[0];

      const user: User = {
        id: userData.id,
        userCode: userData.user_code,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isActive: userData.is_active,
        store: {
          id: userData.store_id,
          storeCode: userData.store_code,
          name: userData.store_name,
          address: userData.store_address,
          phone: userData.store_phone,
          managerName: userData.manager_name
        },
        lastLoginAt: userData.last_login_at
      };

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error: any) {
      logger.error('ユーザー情報取得エラー:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザー情報の取得中にエラーが発生しました'
        }
      });
    }
  }
}