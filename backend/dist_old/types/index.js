"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_ENDPOINTS = void 0;
exports.API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me'
    },
    CUSTOMERS: {
        BASE: '/customers',
        SEARCH: '/customers',
        DETAIL: (id) => `/customers/${id}`,
        CREATE: '/customers',
        UPDATE: (id) => `/customers/${id}`,
        DELETE: (id) => `/customers/${id}`,
        PRESCRIPTIONS: (customerId) => `/customers/${customerId}/prescriptions`,
        PRESCRIPTION_CREATE: (customerId) => `/customers/${customerId}/prescriptions`,
        PRESCRIPTION_UPDATE: (prescriptionId) => `/prescriptions/${prescriptionId}`,
        IMAGES: (customerId) => `/customers/${customerId}/images`,
        IMAGE_UPLOAD: (customerId) => `/customers/${customerId}/images`,
        IMAGE_DELETE: (customerId, imageId) => `/customers/${customerId}/images/${imageId}`,
        ANNOTATIONS: (customerId, imageId) => `/customers/${customerId}/images/${imageId}/annotations`,
        ANNOTATION_UPDATE: (customerId, imageId) => `/customers/${customerId}/images/${imageId}/annotations`,
        MEMOS: (customerId) => `/customers/${customerId}/memos`,
        MEMO_CREATE: (customerId) => `/customers/${customerId}/memos`,
        MEMO_UPDATE: (customerId, memoId) => `/customers/${customerId}/memos/${memoId}`,
        MEMO_DELETE: (customerId, memoId) => `/customers/${customerId}/memos/${memoId}`
    },
    ORDERS: {
        BASE: '/orders',
        LIST: '/orders',
        DETAIL: (id) => `/orders/${id}`,
        CREATE: '/orders',
        UPDATE: (id) => `/orders/${id}`,
        CANCEL: (id) => `/orders/${id}`,
        PAYMENTS: (orderId) => `/orders/${orderId}/payments`,
        PAYMENT_CREATE: (orderId) => `/orders/${orderId}/payments`
    },
    INVENTORY: {
        FRAMES: '/inventory/frames',
        FRAME_DETAIL: (serialNumber) => `/inventory/frames/${serialNumber}`,
        FRAME_UPDATE_STATUS: (serialNumber) => `/inventory/frames/${serialNumber}/status`,
        PRODUCTS: '/inventory/products',
        PRODUCT_STOCK_UPDATE: (id) => `/inventory/products/${id}/stock`
    },
    CASH_REGISTER: {
        STATUS: '/cash-register/status',
        OPEN: '/cash-register/open',
        CLOSE: '/cash-register/close',
        SALES_SUMMARY: '/cash-register/sales-summary',
        REPORT: (date) => `/cash-register/report/${date}`
    },
    PRODUCTS: {
        BASE: '/products',
        LIST: '/products',
        DETAIL: (id) => `/products/${id}`,
        CREATE: '/products',
        UPDATE: (id) => `/products/${id}`
    },
    STORES: {
        BASE: '/stores',
        LIST: '/stores',
        DETAIL: (id) => `/stores/${id}`
    },
    USERS: {
        BASE: '/users',
        LIST: '/users',
        CREATE: '/users',
        UPDATE: (id) => `/users/${id}`
    },
    ANALYTICS: {
        SALES: '/analytics/sales',
        CUSTOMERS: '/analytics/customers',
        INVENTORY: '/analytics/inventory'
    },
    UPLOAD: {
        IMAGE: '/upload/image'
    }
};
//# sourceMappingURL=index.js.map