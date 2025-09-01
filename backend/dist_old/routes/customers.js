"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const CustomerController_1 = require("@/controllers/CustomerController");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const rateLimiter_1 = require("@/middleware/rateLimiter");
const router = (0, express_1.Router)();
const customerController = new CustomerController_1.CustomerController();
router.get('/', rateLimiter_1.rateLimiter.authenticatedRequests, auth_1.authenticate, validation_1.validateCustomerSearch, customerController.getCustomers.bind(customerController));
router.get('/:id', auth_1.authenticate, validation_1.validateCustomerId, customerController.getCustomer.bind(customerController));
router.post('/', rateLimiter_1.rateLimiter.authenticatedRequests, auth_1.authenticate, (0, auth_1.authorize)(['staff', 'manager', 'admin']), validation_1.validateCustomerCreate, customerController.createCustomer.bind(customerController));
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)(['staff', 'manager', 'admin']), validation_1.validateCustomerUpdate, customerController.updateCustomer.bind(customerController));
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)(['admin']), validation_1.validateCustomerId, customerController.deleteCustomer.bind(customerController));
exports.default = router;
//# sourceMappingURL=customers.js.map