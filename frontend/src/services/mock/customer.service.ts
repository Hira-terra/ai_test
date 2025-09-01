// @MOCK_TO_API: API実装時にこのファイル全体をAPI呼び出しに置き換え
import { Customer, CustomerSearchParams, Prescription, CustomerImage, CustomerMemo, ApiResponse, PaginationInfo } from '@/types';
import { MOCK_CUSTOMERS, MOCK_PRESCRIPTIONS, MOCK_CUSTOMER_IMAGES, MOCK_CUSTOMER_MEMOS } from './data/customer.mock';

// @MOCK_LOGIC: モック専用の顧客管理処理
export const mockCustomerService = {
  // @MOCK_TO_API: /api/customers への GET リクエストに置き換え
  searchCustomers: async (params: CustomerSearchParams = {}): Promise<ApiResponse<Customer[]>> => {
    console.warn('🔧 Using MOCK data for customer search');
    console.log('🔍 Search params:', params);
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filteredCustomers = [...MOCK_CUSTOMERS];
    console.log('📊 Initial customers count:', filteredCustomers.length);
    
    // @MOCK_LOGIC: 検索フィルタリング
    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.fullName.toLowerCase().includes(searchTerm) ||
        customer.fullNameKana?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm) ||
        customer.mobile?.includes(searchTerm) ||
        customer.customerCode.toLowerCase().includes(searchTerm)
      );
    }
    
    if (params.phone) {
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.phone?.includes(params.phone!) ||
        customer.mobile?.includes(params.phone!)
      );
    }
    
    if (params.address) {
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.address?.toLowerCase().includes(params.address!.toLowerCase())
      );
    }
    
    // @MOCK_LOGIC: 自店舗のみフィルタリング
    if (params.ownStoreOnly) {
      // 現在のユーザーの店舗ID取得（バックエンドAPIと同期）
      const currentStoreId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // 新宿本店のID（API同期）
      console.log('🏪 Filtering by store ID:', currentStoreId);
      console.log('🔍 Before store filtering:', filteredCustomers.length);
      filteredCustomers = filteredCustomers.filter(customer => {
        console.log('👤 Customer store ID:', customer.registeredStoreId, 'Match:', customer.registeredStoreId === currentStoreId);
        return customer.registeredStoreId === currentStoreId;
      });
      console.log('✅ After store filtering:', filteredCustomers.length);
    }
    
    // @MOCK_LOGIC: ソート
    if (params.sort) {
      const [sortField, sortDirection] = params.sort.split('_');
      const isAsc = sortDirection === 'asc';
      
      filteredCustomers.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        switch (sortField) {
          case 'fullName':
            aValue = a.fullName;
            bValue = b.fullName;
            break;
          case 'customerCode':
            aValue = a.customerCode;
            bValue = b.customerCode;
            break;
          case 'lastVisitDate':
            aValue = new Date(a.lastVisitDate || '1900-01-01').getTime();
            bValue = new Date(b.lastVisitDate || '1900-01-01').getTime();
            break;
          case 'visitCount':
            aValue = a.visitCount || 0;
            bValue = b.visitCount || 0;
            break;
          case 'totalPurchaseAmount':
            aValue = a.totalPurchaseAmount || 0;
            bValue = b.totalPurchaseAmount || 0;
            break;
          case 'name':
            aValue = a.fullName;
            bValue = b.fullName;
            break;
          case 'kana':
            aValue = a.fullNameKana || '';
            bValue = b.fullNameKana || '';
            break;
          case 'last_visit_date':
            aValue = new Date(a.lastVisitDate || '1900-01-01').getTime();
            bValue = new Date(b.lastVisitDate || '1900-01-01').getTime();
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === 'string') {
          const result = aValue.localeCompare(bValue);
          return isAsc ? result : -result;
        } else {
          const result = aValue - bValue;
          return isAsc ? result : -result;
        }
      });
    }
    
    // @MOCK_LOGIC: ページネーション
    const page = params.page || 1;
    const limit = params.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
    
    const paginationInfo: PaginationInfo = {
      page,
      limit,
      total: filteredCustomers.length,
      totalPages: Math.ceil(filteredCustomers.length / limit),
      hasNext: endIndex < filteredCustomers.length,
      hasPrev: page > 1
    };
    
    console.log('📤 Final result count:', paginatedCustomers.length);
    
    return {
      success: true,
      data: paginatedCustomers,
      meta: {
        pagination: paginationInfo
      }
    };
  },

  // @MOCK_TO_API: /api/customers/:id への GET リクエストに置き換え
  getCustomerById: async (id: string): Promise<ApiResponse<Customer>> => {
    console.warn('🔧 Using MOCK data for customer detail');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const customer = MOCK_CUSTOMERS.find(c => c.id === id);
    
    if (!customer) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '顧客が見つかりません。'
        }
      };
    }
    
    return {
      success: true,
      data: customer
    };
  },

  // @MOCK_TO_API: /api/customers/:id/prescriptions への GET リクエストに置き換え
  getCustomerPrescriptions: async (customerId: string): Promise<ApiResponse<Prescription[]>> => {
    console.warn('🔧 Using MOCK data for customer prescriptions');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const prescriptions = MOCK_PRESCRIPTIONS
      .filter(p => p.customerId === customerId)
      .sort((a, b) => new Date(b.measuredDate).getTime() - new Date(a.measuredDate).getTime());
    
    return {
      success: true,
      data: prescriptions
    };
  },

  // @MOCK_TO_API: /api/customers/:id/images への GET リクエストに置き換え
  getCustomerImages: async (customerId: string): Promise<ApiResponse<CustomerImage[]>> => {
    console.warn('🔧 Using MOCK data for customer images');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // customerIdに対応するイメージを取得（C-000001〜C-000004用のデータ）
    const customerMap: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655441001': 'C-000001', // 田中太郎 → 山田太郎のデータ
      '550e8400-e29b-41d4-a716-446655441002': 'C-000002', // 佐藤花子
      '550e8400-e29b-41d4-a716-446655441003': 'C-000003', // 鈴木一郎 → 鈴木次郎のデータ
      '550e8400-e29b-41d4-a716-446655441004': 'C-000004', // 高橋健太 → 平光博人のデータ
    };
    
    const mappedCustomerCode = customerMap[customerId];
    
    if (mappedCustomerCode) {
      // 詳細なモックデータをインポート
      const { MOCK_CUSTOMER_IMAGES: detailedImages } = await import('./data/customerImage.mock');
      const images = detailedImages[mappedCustomerCode] || [];
      
      // customerIdを現在のIDに更新
      const updatedImages = images.map(img => ({
        ...img,
        customerId: customerId
      }));
      
      return {
        success: true,
        data: updatedImages
      };
    }
    
    // 既存のMOCK_CUSTOMER_IMAGESから取得
    const images = MOCK_CUSTOMER_IMAGES
      .filter(i => i.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      success: true,
      data: images
    };
  },

  // @MOCK_TO_API: /api/customers/:id/memos への GET リクエストに置き換え
  getCustomerMemos: async (customerId: string): Promise<ApiResponse<CustomerMemo[]>> => {
    console.warn('🔧 Using MOCK data for customer memos');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const memos = MOCK_CUSTOMER_MEMOS
      .filter(m => m.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return {
      success: true,
      data: memos
    };
  },

  // @MOCK_TO_API: /api/customers への POST リクエストに置き換え
  createCustomer: async (customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    console.warn('🔧 Using MOCK data for customer creation');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // @MOCK_LOGIC: 新規顧客データ生成
    const newCustomer: Customer = {
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      customerCode: `C${String(MOCK_CUSTOMERS.length + 1).padStart(3, '0')}`,
      lastName: customerData.lastName || '',
      firstName: customerData.firstName || '',
      lastNameKana: customerData.lastNameKana,
      firstNameKana: customerData.firstNameKana,
      fullName: `${customerData.lastName || ''} ${customerData.firstName || ''}`,
      fullNameKana: customerData.lastNameKana && customerData.firstNameKana 
        ? `${customerData.lastNameKana} ${customerData.firstNameKana}` 
        : undefined,
      gender: customerData.gender,
      birthDate: customerData.birthDate,
      age: customerData.birthDate 
        ? Math.floor((Date.now() - new Date(customerData.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined,
      phone: customerData.phone,
      mobile: customerData.mobile,
      email: customerData.email,
      postalCode: customerData.postalCode,
      address: customerData.address,
      firstVisitDate: new Date().toISOString().split('T')[0],
      visitCount: 1,
      totalPurchaseAmount: 0,
      notes: customerData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // @MOCK_LOGIC: モックデータに追加
    MOCK_CUSTOMERS.push(newCustomer);
    
    return {
      success: true,
      data: newCustomer
    };
  },

  // @MOCK_TO_API: /api/customers/:id/prescriptions への POST リクエストに置き換え
  createPrescription: async (customerId: string, prescriptionData: Omit<Prescription, 'id' | 'customerId' | 'createdAt' | 'createdBy'>): Promise<ApiResponse<Prescription>> => {
    console.warn('🔧 Using MOCK data for prescription creation');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // @MOCK_LOGIC: 新規処方箋データ生成
    const newPrescription: Prescription = {
      id: `pre-${Date.now()}`,
      customerId: customerId,
      measuredDate: prescriptionData.measuredDate,
      rightEyeSphere: prescriptionData.rightEyeSphere,
      rightEyeCylinder: prescriptionData.rightEyeCylinder,
      rightEyeAxis: prescriptionData.rightEyeAxis,
      rightEyeVision: prescriptionData.rightEyeVision,
      leftEyeSphere: prescriptionData.leftEyeSphere,
      leftEyeCylinder: prescriptionData.leftEyeCylinder,
      leftEyeAxis: prescriptionData.leftEyeAxis,
      leftEyeVision: prescriptionData.leftEyeVision,
      pupilDistance: prescriptionData.pupilDistance,
      notes: prescriptionData.notes,
      createdAt: new Date().toISOString(),
      createdBy: 'current-user-id'
    };
    
    // @MOCK_LOGIC: モックデータに追加
    MOCK_PRESCRIPTIONS.push(newPrescription);
    
    return {
      success: true,
      data: newPrescription
    };
  },

  // @MOCK_TO_API: /api/customers/:id への PUT リクエストに置き換え
  updateCustomer: async (id: string, customerData: Partial<Customer>): Promise<ApiResponse<Customer>> => {
    console.warn('🔧 Using MOCK data for customer update');
    
    // @MOCK_LOGIC: 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const customerIndex = MOCK_CUSTOMERS.findIndex(c => c.id === id);
    
    if (customerIndex === -1) {
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '顧客が見つかりません。'
        }
      };
    }
    
    // @MOCK_LOGIC: 顧客データ更新
    const updatedCustomer: Customer = {
      ...MOCK_CUSTOMERS[customerIndex],
      ...customerData,
      fullName: customerData.lastName && customerData.firstName
        ? `${customerData.lastName} ${customerData.firstName}`
        : MOCK_CUSTOMERS[customerIndex].fullName,
      fullNameKana: customerData.lastNameKana && customerData.firstNameKana
        ? `${customerData.lastNameKana} ${customerData.firstNameKana}`
        : MOCK_CUSTOMERS[customerIndex].fullNameKana,
      updatedAt: new Date().toISOString()
    };
    
    MOCK_CUSTOMERS[customerIndex] = updatedCustomer;
    
    return {
      success: true,
      data: updatedCustomer
    };
  }
};