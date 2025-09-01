/**
 * ===== 型定義同期ルール =====
 *
 * 【基本原則】一方の/types/index.tsを更新したら、もう一方の/types/index.tsも必ず同じ内容に更新する
 *
 * 【変更の責任】
 * - 型定義を変更した開発者は、両方のファイルを即座に同期させる
 * - 1つのtypes/index.tsの更新は禁止。必ず1つを更新したらもう一つも更新その場で行う。
 *
 * 【絶対に守るべき原則】
 * 1. フロントエンドとバックエンドで異なる型を作らない
 * 2. 同じデータ構造に対して複数の型を作らない
 * 3. 新しいプロパティは必ずオプショナルとして追加
 * 4. APIパスは必ずこのファイルで一元管理する
 * 5. コード内でAPIパスをハードコードしない
 * 6. 2つの同期されたtypes/index.tsを単一の真実源とする
 * 7. 大規模リファクタリングの時は型変更を最初に行い早期に問題検出
 */

import * as React from 'react';

// =================================================================
// API エンドポイント定義
// =================================================================
export const API_ENDPOINTS = {
  // 認証関連
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me'
  },
  
  // 顧客管理
  CUSTOMERS: {
    BASE: '/customers',
    SEARCH: '/customers',
    DETAIL: (id: string) => `/customers/${id}`,
    CREATE: '/customers',
    UPDATE: (id: string) => `/customers/${id}`,
    DELETE: (id: string) => `/customers/${id}`,
    
    // 処方箋
    PRESCRIPTIONS: (customerId: string) => `/customers/${customerId}/prescriptions`,
    PRESCRIPTION_CREATE: (customerId: string) => `/customers/${customerId}/prescriptions`,
    PRESCRIPTION_UPDATE: (prescriptionId: string) => `/prescriptions/${prescriptionId}`,
    
    // 画像管理
    IMAGES: (customerId: string) => `/customers/${customerId}/images`,
    IMAGE_UPLOAD: (customerId: string) => `/customers/${customerId}/images`,
    IMAGE_DELETE: (customerId: string, imageId: string) => `/customers/${customerId}/images/${imageId}`,
    
    // 画像注釈
    ANNOTATIONS: (customerId: string, imageId: string) => `/customers/${customerId}/images/${imageId}/annotations`,
    ANNOTATION_UPDATE: (customerId: string, imageId: string) => `/customers/${customerId}/images/${imageId}/annotations`,
    
    // メモ
    MEMOS: (customerId: string) => `/customers/${customerId}/memos`,
    MEMO_CREATE: (customerId: string) => `/customers/${customerId}/memos`,
    MEMO_UPDATE: (customerId: string, memoId: string) => `/customers/${customerId}/memos/${memoId}`,
    MEMO_DELETE: (customerId: string, memoId: string) => `/customers/${customerId}/memos/${memoId}`
  },
  
  // 受注管理
  ORDERS: {
    BASE: '/orders',
    LIST: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    CREATE: '/orders',
    UPDATE: (id: string) => `/orders/${id}`,
    CANCEL: (id: string) => `/orders/${id}`,
    
    // 入金管理
    PAYMENTS: (orderId: string) => `/orders/${orderId}/payments`,
    PAYMENT_CREATE: (orderId: string) => `/orders/${orderId}/payments`
  },
  
  // 在庫管理
  INVENTORY: {
    FRAMES: '/inventory/frames',
    FRAME_DETAIL: (serialNumber: string) => `/inventory/frames/${serialNumber}`,
    FRAME_UPDATE_STATUS: (serialNumber: string) => `/inventory/frames/${serialNumber}/status`,
    PRODUCTS: '/inventory/products',
    PRODUCT_STOCK_UPDATE: (id: string) => `/inventory/products/${id}/stock`
  },
  
  // レジ精算
  CASH_REGISTER: {
    STATUS: '/cash-register/status',
    OPEN: '/cash-register/open',
    CLOSE: '/cash-register/close',
    SALES_SUMMARY: '/cash-register/sales-summary',
    REPORT: (date: string) => `/cash-register/report/${date}`
  },
  
  // 商品マスタ
  PRODUCTS: {
    BASE: '/products',
    LIST: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`
  },
  
  // 店舗管理
  STORES: {
    BASE: '/stores',
    LIST: '/stores',
    DETAIL: (id: string) => `/stores/${id}`
  },
  
  // ユーザー管理
  USERS: {
    BASE: '/users',
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`
  },
  
  // 分析・レポート
  ANALYTICS: {
    SALES: '/analytics/sales',
    CUSTOMERS: '/analytics/customers',
    INVENTORY: '/analytics/inventory'
  },
  
  // ファイルアップロード
  UPLOAD: {
    IMAGE: '/upload/image'
  }
} as const;

// =================================================================
// 基本型定義
// =================================================================

// 共通型
export type UUID = string;
export type DateString = string; // ISO 8601 format
export type UserRole = 'staff' | 'manager' | 'admin';
export type Gender = 'male' | 'female' | 'other';

// API レスポンス共通型
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

// =================================================================
// 認証関連型
// =================================================================
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

// =================================================================
// 店舗関連型
// =================================================================
export interface Store {
  id: UUID;
  storeCode: string;
  name: string;
  address: string;
  phone?: string;
  managerName?: string;
}

// =================================================================
// 顧客関連型
// =================================================================
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
  registeredStoreId?: UUID;
  registeredStore?: Store; // 登録店舗情報
  createdAt: DateString;
  updatedAt: DateString;
}

// 顧客作成リクエスト型（サーバー自動生成フィールドを除外）
export interface CreateCustomerRequest {
  lastName: string;
  firstName: string;
  fullName: string;
  lastNameKana?: string;
  firstNameKana?: string;
  fullNameKana?: string;
  gender?: Gender;
  birthDate?: DateString;
  phone?: string;
  mobile?: string;
  email?: string;
  postalCode?: string;
  address?: string;
  notes?: string;
  registeredStoreId?: UUID;
}

export interface CustomerSearchParams {
  search?: string;
  phone?: string;
  address?: string;
  ownStoreOnly?: boolean;
  page?: number;
  limit?: number;
  sort?: string; // 柔軟なソート形式をサポート（例: 'fullName_asc', 'visitCount_desc'）
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

// =================================================================
// 受注関連型
// =================================================================
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

// =================================================================
// 商品・在庫関連型
// =================================================================
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

export type ProductCategory = 'frame' | 'lens' | 'contact' | 'accessory' | 'hearing_aid';
export type ManagementType = 'individual' | 'quantity' | 'stock';

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

// =================================================================
// レジ精算関連型
// =================================================================
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

// =================================================================
// UI関連型
// =================================================================
export interface NavigationItem {
  path: string;
  label: string;
  icon?: React.ComponentType<any>;
  requiredPermissions?: string[];
  children?: NavigationItem[];
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// =================================================================
// エラーハンドリング
// =================================================================
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: DateString;
}

export type ErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_FAILED' 
  | 'AUTHORIZATION_FAILED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';