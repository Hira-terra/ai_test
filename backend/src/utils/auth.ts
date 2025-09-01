import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '@/config';
import { redis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { User, UUID } from '@/types';

export interface JwtPayload {
  userId: UUID;
  userCode: string;
  storeId: UUID;
  role: string;
  permissions?: string[];
  sessionId?: UUID;
  iat?: number;
  exp?: number;
  jti?: UUID;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthUtils {
  private static instance: AuthUtils;

  private constructor() {}

  public static getInstance(): AuthUtils {
    if (!AuthUtils.instance) {
      AuthUtils.instance = new AuthUtils();
    }
    return AuthUtils.instance;
  }

  public async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, config.security.bcryptRounds);
    } catch (error) {
      logger.error('パスワードハッシュ化エラー:', error);
      throw new Error('パスワードハッシュ化に失敗しました');
    }
  }

  public async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      logger.debug(`パスワード検証開始 - Password: "${password}", Hash: "${hashedPassword}"`);
      const result = await bcrypt.compare(password, hashedPassword);
      logger.debug(`パスワード検証結果: ${result}`);
      return result;
    } catch (error) {
      logger.error('パスワード検証エラー:', error);
      throw new Error('パスワード検証に失敗しました');
    }
  }

  public generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
    try {
      // TypeScriptの型エラー回避のため、optionsを個別に作成
      const accessTokenOptions: any = {
        expiresIn: config.jwt.expiresIn,
        issuer: 'glasses-store-api',
        audience: 'glasses-store-client',
      };

      const refreshTokenOptions: any = {
        expiresIn: config.jwt.refreshExpiresIn,
        issuer: 'glasses-store-api',
        audience: 'glasses-store-client',
      };

      const accessToken = jwt.sign(payload as object, config.jwt.secret, accessTokenOptions);
      const refreshToken = jwt.sign(payload as object, config.jwt.refreshSecret, refreshTokenOptions);

      const decoded = jwt.decode(accessToken) as JwtPayload;
      const expiresIn = decoded.exp! - decoded.iat!;

      return {
        accessToken,
        refreshToken,
        expiresIn,
      };
    } catch (error) {
      logger.error('トークン生成エラー:', error);
      throw new Error('トークン生成に失敗しました');
    }
  }

  public verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'glasses-store-api',
        audience: 'glasses-store-client',
      }) as JwtPayload;
    } catch (error) {
      logger.warn('アクセストークン検証失敗:', error);
      throw new Error('無効なトークンです');
    }
  }

  public verifyRefreshToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'glasses-store-api',
        audience: 'glasses-store-client',
      }) as JwtPayload;
    } catch (error) {
      logger.warn('リフレッシュトークン検証失敗:', error);
      throw new Error('無効なリフレッシュトークンです');
    }
  }

  public async storeRefreshToken(userId: UUID, refreshToken: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      const expirationSeconds = this.parseExpirationTime(config.jwt.refreshExpiresIn);
      await redis.set(key, refreshToken, expirationSeconds);
    } catch (error) {
      logger.error('リフレッシュトークン保存エラー:', error);
      throw new Error('リフレッシュトークンの保存に失敗しました');
    }
  }

  public async getStoredRefreshToken(userId: UUID): Promise<string | null> {
    try {
      const key = `refresh_token:${userId}`;
      return await redis.get(key);
    } catch (error) {
      logger.error('リフレッシュトークン取得エラー:', error);
      throw new Error('リフレッシュトークンの取得に失敗しました');
    }
  }

  public async revokeRefreshToken(userId: UUID): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      await redis.del(key);
    } catch (error) {
      logger.error('リフレッシュトークン無効化エラー:', error);
      throw new Error('リフレッシュトークンの無効化に失敗しました');
    }
  }

  public async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (decoded?.exp) {
        const key = `blacklist:${token}`;
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(key, '1', ttl);
        }
      }
    } catch (error) {
      logger.error('トークンブラックリスト登録エラー:', error);
      throw new Error('トークンの無効化に失敗しました');
    }
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `blacklist:${token}`;
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('トークンブラックリスト確認エラー:', error);
      return false;
    }
  }

  public async recordLoginAttempt(identifier: string): Promise<number> {
    try {
      const key = `login_attempts:${identifier}`;
      const attempts = await redis.incr(key);
      
      if (attempts === 1) {
        await redis.expire(key, Math.floor(config.security.lockoutTime / 1000));
      }
      
      return attempts;
    } catch (error) {
      logger.error('ログイン試行回数記録エラー:', error);
      throw new Error('ログイン試行回数の記録に失敗しました');
    }
  }

  public async getLoginAttempts(identifier: string): Promise<number> {
    try {
      const key = `login_attempts:${identifier}`;
      const attempts = await redis.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      logger.error('ログイン試行回数取得エラー:', error);
      return 0;
    }
  }

  public async resetLoginAttempts(identifier: string): Promise<void> {
    try {
      const key = `login_attempts:${identifier}`;
      await redis.del(key);
    } catch (error) {
      logger.error('ログイン試行回数リセットエラー:', error);
      throw new Error('ログイン試行回数のリセットに失敗しました');
    }
  }

  public async isAccountLocked(identifier: string): Promise<boolean> {
    try {
      const attempts = await this.getLoginAttempts(identifier);
      return attempts >= config.security.maxLoginAttempts;
    } catch (error) {
      logger.error('アカウントロック状態確認エラー:', error);
      return false;
    }
  }

  private parseExpirationTime(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`無効な有効期限形式: ${expiration}`);
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error(`未対応の時間単位: ${unit}`);
    }
  }

  public generateSecureCode(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public sanitizeUserData(user: any): User {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

export const authUtils = AuthUtils.getInstance();