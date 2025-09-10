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
  },
  
  // 発注管理
  PURCHASE_ORDERS: {
    BASE: '/purchase-orders',
    LIST: '/purchase-orders',
    DETAIL: (id: string) => `/purchase-orders/${id}`,
    CREATE: '/purchase-orders',
    UPDATE: (id: string) => `/purchase-orders/${id}`,
    SEND: (id: string) => `/purchase-orders/${id}/send`,
    CONFIRM: (id: string) => `/purchase-orders/${id}/confirm`,
    CANCEL: (id: string) => `/purchase-orders/${id}/cancel`,
    
    // 発注可能受注取得
    AVAILABLE_ORDERS: '/purchase-orders/available-orders',
    
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
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: OrderItem[];
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
  paymentTiming: PaymentTiming; // 受注時 or お渡し時
  notes?: string;
  createdBy: UUID;
  createdAt: DateString;
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

export interface PurchaseOrderItem {
  id: UUID;
  purchaseOrderId: UUID;
  orderId: UUID; // 元受注ID
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
}

export interface CreatePurchaseOrderRequest {
  supplierId: UUID;
  expectedDeliveryDate?: DateString;
  orderIds: UUID[]; // 対象受注ID群
  notes?: string;
}

export interface PurchaseOrderSearchParams {
  supplierId?: UUID;
  status?: PurchaseOrderStatus;
  orderDateFrom?: DateString;
  orderDateTo?: DateString;
  expectedDeliveryFrom?: DateString;
  expectedDeliveryTo?: DateString;
  page?: number;
  limit?: number;
  sort?: string;
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
export type QualityStatus = 'good' | 'damaged' | 'defective' | 'incorrect_spec';

export interface ReceivingItem {
  id: UUID;
  receivingId: UUID;
  purchaseOrderItemId: UUID;
  purchaseOrderItem?: PurchaseOrderItem;
  expectedQuantity: number;
  receivedQuantity: number;
  qualityStatus: QualityStatus;
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

// =================================================================
// エラークラス
// =================================================================
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details: any[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(
    message: string,
    public readonly details: any[] = []
  ) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly details: any[] = []
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly details: any[] = []
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}