import { Pool } from 'pg';
import { AuthRepository } from '../repositories/auth.repository';
import { authUtils, JwtPayload, TokenPair } from '../utils/auth';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { LoginRequest, LoginResponse, User, UUID, UserRole } from '../types';
import { AuthValidator } from '../validators/auth.validator';
import { v4 as uuidv4 } from 'uuid';

export interface LoginResult {
  success: boolean;
  data?: LoginResponse;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RefreshResult {
  success: boolean;
  data?: {
    token: string;
    expiresIn: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export class AuthService {
  private authRepo: AuthRepository;

  constructor(private db: Pool) {
    this.authRepo = new AuthRepository(db);
  }

  async login(
    credentials: LoginRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    const startTime = Date.now();
    const { user_code, password, store_code } = credentials;
    const loginIdentifier = `${store_code}:${user_code}`;

    logger.info(`[AUTH_SERVICE] ログイン処理開始: ${loginIdentifier}`);

    try {
      // アカウントロック確認
      const isLocked = await this.authRepo.isAccountLocked(user_code, store_code);
      if (isLocked) {
        logger.warn(`[AUTH_SERVICE] アカウントロック中: ${loginIdentifier}`);
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'アカウントがロックされています。しばらく待ってから再試行してください'
          }
        };
      }

      // ユーザーと店舗情報を取得
      const userData = await this.authRepo.findUserWithStore(user_code, store_code);
      if (!userData) {
        await this.authRepo.recordLoginAttempt(
          user_code,
          store_code,
          ipAddress,
          userAgent,
          false,
          'USER_NOT_FOUND'
        );
        logger.warn(`[AUTH_SERVICE] ユーザー未発見: ${loginIdentifier}`);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'ユーザーコードまたは店舗コードが正しくありません'
          }
        };
      }

      const { user, store } = userData;

      // パスワード検証
      const isValidPassword = await authUtils.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        await this.authRepo.recordLoginAttempt(
          user_code,
          store_code,
          ipAddress,
          userAgent,
          false,
          'INVALID_PASSWORD'
        );
        logger.warn(`[AUTH_SERVICE] パスワード不一致: ${loginIdentifier}`);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'パスワードが正しくありません'
          }
        };
      }

      // ログイン成功処理
      await this.authRepo.recordLoginAttempt(
        user_code,
        store_code,
        ipAddress,
        userAgent,
        true
      );
      await this.authRepo.resetLoginAttempts(user.id);
      await this.authRepo.updateLastLoginAt(user.id);

      // セッション作成
      const deviceInfo = {
        userAgent,
        ipAddress,
        platform: this.detectPlatform(userAgent)
      };

      const session = await this.authRepo.createSession(
        user.id,
        deviceInfo,
        ipAddress,
        userAgent,
        30 * 24 * 60 * 60 // 30日
      );

      // 権限リストを取得（ロールベース）
      const permissions = this.getRolePermissions(user.role);

      // JWTトークン生成
      const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: user.id,
        userCode: user.user_code,
        storeId: store.id,
        role: user.role,
        permissions,
        sessionId: session.session_id,
        jti: uuidv4()
      };

      const tokenPair = authUtils.generateTokenPair(tokenPayload);

      // リフレッシュトークンをRedisに保存
      await authUtils.storeRefreshToken(user.id, tokenPair.refreshToken);

      // ユーザー情報構築
      const userResponse: User = {
        id: user.id,
        userCode: user.user_code,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        store: {
          id: store.id,
          storeCode: store.store_code,
          name: store.name,
          address: store.address,
          phone: store.phone,
          managerName: store.manager_name
        },
        lastLoginAt: user.last_login_at
      };

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_SERVICE] ログイン成功: ${loginIdentifier} (${duration}ms)`);

      return {
        success: true,
        data: {
          user: authUtils.sanitizeUserData(userResponse),
          token: tokenPair.accessToken,
          expiresIn: tokenPair.expiresIn
        }
      };
    } catch (error) {
      logger.error(`[AUTH_SERVICE] ログインエラー: ${loginIdentifier}`, error);
      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ログイン処理中にエラーが発生しました'
        }
      };
    }
  }

  async logout(userId: UUID, token: string): Promise<void> {
    const startTime = Date.now();
    logger.info(`[AUTH_SERVICE] ログアウト処理開始: userId=${userId}`);

    try {
      // トークンをブラックリストに追加
      await authUtils.blacklistToken(token);

      // リフレッシュトークンを無効化
      await authUtils.revokeRefreshToken(userId);

      // 全セッションを無効化
      await this.authRepo.revokeAllUserSessions(userId);

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_SERVICE] ログアウト完了: userId=${userId} (${duration}ms)`);
    } catch (error) {
      logger.error(`[AUTH_SERVICE] ログアウトエラー: userId=${userId}`, error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshResult> {
    const startTime = Date.now();
    logger.info(`[AUTH_SERVICE] トークンリフレッシュ開始`);

    try {
      // リフレッシュトークンの検証
      const payload = authUtils.verifyRefreshToken(refreshToken);

      // 保存されているリフレッシュトークンと比較
      const storedToken = await authUtils.getStoredRefreshToken(payload.userId);
      if (!storedToken || storedToken !== refreshToken) {
        logger.warn(`[AUTH_SERVICE] 無効なリフレッシュトークン: userId=${payload.userId}`);
        return {
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: '無効なリフレッシュトークンです'
          }
        };
      }

      // セッションの有効性確認
      if (payload.sessionId) {
        const session = await this.authRepo.validateSession(payload.sessionId);
        if (!session) {
          logger.warn(`[AUTH_SERVICE] 無効なセッション: sessionId=${payload.sessionId}`);
          return {
            success: false,
            error: {
              code: 'SESSION_EXPIRED',
              message: 'セッションが無効です'
            }
          };
        }
      }

      // ユーザーの有効性確認
      const userData = await this.authRepo.getUserById(payload.userId);
      if (!userData || !userData.user.is_active) {
        logger.warn(`[AUTH_SERVICE] 無効なユーザー: userId=${payload.userId}`);
        return {
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'ユーザーアカウントが無効です'
          }
        };
      }

      // 新しいアクセストークンを生成
      const newTokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
        userId: payload.userId,
        userCode: payload.userCode,
        storeId: payload.storeId,
        role: payload.role,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
        jti: uuidv4()
      };

      const newTokenPair = authUtils.generateTokenPair(newTokenPayload);

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_SERVICE] トークンリフレッシュ成功 (${duration}ms)`);

      return {
        success: true,
        data: {
          token: newTokenPair.accessToken,
          expiresIn: newTokenPair.expiresIn
        }
      };
    } catch (error: any) {
      logger.error(`[AUTH_SERVICE] トークンリフレッシュエラー`, error);
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'トークンリフレッシュに失敗しました'
        }
      };
    }
  }

  async getCurrentUser(userId: UUID): Promise<User | null> {
    const startTime = Date.now();
    logger.info(`[AUTH_SERVICE] ユーザー情報取得開始: userId=${userId}`);

    try {
      const userData = await this.authRepo.getUserById(userId);
      if (!userData) {
        logger.warn(`[AUTH_SERVICE] ユーザー未発見: userId=${userId}`);
        return null;
      }

      const { user, store } = userData;

      const userResponse: User = {
        id: user.id,
        userCode: user.user_code,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        store: {
          id: store.id,
          storeCode: store.store_code,
          name: store.name,
          address: store.address,
          phone: store.phone,
          managerName: store.manager_name
        },
        lastLoginAt: user.last_login_at
      };

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_SERVICE] ユーザー情報取得完了: userId=${userId} (${duration}ms)`);

      return userResponse;
    } catch (error) {
      logger.error(`[AUTH_SERVICE] ユーザー情報取得エラー: userId=${userId}`, error);
      throw error;
    }
  }

  async getAllStores() {
    const startTime = Date.now();
    logger.info(`[AUTH_SERVICE] 全店舗取得開始`);

    try {
      const stores = await this.authRepo.getAllStores();
      
      const duration = Date.now() - startTime;
      logger.info(`[AUTH_SERVICE] 全店舗取得完了: ${stores.length}店舗 (${duration}ms)`);

      return stores.map(store => ({
        id: store.id,
        storeCode: store.store_code,
        name: store.name,
        address: store.address,
        phone: store.phone,
        managerName: store.manager_name
      }));
    } catch (error) {
      logger.error(`[AUTH_SERVICE] 全店舗取得エラー`, error);
      throw error;
    }
  }

  private getRolePermissions(role: UserRole): string[] {
    const rolePermissions: Record<UserRole, string[]> = {
      staff: [
        'customer:read', 'customer:write', 'customer:create',
        'order:read', 'order:write', 'order:create', 'order:cancel',
        'register:operate',
        'inventory:read', 'inventory:write'
      ],
      manager: [
        'customer:read', 'customer:write', 'customer:create',
        'order:read', 'order:write', 'order:create', 'order:cancel',
        'register:operate', 'register:approve',
        'inventory:read', 'inventory:write',
        'analytics:store',
        'user:read'
      ],
      admin: [
        'customer:read', 'customer:write', 'customer:create', 'customer:delete',
        'order:read', 'order:write', 'order:create', 'order:cancel',
        'register:operate', 'register:approve',
        'inventory:read', 'inventory:write',
        'analytics:store', 'analytics:all',
        'user:read', 'user:write', 'user:create',
        'cost:read', 'sensitive:read'
      ]
    };

    return rolePermissions[role] || [];
  }

  private detectPlatform(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('ipad') || ua.includes('tablet')) return 'tablet';
    if (ua.includes('iphone') || ua.includes('android')) return 'mobile';
    return 'desktop';
  }
}