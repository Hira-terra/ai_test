import { Pool } from 'pg';
import { UserRepository, UserModel } from '../models/user.model';
import { StoreRepository, StoreModel } from '../models/store.model';
import { SessionRepository, SessionModel } from '../models/session.model';
import { User, Store, UUID } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AuthRepository {
  private userRepo: UserRepository;
  private storeRepo: StoreRepository;
  private sessionRepo: SessionRepository;

  constructor(private db: Pool) {
    this.userRepo = new UserRepository();
    this.storeRepo = new StoreRepository(db);
    this.sessionRepo = new SessionRepository(db);
  }

  async findUserWithStore(userCode: string, storeCode: string): Promise<{
    user: UserModel;
    store: StoreModel;
  } | null> {
    const startTime = Date.now();
    logger.info(`[AUTH_REPO] ユーザー検索開始: ${userCode}@${storeCode}`);

    try {
      // ユーザーを検索
      const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
      if (!user) {
        logger.warn(`[AUTH_REPO] ユーザーが見つかりません: ${userCode}@${storeCode}`);
        return null;
      }

      // 店舗情報を取得
      const store = await this.storeRepo.findById(user.store_id);
      if (!store) {
        logger.error(`[AUTH_REPO] 店舗が見つかりません: storeId=${user.store_id}`);
        return null;
      }

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_REPO] ユーザー検索完了: ${userCode}@${storeCode} (${duration}ms)`);

      return { user, store };
    } catch (error) {
      logger.error(`[AUTH_REPO] ユーザー検索エラー: ${userCode}@${storeCode}`, error);
      throw error;
    }
  }

  async getUserById(userId: UUID): Promise<{
    user: UserModel;
    store: StoreModel;
  } | null> {
    const startTime = Date.now();
    logger.info(`[AUTH_REPO] ユーザーID検索開始: ${userId}`);

    try {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        logger.warn(`[AUTH_REPO] ユーザーが見つかりません: userId=${userId}`);
        return null;
      }

      const store = await this.storeRepo.findById(user.store_id);
      if (!store) {
        logger.error(`[AUTH_REPO] 店舗が見つかりません: storeId=${user.store_id}`);
        return null;
      }

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_REPO] ユーザーID検索完了: ${userId} (${duration}ms)`);

      return { user, store };
    } catch (error) {
      logger.error(`[AUTH_REPO] ユーザーID検索エラー: ${userId}`, error);
      throw error;
    }
  }

  async isAccountLocked(userCode: string, storeCode: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
      if (!user) {
        return false;
      }

      return await this.userRepo.isAccountLocked(user.id);
    } catch (error) {
      logger.error(`[AUTH_REPO] アカウントロック確認エラー: ${userCode}@${storeCode}`, error);
      throw error;
    }
  }

  async recordLoginAttempt(
    userCode: string,
    storeCode: string,
    ipAddress: string,
    userAgent: string | null,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const startTime = Date.now();
    logger.info(`[AUTH_REPO] ログイン試行記録: ${userCode}@${storeCode} - ${success ? '成功' : '失敗'}`);

    try {
      await this.sessionRepo.logLoginAttempt(
        userCode,
        storeCode,
        ipAddress,
        userAgent,
        success,
        failureReason
      );

      if (!success) {
        // 失敗時はユーザーの失敗回数を増やす
        const user = await this.userRepo.findByUserCodeAndStoreCode(userCode, storeCode);
        if (user) {
          const failedCount = await this.userRepo.incrementFailedLoginCount(user.id);
          logger.warn(`[AUTH_REPO] ログイン失敗回数: ${userCode}@${storeCode} - ${failedCount}回`);

          // 5回失敗でアカウントロック
          if (failedCount >= 5) {
            const lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30分後
            await this.userRepo.lockAccount(user.id, lockUntil);
            logger.warn(`[AUTH_REPO] アカウントロック: ${userCode}@${storeCode} - ${lockUntil.toISOString()}`);
          }
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_REPO] ログイン試行記録完了 (${duration}ms)`);
    } catch (error) {
      logger.error(`[AUTH_REPO] ログイン試行記録エラー: ${userCode}@${storeCode}`, error);
      throw error;
    }
  }

  async resetLoginAttempts(userId: UUID): Promise<void> {
    try {
      await this.userRepo.resetFailedLoginCount(userId);
      logger.info(`[AUTH_REPO] ログイン失敗回数リセット: userId=${userId}`);
    } catch (error) {
      logger.error(`[AUTH_REPO] ログイン失敗回数リセットエラー: userId=${userId}`, error);
      throw error;
    }
  }

  async updateLastLoginAt(userId: UUID): Promise<void> {
    try {
      await this.userRepo.updateLastLoginAt(userId);
      logger.info(`[AUTH_REPO] 最終ログイン時刻更新: userId=${userId}`);
    } catch (error) {
      logger.error(`[AUTH_REPO] 最終ログイン時刻更新エラー: userId=${userId}`, error);
      throw error;
    }
  }

  async createSession(
    userId: UUID,
    deviceInfo: any,
    ipAddress: string,
    userAgent: string,
    expiresIn: number
  ): Promise<SessionModel> {
    const startTime = Date.now();
    logger.info(`[AUTH_REPO] セッション作成開始: userId=${userId}`);

    try {
      const sessionId = uuidv4();
      const refreshTokenJti = uuidv4();
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      const session = await this.sessionRepo.createSession(
        userId,
        sessionId,
        refreshTokenJti,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt
      );

      // 古いセッションをクリーンアップ（最大3セッション）
      await this.sessionRepo.cleanupOldSessions(userId, 3);

      const duration = Date.now() - startTime;
      logger.info(`[AUTH_REPO] セッション作成完了: sessionId=${sessionId} (${duration}ms)`);

      return session;
    } catch (error) {
      logger.error(`[AUTH_REPO] セッション作成エラー: userId=${userId}`, error);
      throw error;
    }
  }

  async validateSession(sessionId: UUID): Promise<SessionModel | null> {
    try {
      const session = await this.sessionRepo.findActiveSession(sessionId);
      
      if (session) {
        // 最終活動時間を更新
        await this.sessionRepo.updateLastActivity(sessionId);
      }

      return session;
    } catch (error) {
      logger.error(`[AUTH_REPO] セッション検証エラー: sessionId=${sessionId}`, error);
      throw error;
    }
  }

  async revokeSession(sessionId: UUID): Promise<void> {
    try {
      await this.sessionRepo.revokeSession(sessionId);
      logger.info(`[AUTH_REPO] セッション無効化: sessionId=${sessionId}`);
    } catch (error) {
      logger.error(`[AUTH_REPO] セッション無効化エラー: sessionId=${sessionId}`, error);
      throw error;
    }
  }

  async revokeAllUserSessions(userId: UUID, exceptSessionId?: UUID): Promise<void> {
    try {
      await this.sessionRepo.revokeAllUserSessions(userId, exceptSessionId);
      logger.info(`[AUTH_REPO] 全セッション無効化: userId=${userId}`);
    } catch (error) {
      logger.error(`[AUTH_REPO] 全セッション無効化エラー: userId=${userId}`, error);
      throw error;
    }
  }

  async getAllStores(): Promise<StoreModel[]> {
    const startTime = Date.now();
    logger.info(`[AUTH_REPO] 全店舗取得開始`);

    try {
      const stores = await this.storeRepo.findAll();
      
      const duration = Date.now() - startTime;
      logger.info(`[AUTH_REPO] 全店舗取得完了: ${stores.length}店舗 (${duration}ms)`);

      return stores;
    } catch (error) {
      logger.error(`[AUTH_REPO] 全店舗取得エラー`, error);
      throw error;
    }
  }
}