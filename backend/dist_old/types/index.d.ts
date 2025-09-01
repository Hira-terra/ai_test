export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly LOGIN: "/auth/login";
        readonly LOGOUT: "/auth/logout";
        readonly REFRESH: "/auth/refresh";
        readonly ME: "/auth/me";
    };
    readonly CUSTOMERS: {
        readonly BASE: "/customers";
        readonly SEARCH: "/customers";
        readonly DETAIL: (id: string) => string;
        readonly CREATE: "/customers";
        readonly UPDATE: (id: string) => string;
        readonly DELETE: (id: string) => string;
        readonly PRESCRIPTIONS: (customerId: string) => string;
        readonly PRESCRIPTION_CREATE: (customerId: string) => string;
        readonly PRESCRIPTION_UPDATE: (prescriptionId: string) => string;
        readonly IMAGES: (customerId: string) => string;
        readonly IMAGE_UPLOAD: (customerId: string) => string;
        readonly IMAGE_DELETE: (customerId: string, imageId: string) => string;
        readonly ANNOTATIONS: (customerId: string, imageId: string) => string;
        readonly ANNOTATION_UPDATE: (customerId: string, imageId: string) => string;
        readonly MEMOS: (customerId: string) => string;
        readonly MEMO_CREATE: (customerId: string) => string;
        readonly MEMO_UPDATE: (customerId: string, memoId: string) => string;
        readonly MEMO_DELETE: (customerId: string, memoId: string) => string;
    };
    readonly ORDERS: {
        readonly BASE: "/orders";
        readonly LIST: "/orders";
        readonly DETAIL: (id: string) => string;
        readonly CREATE: "/orders";
        readonly UPDATE: (id: string) => string;
        readonly CANCEL: (id: string) => string;
        readonly PAYMENTS: (orderId: string) => string;
        readonly PAYMENT_CREATE: (orderId: string) => string;
    };
    readonly INVENTORY: {
        readonly FRAMES: "/inventory/frames";
        readonly FRAME_DETAIL: (serialNumber: string) => string;
        readonly FRAME_UPDATE_STATUS: (serialNumber: string) => string;
        readonly PRODUCTS: "/inventory/products";
        readonly PRODUCT_STOCK_UPDATE: (id: string) => string;
    };
    readonly CASH_REGISTER: {
        readonly STATUS: "/cash-register/status";
        readonly OPEN: "/cash-register/open";
        readonly CLOSE: "/cash-register/close";
        readonly SALES_SUMMARY: "/cash-register/sales-summary";
        readonly REPORT: (date: string) => string;
    };
    readonly PRODUCTS: {
        readonly BASE: "/products";
        readonly LIST: "/products";
        readonly DETAIL: (id: string) => string;
        readonly CREATE: "/products";
        readonly UPDATE: (id: string) => string;
    };
    readonly STORES: {
        readonly BASE: "/stores";
        readonly LIST: "/stores";
        readonly DETAIL: (id: string) => string;
    };
    readonly USERS: {
        readonly BASE: "/users";
        readonly LIST: "/users";
        readonly CREATE: "/users";
        readonly UPDATE: (id: string) => string;
    };
    readonly ANALYTICS: {
        readonly SALES: "/analytics/sales";
        readonly CUSTOMERS: "/analytics/customers";
        readonly INVENTORY: "/analytics/inventory";
    };
    readonly UPLOAD: {
        readonly IMAGE: "/upload/image";
    };
};
export type UUID = string;
export type DateString = string;
export type UserRole = 'staff' | 'manager' | 'admin';
export type Gender = 'male' | 'female' | 'other';
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        pagination?: PaginationInfo;
    };
}
export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface LoginRequest {
    user_code: string;
    password: string;
    store_code: string;
}
export interface LoginResponse {
    user: User;
    token: string;
    expiresIn: number;
}
export interface User {
    id: UUID;
    userCode: string;
    name: string;
    email?: string;
    role: UserRole;
    isActive: boolean;
    store: Store;
    lastLoginAt?: DateString;
}
export interface Store {
    id: UUID;
    storeCode: string;
    name: string;
    address: string;
    phone?: string;
    managerName?: string;
}
export interface Customer {
    id: UUID;
    customerCode: string;
    lastName: string;
    firstName: string;
    lastNameKana?: string;
    firstNameKana?: string;
    fullName: string;
    fullNameKana?: string;
    gender?: Gender;
    birthDate?: DateString;
    age?: number;
    phone?: string;
    mobile?: string;
    email?: string;
    postalCode?: string;
    address?: string;
    firstVisitDate?: DateString;
    lastVisitDate?: DateString;
    visitCount: number;
    totalPurchaseAmount: number;
    notes?: string;
    createdAt: DateString;
    updatedAt: DateString;
}
export interface CustomerSearchParams {
    search?: string;
    phone?: string;
    address?: string;
    ownStoreOnly?: boolean;
    page?: number;
    limit?: number;
    sort?: 'name' | 'kana' | 'last_visit_date';
}
export interface Prescription {
    id: UUID;
    customerId: UUID;
    measuredDate: DateString;
    rightEyeSphere?: number;
    rightEyeCylinder?: number;
    rightEyeAxis?: number;
    rightEyeVision?: number;
    leftEyeSphere?: number;
    leftEyeCylinder?: number;
    leftEyeAxis?: number;
    leftEyeVision?: number;
    pupilDistance?: number;
    notes?: string;
    createdBy: UUID;
    createdAt: DateString;
}
export interface CustomerImage {
    id: UUID;
    customerId: UUID;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    imageType: 'face' | 'glasses' | 'prescription' | 'other';
    title?: string;
    description?: string;
    capturedDate?: DateString;
    hasAnnotations?: boolean;
    uploadedBy: UUID;
    createdAt: DateString;
}
export interface ImageAnnotation {
    id: UUID;
    customerImageId: UUID;
    annotationData: FabricCanvasData;
    version: number;
    createdBy: UUID;
    updatedBy: UUID;
    createdAt: DateString;
    updatedAt: DateString;
}
export interface FabricCanvasData {
    version: string;
    objects: any[];
}
export interface CustomerMemo {
    id: UUID;
    customerId: UUID;
    memoText: string;
    memoType: 'handwritten' | 'text';
    createdBy: UUID;
    createdAt: DateString;
}
export interface Order {
    id: UUID;
    orderNumber: string;
    customerId: UUID;
    customer?: Customer;
    storeId: UUID;
    store?: Store;
    orderDate: DateString;
    deliveryDate?: DateString;
    status: OrderStatus;
    subtotalAmount: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    items: OrderItem[];
    payments?: Payment[];
    createdBy: UUID;
    createdAt: DateString;
    updatedAt: DateString;
}
export type OrderStatus = 'ordered' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash' | 'credit' | 'electronic' | 'receivable';
export interface OrderItem {
    id: UUID;
    orderId: UUID;
    productId: UUID;
    product?: Product;
    frameId?: UUID;
    frame?: Frame;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    prescriptionId?: UUID;
    prescription?: Prescription;
    notes?: string;
}
export interface Payment {
    id: UUID;
    orderId: UUID;
    paymentDate: DateString;
    paymentAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    createdBy: UUID;
    createdAt: DateString;
}
export interface Product {
    id: UUID;
    productCode: string;
    name: string;
    brand?: string;
    category: ProductCategory;
    managementType: ManagementType;
    costPrice?: number;
    retailPrice: number;
    supplier?: string;
    isActive: boolean;
    createdAt: DateString;
    updatedAt: DateString;
}
export type ProductCategory = 'frame' | 'lens' | 'contact' | 'accessory';
export type ManagementType = 'individual' | 'quantity';
export interface Frame {
    id: UUID;
    productId: UUID;
    product?: Product;
    storeId: UUID;
    store?: Store;
    serialNumber: string;
    color?: string;
    size?: string;
    purchaseDate: DateString;
    purchasePrice?: number;
    status: FrameStatus;
    location?: string;
    createdAt: DateString;
    updatedAt: DateString;
}
export type FrameStatus = 'in_stock' | 'reserved' | 'sold' | 'damaged' | 'transferred';
export interface StockItem {
    id: UUID;
    productId: UUID;
    product?: Product;
    storeId: UUID;
    store?: Store;
    currentStock: number;
    minStock: number;
    maxStock?: number;
    lastUpdated: DateString;
}
export interface CashRegister {
    id: UUID;
    storeId: UUID;
    businessDate: DateString;
    openingCash: number;
    carryOver: number;
    cashSales: number;
    creditSales: number;
    electronicSales: number;
    receivableCollection: number;
    expectedCash: number;
    actualCash?: number;
    difference?: number;
    differenceReason?: string;
    status: CashRegisterStatus;
    openedAt?: DateString;
    openedBy?: UUID;
    settledAt?: DateString;
    settledBy?: UUID;
    approvedBy?: UUID;
    createdAt: DateString;
    updatedAt: DateString;
}
export type CashRegisterStatus = 'closed' | 'opened' | 'settled';
export interface CashDenomination {
    denomination: number;
    count: number;
    amount: number;
}
export interface SalesSummary {
    businessDate: DateString;
    cashSales: number;
    creditSales: number;
    electronicSales: number;
    receivableCollection: number;
    totalSales: number;
    orderCount: number;
}
export interface NavigationItem {
    path: string;
    label: string;
    icon?: any;
    requiredPermissions?: string[];
    children?: NavigationItem[];
}
export interface TabPanelProps {
    children?: any;
    index: number;
    value: number;
}
export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea';
    required?: boolean;
    options?: {
        value: string;
        label: string;
    }[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
}
export interface AppError {
    code: string;
    message: string;
    details?: any;
    timestamp: DateString;
}
export type ErrorCode = 'NETWORK_ERROR' | 'AUTHENTICATION_FAILED' | 'AUTHORIZATION_FAILED' | 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR';
//# sourceMappingURL=index.d.ts.map