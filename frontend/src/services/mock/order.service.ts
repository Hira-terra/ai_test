// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { Order, OrderItem, Product, Frame, ApiResponse, Customer, Prescription, OrderStatus, PaymentMethod, PaginationInfo } from '@/types';
import { 
  MOCK_ORDERS, 
  MOCK_PRODUCTS, 
  MOCK_FRAMES, 
  MOCK_ORDER_CUSTOMER,
  generateOrderNumber 
} from './data/order.mock';

// @MOCK_LOGIC: モック専用の受注管理サービス
export const mockOrderService = {
  // @MOCK_TO_API: /api/orders への GET リクエストに置き換え
  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    paymentMethod?: PaymentMethod;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ApiResponse<Order[]>> => {
    console.warn('🔧 Using MOCK data for orders list');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let filteredOrders = [...MOCK_ORDERS];
    
    // @MOCK_LOGIC: フィルタリング
    if (params?.status) {
      filteredOrders = filteredOrders.filter(order => order.status === params.status);
    }
    if (params?.paymentMethod) {
      filteredOrders = filteredOrders.filter(order => order.paymentMethod === params.paymentMethod);
    }
    if (params?.search) {
      const searchLower = params.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customer?.fullName.toLowerCase().includes(searchLower) ||
        order.customer?.customerCode.toLowerCase().includes(searchLower)
      );
    }
    if (params?.dateFrom) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderDate >= params.dateFrom!
      );
    }
    if (params?.dateTo) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderDate <= params.dateTo! + 'T23:59:59'
      );
    }
    
    // @MOCK_LOGIC: ページネーション
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + limit);
    
    const pagination: PaginationInfo = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
    
    return {
      success: true,
      data: paginatedOrders,
      meta: { pagination }
    };
  },

  // @MOCK_TO_API: /api/orders/:id への GET リクエストに置き換え
  getOrder: async (orderId: string): Promise<ApiResponse<Order>> => {
    console.warn('🔧 Using MOCK data for order detail');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const order = MOCK_ORDERS.find(o => o.id === orderId);
    
    if (!order) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '受注が見つかりません。'
        }
      };
    }
    
    return {
      success: true,
      data: order
    };
  },

  // @MOCK_TO_API: /api/orders への POST リクエストに置き換え
  createOrder: async (orderData: {
    customerId: string;
    items: Omit<OrderItem, 'id' | 'orderId'>[];
    deliveryDate?: string;
    paymentMethod: string;
    paidAmount: number;
    notes?: string;
  }): Promise<ApiResponse<Order>> => {
    console.warn('🔧 Using MOCK data for order creation');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // @MOCK_LOGIC: 金額計算
    const subtotalAmount = orderData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = Math.floor(subtotalAmount * 0.1);
    const totalAmount = subtotalAmount + taxAmount;
    const balanceAmount = totalAmount - orderData.paidAmount;
    
    // @MOCK_LOGIC: 新しい受注データ作成
    const newOrder: Order = {
      id: `mock_order_${Date.now()}`,
      orderNumber: generateOrderNumber(),
      customerId: orderData.customerId,
      customer: MOCK_ORDER_CUSTOMER,
      storeId: '550e8400-e29b-41d4-a716-446655440001',
      store: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        storeCode: 'STORE001',
        name: '新宿本店',
        address: '東京都新宿区新宿3-1-1'
      },
      orderDate: new Date().toISOString(),
      deliveryDate: orderData.deliveryDate,
      status: 'ordered',
      subtotalAmount,
      taxAmount,
      totalAmount,
      paidAmount: orderData.paidAmount,
      balanceAmount,
      paymentMethod: orderData.paymentMethod as any,
      notes: orderData.notes,
      items: orderData.items.map((item, index) => ({
        ...item,
        id: `mock_item_${Date.now()}_${index}`,
        orderId: `mock_order_${Date.now()}`
      })),
      payments: orderData.paidAmount > 0 ? [{
        id: `mock_payment_${Date.now()}`,
        orderId: `mock_order_${Date.now()}`,
        paymentDate: new Date().toISOString(),
        paymentAmount: orderData.paidAmount,
        paymentMethod: orderData.paymentMethod as any,
        notes: '受注時入金',
        createdBy: '550e8400-e29b-41d4-a716-446655440101',
        createdAt: new Date().toISOString()
      }] : [],
      createdBy: '550e8400-e29b-41d4-a716-446655440101',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // @MOCK_LOGIC: モックデータリストに追加
    MOCK_ORDERS.unshift(newOrder);
    
    return {
      success: true,
      data: newOrder
    };
  },

  // @MOCK_TO_API: /api/products への GET リクエストに置き換え
  getProducts: async (): Promise<ApiResponse<Product[]>> => {
    console.warn('🔧 Using MOCK data for products');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      success: true,
      data: MOCK_PRODUCTS
    };
  },

  // @MOCK_TO_API: /api/inventory/frames への GET リクエストに置き換え
  getAvailableFrames: async (): Promise<ApiResponse<Frame[]>> => {
    console.warn('🔧 Using MOCK data for available frames');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // @MOCK_LOGIC: 在庫有りのフレームのみ返す
    const availableFrames = MOCK_FRAMES.filter(frame => frame.status === 'in_stock');
    
    return {
      success: true,
      data: availableFrames
    };
  },

  // @MOCK_TO_API: /api/customers/:id/prescriptions への GET リクエストに置き換え
  getCustomerLatestPrescription: async (customerId: string): Promise<ApiResponse<Prescription | null>> => {
    console.warn('🔧 Using MOCK data for customer prescription');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // @MOCK_LOGIC: サンプル処方箋データ
    if (customerId === MOCK_ORDER_CUSTOMER.id) {
      const mockPrescription: Prescription = {
        id: `mock_prescription_${customerId}`,
        customerId,
        measuredDate: '2025-01-10T00:00:00Z',
        rightEyeSphere: -2.50,
        rightEyeCylinder: -0.75,
        rightEyeAxis: 90,
        rightEyeVision: 1.0,
        leftEyeSphere: -2.25,
        leftEyeCylinder: -0.50,
        leftEyeAxis: 85,
        leftEyeVision: 1.0,
        pupilDistance: 62,
        notes: '前回より度数が進んでいます',
        createdBy: '550e8400-e29b-41d4-a716-446655440101',
        createdAt: '2025-01-10T00:00:00Z'
      };
      
      return {
        success: true,
        data: mockPrescription
      };
    }
    
    return {
      success: true,
      data: null
    };
  },

  // @MOCK_TO_API: /api/orders/:id/status への PUT リクエストに置き換え
  updateOrderStatus: async (orderId: string, status: OrderStatus): Promise<ApiResponse<Order>> => {
    console.warn('🔧 Using MOCK data for order status update');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // @MOCK_LOGIC: 受注を見つけて更新
    const orderIndex = MOCK_ORDERS.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '受注が見つかりません。'
        }
      };
    }
    
    // @MOCK_LOGIC: ステータス更新
    MOCK_ORDERS[orderIndex] = {
      ...MOCK_ORDERS[orderIndex],
      status,
      updatedAt: new Date().toISOString()
    };
    
    return {
      success: true,
      data: MOCK_ORDERS[orderIndex]
    };
  }
};