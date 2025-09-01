"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_validator_1 = require("../validators/auth.validator");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
router.post('/login', rateLimiter_1.rateLimiter.loginAttempts, auth_validator_1.AuthValidator.validateLogin, authController.login.bind(authController));
router.post('/logout', auth_1.authenticate, authController.logout.bind(authController));
router.post('/refresh', rateLimiter_1.rateLimiter.tokenRefresh, auth_validator_1.AuthValidator.validateRefreshToken, authController.refresh.bind(authController));
router.get('/me', auth_1.authenticate, authController.me.bind(authController));
exports.default = router;
//# sourceMappingURL=auth.routes.js.map