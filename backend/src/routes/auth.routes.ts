import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthValidator } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const authController = new AuthController();

/**
 * @route POST /api/auth/login
 * @desc ユーザーログイン
 * @access Public
 */
router.post(
  '/login',
  rateLimiter.loginAttempts,
  AuthValidator.validateLogin,
  authController.login.bind(authController)
);

/**
 * @route POST /api/auth/logout
 * @desc ユーザーログアウト
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout.bind(authController)
);

/**
 * @route POST /api/auth/refresh
 * @desc アクセストークンリフレッシュ
 * @access Public
 */
router.post(
  '/refresh',
  rateLimiter.tokenRefresh,
  AuthValidator.validateRefreshToken,
  authController.refresh.bind(authController)
);

/**
 * @route GET /api/auth/me
 * @desc 現在のユーザー情報取得
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  authController.me.bind(authController)
);

export default router;