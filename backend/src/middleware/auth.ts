import { Request, Response, NextFunction } from 'express';
import { authUtils } from '@/utils/auth';
import { AuthRepository } from '@/repositories/auth.repository';
import { db } from '@/config/database';
import { logger } from '@/utils/logger';
import { UserRole } from '@/types';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    userCode: string;
    storeId: string;
    role: UserRole;
    sessionId?: string;
    permissions?: string[];
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authRepo = new AuthRepository(db.getPool());
  
  try {
    logger.debug(`[AUTH_MIDDLEWARE] 認証開始: ${req.method} ${req.path}`);
    const authHeader = req.headers.authorization;
    logger.debug(`[AUTH_MIDDLEWARE] Authorization header: ${authHeader ? 'あり' : 'なし'}`);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`[AUTH_MIDDLEWARE] 認証ヘッダーなし: ${req.method} ${req.path}`);
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: '認証が必要です'
        }
      });
      return;
    }

    const token = authHeader.substring(7);
    
    // トークンがブラックリストに登録されているかチェック
    const isBlacklisted = await authUtils.isTokenBlacklisted(token);
    if (isBlacklisted) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REVOKED',
          message: 'トークンが無効化されています'
        }
      });
      return;
    }

    // トークンの検証
    const payload = authUtils.verifyAccessToken(token);
    
    // セッションの有効性確認（現在は簡略化のためスキップ）
    // TODO: 実際のセッション管理を実装する場合は有効化
    // if (payload.sessionId) {
    //   const session = await authRepo.validateSession(payload.sessionId);
    //   if (!session) {
    //     logger.warn(`[AUTH_MIDDLEWARE] セッション無効: sessionId=${payload.sessionId}`);
    //     res.status(401).json({
    //       success: false,
    //       error: {
    //         code: 'SESSION_EXPIRED',
    //         message: 'セッションが無効です'
    //       }
    //     });
    //     return;
    //   }
    // }

    // ユーザーの有効性確認
    const userData = await authRepo.getUserById(payload.userId);
    if (!userData || !userData.user.is_active) {
      logger.warn(`[AUTH_MIDDLEWARE] ユーザー無効: userId=${payload.userId}`);
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'ユーザーアカウントが無効です'
        }
      });
      return;
    }
    
    req.user = {
      userId: payload.userId,
      userCode: payload.userCode,
      storeId: payload.storeId,
      role: payload.role as UserRole,
      sessionId: payload.sessionId,
      permissions: payload.permissions || []
    };

    next();
  } catch (error: any) {
    logger.warn('[AUTH_MIDDLEWARE] 認証エラー:', error.message);
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: '認証に失敗しました'
      }
    });
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`認可エラー: ユーザー ${req.user.userCode} (役割: ${req.user.role}) が権限を持たないリソースにアクセスを試行`);
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_FAILED',
          message: 'このリソースへのアクセス権限がありません'
        }
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const isBlacklisted = await authUtils.isTokenBlacklisted(token);
      if (!isBlacklisted) {
        try {
          const payload = authUtils.verifyAccessToken(token);
          req.user = {
            userId: payload.userId,
            userCode: payload.userCode,
            storeId: payload.storeId,
            role: payload.role as UserRole,
          };
        } catch (error) {
          // オプショナル認証なので、トークンが無効でも続行
        }
      }
    }
    
    next();
  } catch (error) {
    // オプショナル認証なので、エラーが発生しても続行
    next();
  }
};

export const requireStoreAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

  // 管理者は全店舗アクセス可能
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // 店舗IDが含まれるリクエストの場合、同じ店舗かチェック
  const requestedStoreId = req.params.storeId || req.body.storeId;
  if (requestedStoreId && requestedStoreId !== req.user.storeId) {
    logger.warn(`店舗アクセス権限エラー: ユーザー ${req.user.userCode} が他店舗 ${requestedStoreId} のデータにアクセスを試行`);
    res.status(403).json({
      success: false,
      error: {
        code: 'STORE_ACCESS_DENIED',
        message: '他店舗のデータにはアクセスできません'
      }
    });
    return;
  }

  next();
};

export const requirePermission = (requiredPermission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(requiredPermission)) {
      logger.warn(`[AUTH_MIDDLEWARE] 権限不足: ユーザー ${req.user.userCode} に権限 ${requiredPermission} がありません`);
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'この操作を実行する権限がありません'
        }
      });
      return;
    }

    next();
  };
};

export const requireAnyPermission = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn(`[AUTH_MIDDLEWARE] 権限不足: ユーザー ${req.user.userCode} に必要な権限がありません`);
      res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'この操作を実行する権限がありません'
        }
      });
      return;
    }

    next();
  };
};