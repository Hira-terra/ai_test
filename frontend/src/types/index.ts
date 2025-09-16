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
    PAYMENT_CREATE: (orderId: string) => `/orders/${orderId}/payments`,
    
    // 値引き管理
    DISCOUNTS: (orderId: string) => `/orders/${orderId}/discounts`,
    DISCOUNT_APPLY: (orderId: string) => `/orders/${orderId}/discounts`,
    DISCOUNT_REMOVE: (orderId: string, discountId: string) => `/orders/${orderId}/discounts/${discountId}`,
    DISCOUNT_CALCULATE: (orderId: string) => `/orders/${orderId}/discounts/calculate`
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
  },
  
  // 発注管理
  PURCHASE_ORDERS: {
    BASE: '/purchase-orders',
    LIST: '/purchase-orders',
    DETAIL: (id: string) => `/purchase-orders/${id}`,
    CREATE: '/purchase-orders',
    CREATE_ORDER_BASED: '/purchase-orders/order-based', // 受注発注作成
    CREATE_STOCK_REPLENISHMENT: '/purchase-orders/stock-replenishment', // 在庫発注作成
    UPDATE: (id: string) => `/purchase-orders/${id}`,
    SEND: (id: string) => `/purchase-orders/${id}/send`,
    CONFIRM: (id: string) => `/purchase-orders/${id}/confirm`,
    CANCEL: (id: string) => `/purchase-orders/${id}/cancel`,
    HISTORY: '/purchase-orders/history',
    
    // 発注可能受注取得
    AVAILABLE_ORDERS: '/purchase-orders/available-orders',
    
    // 在庫発注用
    STOCK_LEVELS: '/purchase-orders/stock-levels',
    STOCK_ALERTS: '/purchase-orders/stock-alerts',
    SUGGESTED_ORDERS: '/purchase-orders/suggested-orders', // 自動発注提案
    
    // 仕入先管理
    SUPPLIERS: '/purchase-orders/suppliers'
  },
  
  // 入庫管理
  RECEIVING: {
    BASE: '/receiving',
    LIST: '/receiving',
    DETAIL: (id: string) => `/receiving/${id}`,
    CREATE: '/receiving',
    UPDATE: (id: string) => `/receiving/${id}`,
    COMPLETE: (id: string) => `/receiving/${id}/complete`,
    
    // 入荷予定
    EXPECTED: '/receiving/expected',
    
    // 品質チェック
    QUALITY_CHECK: (id: string) => `/receiving/${id}/quality-check`
  },

  // 製作進捗管理
  PRODUCTION: {
    BASE: '/production',
    LIST: '/production',
    DETAIL: (id: string) => `/production/${id}`,
    CREATE: '/production',
    UPDATE: (id: string) => `/production/${id}`,
    DELETE: (id: string) => `/production/${id}`,
    
    // ステータス更新
    UPDATE_STATUS: (id: string) => `/production/${id}/status`,
    UPDATE_STEP: (id: string) => `/production/${id}/step`,
    
    // 担当者割り当て
    ASSIGN_TECHNICIAN: (id: string) => `/production/${id}/assign`,
    
    // 工程履歴
    STEP_HISTORY: (id: string) => `/production/${id}/history`,
    ADD_STEP_HISTORY: (id: string) => `/production/${id}/history`,
    
    // 品質検査
    QUALITY_CHECK: (id: string) => `/production/${id}/quality-check`,
    
    // 進捗統計
    STATISTICS: '/production/statistics',
    TECHNICIAN_WORKLOAD: '/production/technician-workload'
  },

  // お渡し・決済管理
  DELIVERY: {
    BASE: '/delivery',
    LIST: '/delivery',
    DETAIL: (id: string) => `/delivery/${id}`,
    CREATE: '/delivery',
    UPDATE: (id: string) => `/delivery/${id}`,
    DELETE: (id: string) => `/delivery/${id}`,
    
    // ステータス更新
    UPDATE_STATUS: (id: string) => `/delivery/${id}/status`,
    
    // お渡し処理
    DELIVER: (id: string) => `/delivery/${id}/deliver`,
    SCHEDULE: (id: string) => `/delivery/${id}/schedule`,
    
    // 決済処理
    PAYMENT: (id: string) => `/delivery/${id}/payment`,
    PAYMENT_RECORDS: (id: string) => `/delivery/${id}/payments`,
    
    // 領収書
    RECEIPT: (id: string) => `/delivery/${id}/receipt`,
    
    // お渡し統計
    STATISTICS: '/delivery/statistics'
  },

  // 値引きマスタ管理
  DISCOUNTS: {
    BASE: '/discounts',
    
    // ===== 値引きマスタ管理API =====
    MASTER: {
      LIST: '/discounts/master',
      DETAIL: (id: string) => `/discounts/master/${id}`,
      CREATE: '/discounts/master',
      UPDATE: (id: string) => `/discounts/master/${id}`,
      DELETE: (id: string) => `/discounts/master/${id}`,
    },
    
    // ===== 受注値引きAPI（既存） =====
    LIST: '/discounts',  // 有効な値引き一覧
    DETAIL: (id: string) => `/discounts/${id}`,
    CREATE: '/discounts',
    UPDATE: (id: string) => `/discounts/${id}`,
    DELETE: (id: string) => `/discounts/${id}`,
    
    // 利用可能値引き取得（条件フィルタ）
    AVAILABLE: '/discounts/available',
    
    // 値引き使用履歴
    USAGE_HISTORY: (id: string) => `/discounts/${id}/usage-history`,
    
    // 値引き計算テスト
    CALCULATE_TEST: '/discounts/calculate-test'
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

export interface CreateUserRequest {
  userCode: string;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  storeId: string;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserSearchParams {
  storeId?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
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
  isActive?: boolean;
  createdAt?: DateString;
  updatedAt?: DateString;
}

export interface CreateStoreRequest {
  storeCode: string;
  name: string;
  address: string;
  phone?: string;
  managerName?: string;
  isActive?: boolean;
}

export interface UpdateStoreRequest {
  storeCode?: string;
  name?: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isActive?: boolean;
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
  discountAmount: number;        // 値引き総額
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: OrderItem[];
  discounts?: OrderDiscount[];   // 適用済み値引き一覧
  payments?: Payment[];
  createdBy: UUID;
  createdByUser?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

// 実際の業務フローに合わせた拡張ステータス
export type OrderStatus = 
  | 'ordered'           // 受注済み
  | 'prescription_done' // 処方箋作成完了
  | 'purchase_ordered'  // レンズ発注済み
  | 'lens_received'     // レンズ入庫済み
  | 'in_production'     // 製作中
  | 'ready'            // 完成・お渡し準備完了
  | 'delivered'        // お渡し完了
  | 'cancelled';       // キャンセル

export type PaymentMethod = 'cash' | 'credit' | 'electronic' | 'receivable';

// 支払タイミングの追加
export type PaymentTiming = 'order_time' | 'delivery_time';

// 製作進捗管理関連型定義
export type ProductionStatus = 
  | 'waiting'           // 製作待ち
  | 'lens_processing'   // レンズ加工中
  | 'frame_assembly'    // フレーム組み立て中
  | 'quality_check'     // 品質検査中
  | 'packaging'         // 包装中
  | 'completed'         // 製作完了
  | 'on_hold'          // 製作保留
  | 'rework_required';  // 再作業要

export type ProductionStep = 
  | 'lens_cutting'      // レンズカット
  | 'lens_grinding'     // レンズ研磨
  | 'lens_coating'      // コーティング
  | 'frame_adjustment'  // フレーム調整
  | 'assembly'          // 組み立て
  | 'final_check'       // 最終検査
  | 'cleaning'          // クリーニング
  | 'packaging';        // 梱包

export interface ProductionOrder {
  id: UUID;
  orderId: UUID;
  order?: Order;
  productionNumber: string;  // 製作番号
  status: ProductionStatus;
  currentStep: ProductionStep;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  startedAt?: DateString;
  expectedCompletionDate: DateString;
  actualCompletionDate?: DateString;
  assignedTechnician?: UUID;
  assignedTechnicianName?: string;
  notes?: string;
  qualityCheckResult?: 'passed' | 'failed' | 'pending';
  steps: ProductionStep[];
  createdAt: DateString;
  updatedAt: DateString;
}

export interface ProductionStepHistory {
  id: UUID;
  productionOrderId: UUID;
  step: ProductionStep;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  startedAt: DateString;
  completedAt?: DateString;
  technicianId: UUID;
  technicianName: string;
  notes?: string;
  qualityScore?: number;  // 1-5点での品質評価
  defects?: string[];     // 不具合項目
  reworkReason?: string;  // 再作業理由
}

export interface ProductionSearchParams {
  storeId?: string;
  status?: ProductionStatus;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  assignedTechnician?: string;
  fromDate?: string;
  toDate?: string;
  customerName?: string;
  productionNumber?: string;
}

// お渡し・決済管理関連型定義
export type DeliveryStatus = 
  | 'ready'             // お渡し準備完了
  | 'scheduled'         // お渡し予定
  | 'delivered'         // お渡し完了
  | 'partial_delivery'  // 一部お渡し
  | 'cancelled'         // お渡しキャンセル
  | 'returned';         // 返品

export interface DeliveryOrder {
  id: UUID;
  orderId: UUID;
  order?: Order;
  deliveryNumber: string;  // お渡し番号
  status: DeliveryStatus;
  scheduledDate?: DateString;
  actualDeliveryDate?: DateString;
  deliveredBy?: UUID;
  deliveredByName?: string;
  customerNotified: boolean;
  deliveryMethod: 'store_pickup' | 'home_delivery' | 'mail';
  deliveryAddress?: {
    zipCode?: string;
    prefecture?: string;
    city?: string;
    address1?: string;
    address2?: string;
  };
  notes?: string;
  qualityCheckPassed: boolean;
  finalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: PaymentMethod;
  paymentDate?: DateString;
  receiptIssued: boolean;
  warrantyPeriod: number; // 保証期間（月数）
  warrantyStartDate?: DateString;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface DeliveryItem {
  id: UUID;
  deliveryOrderId: UUID;
  orderItemId: UUID;
  orderItem?: OrderItem;
  deliveredQuantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumber?: string; // 個体管理の場合
  qualityCheckNotes?: string;
}

export interface PaymentRecord {
  id: UUID;
  deliveryOrderId: UUID;
  paymentDate: DateString;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentTiming: PaymentTiming;
  receiptNumber?: string;
  notes?: string;
  processedBy: UUID;
  processedByName?: string;
  createdAt: DateString;
}

export interface DeliverySearchParams {
  storeId?: string;
  status?: DeliveryStatus;
  paymentStatus?: 'unpaid' | 'partial' | 'paid' | 'refunded';
  deliveryMethod?: 'store_pickup' | 'home_delivery' | 'mail';
  fromDate?: string;
  toDate?: string;
  customerName?: string;
  deliveryNumber?: string;
}

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  productId: UUID;
  product?: Product;
  frameId?: UUID;
  frame?: Frame;
  quantity: number;
  unitPrice: number;
  discountAmount: number;      // 個別値引き額
  totalPrice: number;          // 値引き後価格
  prescriptionId?: UUID;
  prescription?: Prescription;
  discounts?: OrderDiscount[]; // 個別適用値引き
  notes?: string;
}

export interface Payment {
  id: UUID;
  orderId: UUID;
  paymentDate: DateString;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  paymentTiming: PaymentTiming; // 受注時 or お渡し時
  notes?: string;
  createdBy: UUID;
  createdAt: DateString;
}

// =================================================================
// 値引き管理関連型
// =================================================================

export type DiscountType = 'percentage' | 'amount' | 'special';
export type DiscountTarget = 'order' | 'item';

export interface Discount {
  id: UUID;
  discountCode: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  applicableTo: DiscountTarget;
  productCategoryFilter?: string[];
  customerTypeFilter?: string[];
  validFrom?: DateString;
  validTo?: DateString;
  requiresManagerApproval: boolean;
  maxUsesPerCustomer?: number;
  maxUsesTotal?: number;
  currentUses: number;
  isActive: boolean;
  displayOrder: number;
  createdBy: UUID;
  createdByUser?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface OrderDiscount {
  id: UUID;
  orderId: UUID;
  discountId: UUID;
  discount?: Discount;
  orderItemId?: UUID; // NULL=受注全体, 値あり=明細個別
  orderItem?: OrderItem;
  
  // 適用時のスナップショット
  discountCode: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  
  // 適用結果
  originalAmount: number;
  discountAmount: number;
  discountedAmount: number;
  
  // 承認情報
  approvedBy?: UUID;
  approvedByUser?: User;
  approvedAt?: DateString;
  
  // 適用理由・メモ
  notes?: string;
  
  createdAt: DateString;
}

export interface DiscountSearchParams {
  type?: DiscountType;
  isActive?: boolean;
  validOnly?: boolean; // 現在有効なもののみ
  applicableTo?: DiscountTarget;
  minOrderAmount?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ApplyDiscountRequest {
  orderId: UUID;
  discountId: UUID;
  orderItemId?: UUID; // 明細個別適用時
  approvalReason?: string; // 承認が必要な場合
}

export interface DiscountCalculationResult {
  discountId: UUID;
  discountCode: string;
  discountName: string;
  discountType: DiscountType;
  discountValue: number;
  originalAmount: number;
  discountAmount: number;
  discountedAmount: number;
  requiresApproval: boolean;
  errorMessage?: string;
}

// =================================================================
// 発注管理関連型
// =================================================================

export interface Supplier {
  id: UUID;
  supplierCode: string;
  name: string;
  contactInfo?: string;
  orderMethod: 'edi' | 'csv' | 'fax' | 'email'; // 発注方式
  isActive: boolean;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface PurchaseOrder {
  id: UUID;
  purchaseOrderNumber: string;
  supplierId: UUID;
  supplier?: Supplier;
  storeId: UUID;
  store?: Store;
  orderDate: DateString;
  expectedDeliveryDate?: DateString;
  actualDeliveryDate?: DateString;
  status: PurchaseOrderStatus;
  type: PurchaseOrderType; // 発注種別：受注発注 or 在庫発注
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  items: PurchaseOrderItem[];
  notes?: string;
  sentAt?: DateString; // 発注送信日時
  confirmedAt?: DateString; // メーカー確認日時
  createdBy: UUID;
  createdByUser?: User;
  createdAt: DateString;
  updatedAt: DateString;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_delivered' | 'delivered' | 'cancelled';

export type PurchaseOrderType = 'order_based' | 'stock_replenishment'; // 受注発注 | 在庫発注

export interface PurchaseOrderItem {
  id: UUID;
  purchaseOrderId: UUID;
  orderId?: UUID; // 元受注ID（在庫発注の場合はnull）
  order?: Order;
  productId: UUID;
  product?: Product;
  prescriptionId?: UUID;
  prescription?: Prescription;
  quantity: number;
  unitCost: number;
  totalCost: number;
  specifications?: string; // 度数等の仕様詳細
  notes?: string;
  targetStockLevel?: number; // 目標在庫数（在庫発注の場合のみ）
  currentStockLevel?: number; // 現在在庫数（在庫発注の場合のみ）
}

export interface CreatePurchaseOrderRequest {
  supplierId: UUID;
  type: PurchaseOrderType;
  expectedDeliveryDate?: DateString;
  orderIds?: UUID[]; // 対象受注ID群（受注発注の場合）
  stockItems?: CreateStockPurchaseOrderItem[]; // 在庫発注商品（在庫発注の場合）
  notes?: string;
}

export interface CreateStockPurchaseOrderItem {
  productId: UUID;
  quantity: number;
  unitCost?: number; // 指定しない場合は商品マスタのcostPriceを使用
  targetStockLevel?: number;
  currentStockLevel?: number;
  notes?: string;
}

export interface PurchaseOrderSearchParams {
  supplierId?: UUID;
  status?: PurchaseOrderStatus;
  type?: PurchaseOrderType; // 発注種別によるフィルタ
  orderDateFrom?: DateString;
  orderDateTo?: DateString;
  expectedDeliveryFrom?: DateString;
  expectedDeliveryTo?: DateString;
  page?: number;
  limit?: number;
  sort?: string;
}

// 在庫レベル管理用の型
export interface StockLevel {
  id: UUID;
  productId: UUID;
  product?: Product;
  storeId: UUID;
  store?: Store;
  currentQuantity: number;
  safetyStock: number; // 安全在庫数
  maxStock: number; // 最大在庫数
  lastOrderQuantity?: number;
  lastOrderDate?: DateString;
  averageUsage?: number; // 平均使用量（月間等）
  autoOrderEnabled: boolean; // 自動発注有効フラグ
  notes?: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export interface StockLevelAlert {
  id: UUID;
  stockLevelId: UUID;
  stockLevel?: StockLevel;
  alertType: 'low_stock' | 'out_of_stock' | 'overstocked';
  currentQuantity: number;
  thresholdQuantity: number;
  suggestedOrderQuantity?: number;
  isResolved: boolean;
  resolvedAt?: DateString;
  createdAt: DateString;
}

// =================================================================
// 入庫管理関連型
// =================================================================

export interface Receiving {
  id: UUID;
  receivingNumber: string;
  purchaseOrderId: UUID;
  purchaseOrder?: PurchaseOrder;
  receivedDate: DateString;
  receivedBy: UUID;
  receivedByUser?: User;
  status: ReceivingStatus;
  items: ReceivingItem[];
  notes?: string;
  createdAt: DateString;
  updatedAt: DateString;
}

export type ReceivingStatus = 'partial' | 'complete' | 'with_issues';

export type QualityStatus = 'good' | 'damaged' | 'defective' | 'incorrect_spec' | 'passed' | 'failed' | 'pending' | 'partial';

export interface ReceivingItem {
  id: UUID;
  receivingId: UUID;
  purchaseOrderItemId: UUID;
  purchaseOrderItem?: PurchaseOrderItem;
  expectedQuantity: number;
  receivedQuantity: number;
  qualityStatus: 'good' | 'damaged' | 'defective' | 'incorrect_spec';
  actualCost?: number; // 実際の仕入価格（請求書ベース）
  notes?: string;
}

export interface CreateReceivingRequest {
  purchaseOrderId: UUID;
  receivedDate: DateString;
  items: {
    purchaseOrderItemId: UUID;
    receivedQuantity: number;
    qualityStatus: 'good' | 'damaged' | 'defective' | 'incorrect_spec';
    actualCost?: number;
    notes?: string;
  }[];
  notes?: string;
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
  updatedAt: DateString;
  createdAt: DateString;
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