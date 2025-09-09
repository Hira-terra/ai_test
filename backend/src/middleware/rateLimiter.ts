import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { redis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { config } from '@/config';

/**
 * レート制限ミドルウェア設定
 */
class RateLimiter {
  private loginLimiter: RateLimiterRedis | RateLimiterMemory;
  private apiLimiter: RateLimiterRedis | RateLimiterMemory;
  private refreshLimiter: RateLimiterRedis | RateLimiterMemory;
  private uploadLimiter: RateLimiterRedis | RateLimiterMemory;

  constructor() {
    const useRedis = redis.isReady();
    
    // ログイン試行制限（開発環境: 5分間に10回、本番環境: 15分間に5回まで）
    const isDevelopment = config.env === 'development';
    this.loginLimiter = useRedis
      ? new RateLimiterRedis({
          storeClient: redis as any,
          keyPrefix: 'login_limit',
          points: isDevelopment ? 10 : 5, // 試行回数
          duration: isDevelopment ? 300 : 900, // 開発環境: 5分、本番環境: 15分（秒）
          blockDuration: isDevelopment ? 300 : 900, // ブロック時間（秒）
        })
      : new RateLimiterMemory({
          keyPrefix: 'login_limit',
          points: isDevelopment ? 10 : 5,
          duration: isDevelopment ? 300 : 900,
          blockDuration: isDevelopment ? 300 : 900,
        });

    // 一般API制限（開発環境: 5分間に1000回, 本番: 15分間に100回）
    this.apiLimiter = useRedis
      ? new RateLimiterRedis({
          storeClient: redis as any,
          keyPrefix: 'api_limit',
          points: isDevelopment ? 1000 : 100,
          duration: isDevelopment ? 300 : 900,
          blockDuration: isDevelopment ? 10 : 60,
        })
      : new RateLimiterMemory({
          keyPrefix: 'api_limit',
          points: isDevelopment ? 1000 : 100,
          duration: isDevelopment ? 300 : 900,
          blockDuration: isDevelopment ? 10 : 60,
        });

    // トークンリフレッシュ制限（1時間に10回まで）
    this.refreshLimiter = useRedis
      ? new RateLimiterRedis({
          storeClient: redis as any,
          keyPrefix: 'refresh_limit',
          points: 10,
          duration: 3600,
          blockDuration: 3600,
        })
      : new RateLimiterMemory({
          keyPrefix: 'refresh_limit',
          points: 10,
          duration: 3600,
          blockDuration: 3600,
        });

    // ファイルアップロード制限（1時間に20回まで）
    this.uploadLimiter = useRedis
      ? new RateLimiterRedis({
          storeClient: redis as any,
          keyPrefix: 'upload_limit',
          points: 20,
          duration: 3600,
          blockDuration: 300, // 5分ブロック
        })
      : new RateLimiterMemory({
          keyPrefix: 'upload_limit',
          points: 20,
          duration: 3600,
          blockDuration: 300,
        });
  }

  /**
   * レート制限チェック用ヘルパー
   */
  private async checkRateLimit(
    limiter: RateLimiterRedis | RateLimiterMemory,
    key: string,
    req: Request,
    res: Response,
    next: NextFunction,
    limitType: string
  ): Promise<void> {
    try {
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      if (rateLimiterRes instanceof RateLimiterRes) {
        const remainingPoints = rateLimiterRes.remainingPoints;
        const msBeforeNext = rateLimiterRes.msBeforeNext;
        // const totalHits = rateLimiterRes.totalHits;

        logger.warn(`レート制限に達しました: ${limitType}`, {
          key,
          remainingPoints,
          msBeforeNext,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'リクエスト回数の制限に達しました。しばらく待ってから再試行してください。',
            details: {
              retryAfter: Math.round(msBeforeNext / 1000),
              remainingPoints
            }
          }
        });
      } else {
        logger.error('レート制限チェックエラー:', rateLimiterRes);
        next(); // エラー時は通す
      }
    }
  }

  /**
   * ログイン試行制限
   */
  public loginAttempts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${req.ip}_${req.body.user_code || 'unknown'}_${req.body.store_code || 'unknown'}`;
    await this.checkRateLimit(this.loginLimiter, key, req, res, next, 'login');
  };

  /**
   * 一般API制限
   */
  public apiRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip || 'unknown';
    await this.checkRateLimit(this.apiLimiter, key, req, res, next, 'api');
  };

  /**
   * トークンリフレッシュ制限
   */
  public tokenRefresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip || 'unknown';
    await this.checkRateLimit(this.refreshLimiter, key, req, res, next, 'refresh');
  };

  /**
   * ファイルアップロード制限
   */
  public fileUpload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.ip || 'unknown';
    await this.checkRateLimit(this.uploadLimiter, key, req, res, next, 'upload');
  };

  /**
   * ユーザー認証後の制限（認証済みユーザーには緩い制限）
   */
  public authenticatedRequests = async (req: any, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      // 未認証の場合は一般API制限を適用
      return this.apiRequests(req, res, next);
    }

    // 認証済みユーザーには緩い制限を適用（15分間に500回）
    const authenticatedLimiter = new RateLimiterMemory({
      keyPrefix: 'auth_api_limit',
      points: 500,
      duration: 900,
      blockDuration: 60,
    });

    const key = req.user.userId;
    await this.checkRateLimit(authenticatedLimiter, key, req, res, next, 'authenticated_api');
  };
}

export const rateLimiter = new RateLimiter();

/**
 * カスタムレート制限ミドルウェア作成関数
 */
export const createRateLimiter = (options: {
  points: number;
  duration: number;
  blockDuration?: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  const useRedis = redis.isReady();
  
  const limiter = useRedis
    ? new RateLimiterRedis({
        storeClient: redis as any,
        keyPrefix: 'custom_limit',
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration,
      })
    : new RateLimiterMemory({
        keyPrefix: 'custom_limit',
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration,
      });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = options.keyGenerator ? options.keyGenerator(req) : req.ip || 'unknown';
    
    try {
      await limiter.consume(key);
      next();
    } catch (rateLimiterRes: any) {
      if (rateLimiterRes instanceof RateLimiterRes) {
        const msBeforeNext = rateLimiterRes.msBeforeNext;

        logger.warn('カスタムレート制限に達しました', {
          key,
          remainingPoints: rateLimiterRes.remainingPoints,
          msBeforeNext,
          ip: req.ip
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'リクエスト回数の制限に達しました',
            details: {
              retryAfter: Math.round(msBeforeNext / 1000)
            }
          }
        });
      } else {
        next();
      }
    }
  };
};