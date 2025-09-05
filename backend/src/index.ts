import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';

import { config, isProduction } from './config';
import { db } from './config/database';
import { redis } from './utils/redis';
import { logger, morganStream } from './utils/logger';

// ルートのインポート
import authRoutes from './routes/auth.routes';
import storeRoutes from './routes/store.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import userRoutes from './routes/user.routes';
import purchaseOrderRoutes from './routes/purchaseOrder.routes';

// ミドルウェアのインポート
import { rateLimiter } from './middleware/rateLimiter';

class Application {
  private app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // セキュリティヘッダー
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS設定
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // レスポンス圧縮
    this.app.use(compression());

    // リクエストログ
    this.app.use(morgan(
      isProduction ? 'combined' : 'dev',
      { stream: morganStream }
    ));

    // JSON解析
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true
    }));

    // URL エンコード解析
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb'
    }));

    // 静的ファイル配信
    this.app.use('/uploads', express.static(
      path.join(__dirname, '../uploads'),
      {
        maxAge: isProduction ? '7d' : '0',
        etag: true,
        lastModified: true
      }
    ));

    // 静的ファイル提供（テスト用）
    this.app.use('/static', express.static(path.join(__dirname, '../public')));
    
    // モックアップファイル提供
    this.app.use('/mockups', express.static(path.join(__dirname, '../../mockups')));

    // API レート制限（全体）
    this.app.use('/api/', rateLimiter.apiRequests);

    // ヘルスチェック（レート制限適用外）
    // 注意: ヘルスチェックエンドポイントは initializeRoutes() で設定されます
  }

  private initializeRoutes(): void {
    // ルートエンドポイント
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: '眼鏡店顧客管理システム API サーバー',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          api: '/api',
          auth: '/api/auth',
          stores: '/api/stores',
          customers: '/api/customers',
          products: '/api/products',
          orders: '/api/orders',
          users: '/api/users',
          purchaseOrders: '/api/purchase-orders'
        }
      });
    });

    // ヘルスチェックエンドポイント
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealthy = await db.testConnection();
        const redisHealthy = redis.isReady();
        
        const health = {
          status: dbHealthy && redisHealthy ? 'OK' : 'ERROR',
          timestamp: new Date().toISOString(),
          services: {
            database: dbHealthy ? 'OK' : 'ERROR',
            redis: redisHealthy ? 'OK' : 'ERROR'
          }
        };

        res.status(health.status === 'OK' ? 200 : 503).json(health);
      } catch (error) {
        res.status(503).json({
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          error: 'ヘルスチェック失敗'
        });
      }
    });

    // APIルートのマウント
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/stores', storeRoutes);
    this.app.use('/api/customers', customerRoutes);
    this.app.use('/api/products', productRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/purchase-orders', purchaseOrderRoutes);

    // ルートが見つからない場合の処理
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'APIエンドポイントが見つかりません'
        }
      });
    });

    // 非APIリクエストの処理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'リソースが見つかりません'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 一般的なエラーハンドリング
    this.app.use((
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error('未処理エラー:', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (res.headersSent) {
        return next(error);
      }

      // プロダクション環境ではエラー詳細を隠蔽
      const statusCode = error.statusCode || 500;
      const message = isProduction && statusCode === 500
        ? 'サーバー内部エラーが発生しました'
        : error.message || 'サーバーエラーが発生しました';

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message,
          ...(isProduction ? {} : { details: error.stack })
        }
      });
    });

    // 未処理のPromise拒否
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('未処理のPromise拒否:', reason);
      // アプリケーションを適切にシャットダウン
      this.gracefulShutdown('unhandledRejection');
    });

    // 未処理の例外
    process.on('uncaughtException', (error: Error) => {
      logger.error('未処理の例外:', error);
      // アプリケーションを適切にシャットダウン
      this.gracefulShutdown('uncaughtException');
    });

    // シャットダウンシグナル
    process.on('SIGTERM', () => {
      logger.info('SIGTERM受信 - 適切なシャットダウンを開始します');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT受信 - 適切なシャットダウンを開始します');
      this.gracefulShutdown('SIGINT');
    });
  }

  private async healthCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      // データベース接続確認
      const dbHealthy = await db.testConnection();
      
      // Redis接続確認
      const redisHealthy = redis.isReady();

      const health = {
        status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
        services: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          redis: redisHealthy ? 'healthy' : 'unhealthy'
        }
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      logger.error('ヘルスチェックエラー:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'ヘルスチェックに失敗しました'
      });
    }
  }

  private gracefulShutdown(signal: string): void {
    logger.info(`${signal}によるシャットダウン開始`);

    // 新しいリクエストの受付を停止
    this.server?.close(async () => {
      logger.info('HTTPサーバーを停止しました');

      try {
        // データベース接続を閉じる
        await db.close();
        logger.info('データベース接続を閉じました');

        // Redis接続を閉じる
        await redis.disconnect();
        logger.info('Redis接続を閉じました');

        logger.info('適切にシャットダウンしました');
        process.exit(0);
      } catch (error) {
        logger.error('シャットダウン中にエラーが発生しました:', error);
        process.exit(1);
      }
    });

    // 15秒後に強制終了
    setTimeout(() => {
      logger.error('適切なシャットダウンがタイムアウトしました - 強制終了します');
      process.exit(1);
    }, 15000);
  }

  private server?: any;

  public async start(): Promise<void> {
    try {
      // Redis接続
      if (!redis.isReady()) {
        await redis.connect();
      }

      // データベース接続テスト
      const dbHealthy = await db.testConnection();
      if (!dbHealthy) {
        throw new Error('データベース接続に失敗しました');
      }

      // サーバー起動
      this.server = this.app.listen(config.port, config.host, () => {
        logger.info(`🚀 眼鏡店顧客管理システム API サーバーが起動しました`);
        logger.info(`📡 ポート: ${config.port}`);
        logger.info(`🌍 環境: ${config.env}`);
        logger.info(`🔗 URL: http://localhost:${config.port}`);
        
        if (!isProduction) {
          logger.info(`🏥 ヘルスチェック: http://localhost:${config.port}/health`);
          logger.info(`📋 API ベース: http://localhost:${config.port}/api`);
        }
      });

      // サーバーエラーハンドリング
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`ポート ${config.port} は既に使用されています`);
        } else {
          logger.error('サーバーエラー:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('アプリケーション起動エラー:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// アプリケーションのインスタンス化と起動
const application = new Application();

if (require.main === module) {
  application.start().catch((error) => {
    logger.error('アプリケーション起動に失敗しました:', error);
    process.exit(1);
  });
}

export default application.getApp();
export { application };