"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const store_controller_1 = require("../controllers/store.controller");
const router = (0, express_1.Router)();
const storeController = new store_controller_1.StoreController();
router.get('/', storeController.getStores.bind(storeController));
exports.default = router;
//# sourceMappingURL=store.routes.js.map