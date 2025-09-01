import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { authenticate } from '@/middleware/auth';
import { validateLoginRequest } from '@/middleware/validation';
import { rateLimiter } from '@/middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /auth/login
 * @desc ユーザーログイン
 * @access Public
 */
router.post(
  '/login',
  rateLimiter.loginAttempts,
  validateLoginRequest,
  authController.login.bind(authController)
);

/**
 * @route POST /auth/logout
 * @desc ユーザーログアウト
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

/**
 * @route POST /auth/refresh
 * @desc アクセストークンリフレッシュ
 * @access Public
 */
router.post(
  '/refresh',
  rateLimiter.tokenRefresh,
  authController.refresh.bind(authController)
);

/**
 * @route GET /auth/me
 * @desc 現在のユーザー情報取得
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  authController.me.bind(authController)
);

export default router;