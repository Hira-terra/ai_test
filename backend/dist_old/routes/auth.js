"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("@/controllers/AuthController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
router.post('/login', rateLimiter_1.rateLimiter.loginAttempts, validation_1.validateLoginRequest, authController.login.bind(authController));
router.post('/logout', auth_1.authenticate, authController.logout.bind(authController));
router.post('/refresh', rateLimiter_1.rateLimiter.tokenRefresh, authController.refresh.bind(authController));
router.get('/me', auth_1.authenticate, authController.me.bind(authController));
exports.default = router;
//# sourceMappingURL=auth.js.map