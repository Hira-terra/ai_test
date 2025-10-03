import {
  Customer,
  Prescription,
  CustomerImage,
  CustomerMemo,
  CustomerSearchParams,
  UUID,
  ApiResponse,
  PaginationInfo,
  FabricCanvasData,
  Order
} from '../types';
import {
  CustomerRepository,
  PrescriptionRepository,
  CustomerImageRepository,
  CustomerMemoRepository
} from '../repositories/customer.repository';
import { logger } from '../utils/logger';
import {
  validateCustomerCreate,
  validateCustomerUpdate,
  validateCustomerSearch,
  validatePrescription,
  validateCustomerImage,
  validateCustomerMemo,
  ValidationError
} from '../validators/customer.validator';
import { OrderService } from './order.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CustomerService {
  private customerRepo: CustomerRepository;
  private prescriptionRepo: PrescriptionRepository;
  private imageRepo: CustomerImageRepository;
  private memoRepo: CustomerMemoRepository;
  private orderService: OrderService;

  constructor() {
    this.customerRepo = new CustomerRepository();
    this.prescriptionRepo = new PrescriptionRepository();
    this.imageRepo = new CustomerImageRepository();
    this.memoRepo = new CustomerMemoRepository();
    this.orderService = new OrderService();
    logger.info('[CustomerService] 初期化完了');
  }

  // ============================================
  // 顧客管理サービス
  // ============================================

  async createCustomer(
    customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
    userId: UUID
  ): Promise<ApiResponse<Customer>> {
    const operationId = `customer-service-create-${Date.now()}`;
    logger.info(`[${operationId}] 顧客作成サービス開始`, { 
      fullName: customerData.fullName,
      userId 
    });

    const startTime = Date.now();

    try {
      // データ検証
      const validatedData = validateCustomerCreate(customerData);
      logger.debug(`[${operationId}] バリデーション完了`);

      // フルネーム自動生成（未提供の場合）
      if (!validatedData.fullName) {
        validatedData.fullName = `${validatedData.lastName} ${validatedData.firstName}`;
      }
      
      // カナフルネーム自動生成
      if (validatedData.lastNameKana && validatedData.firstNameKana) {
        validatedData.fullNameKana = `${validatedData.lastNameKana} ${validatedData.firstNameKana}`;
      }

      // 年齢計算（生年月日から）
      if (validatedData.birthDate) {
        const birthYear = new Date(validatedData.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        validatedData.age = currentYear - birthYear;
      }

      // 重複チェック（電話番号またはメールアドレス）
      await this.checkCustomerDuplication(validatedData);

      // registeredStoreIdを確実に設定（バリデーションで失われる可能性があるため）
      if (customerData.registeredStoreId) {
        validatedData.registeredStoreId = customerData.registeredStoreId;
      }

      logger.debug(`[${operationId}] 顧客作成前の最終データ`, {
        hasRegisteredStoreId: !!validatedData.registeredStoreId,
        registeredStoreId: validatedData.registeredStoreId
      });

      // 顧客作成
      const customer = await this.customerRepo.create(validatedData);

      const duration = Date.now() - startTime;
      logger.info(`[${operationId}] 顧客作成サービス完了 (${duration}ms)`, {
        customerId: customer.id,
        customerCode: customer.customerCode
      });

      return {
        success: true,
        data: customer
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客作成サービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'システムエラーが発生しました。しばらく経ってから再度お試しください。'
        }
      };
    }
  }

  async searchCustomers(params: CustomerSearchParams, storeId?: UUID): Promise<ApiResponse<Customer[]>> {
    const operationId = `customer-service-search-${Date.now()}`;
    logger.info(`[${operationId}] 顧客検索サービス開始`, params);

    const startTime = Date.now();

    try {
      // パラメータ検証
      const validatedParams = validateCustomerSearch(params);
      logger.debug(`[${operationId}] 検索パラメータ検証完了`);

      // 検索実行
      const searchResult = await this.customerRepo.search(validatedParams, storeId);

      const duration = Date.now() - startTime;
      logger.info(`[${operationId}] 顧客検索サービス完了 (${duration}ms)`, {
        found: searchResult.customers.length,
        total: searchResult.pagination.total
      });

      return {
        success: true,
        data: searchResult.customers,
        meta: {
          pagination: searchResult.pagination
        }
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客検索サービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '検索処理でエラーが発生しました。'
        }
      };
    }
  }

  async getCustomerById(id: UUID, storeId?: UUID): Promise<ApiResponse<Customer>> {
    const operationId = `customer-service-getById-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客詳細取得サービス開始`, { customerId: id });

    try {
      const customer = await this.customerRepo.findById(id, storeId);

      if (!customer) {
        logger.warn(`[${operationId}] 顧客が見つかりません`, { customerId: id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 最新の来店日を更新
      await this.customerRepo.updateLastVisitDate(id, storeId);
      
      logger.debug(`[${operationId}] 顧客詳細取得サービス完了`);

      return {
        success: true,
        data: customer
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客詳細取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '顧客情報の取得に失敗しました。'
        }
      };
    }
  }

  async updateCustomer(
    id: UUID, 
    updates: Partial<Customer>, 
    userId: UUID,
    storeId?: UUID
  ): Promise<ApiResponse<Customer>> {
    const operationId = `customer-service-update-${Date.now()}`;
    logger.info(`[${operationId}] 顧客更新サービス開始`, { customerId: id, userId });

    try {
      // データ検証
      const validatedUpdates = validateCustomerUpdate(updates);
      logger.debug(`[${operationId}] 更新データ検証完了`);

      // フルネーム自動更新
      if (validatedUpdates.lastName || validatedUpdates.firstName) {
        const customer = await this.customerRepo.findById(id, storeId);
        if (customer) {
          const lastName = validatedUpdates.lastName || customer.lastName;
          const firstName = validatedUpdates.firstName || customer.firstName;
          validatedUpdates.fullName = `${lastName} ${firstName}`;
        }
      }

      // カナフルネーム自動更新
      if (validatedUpdates.lastNameKana || validatedUpdates.firstNameKana) {
        const customer = await this.customerRepo.findById(id, storeId);
        if (customer) {
          const lastNameKana = validatedUpdates.lastNameKana || customer.lastNameKana;
          const firstNameKana = validatedUpdates.firstNameKana || customer.firstNameKana;
          if (lastNameKana && firstNameKana) {
            validatedUpdates.fullNameKana = `${lastNameKana} ${firstNameKana}`;
          }
        }
      }

      // 年齢計算（生年月日更新時）
      if (validatedUpdates.birthDate) {
        const birthYear = new Date(validatedUpdates.birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        validatedUpdates.age = currentYear - birthYear;
      }

      // 顧客更新
      const updatedCustomer = await this.customerRepo.update(id, validatedUpdates, storeId);

      if (!updatedCustomer) {
        logger.warn(`[${operationId}] 更新対象の顧客が見つかりません`, { customerId: id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      logger.info(`[${operationId}] 顧客更新サービス完了`, {
        customerId: updatedCustomer.id,
        customerCode: updatedCustomer.customerCode
      });

      return {
        success: true,
        data: updatedCustomer
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客更新サービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '顧客情報の更新に失敗しました。'
        }
      };
    }
  }

  // ============================================
  // 処方箋管理サービス
  // ============================================

  async createPrescription(
    prescriptionData: Omit<Prescription, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<ApiResponse<Prescription>> {
    const operationId = `prescription-service-create-${Date.now()}`;
    logger.info(`[${operationId}] 処方箋作成サービス開始`, { 
      customerId: prescriptionData.customerId,
      createdBy
    });

    try {
      // データ検証
      const validatedData = validatePrescription(prescriptionData);
      logger.debug(`[${operationId}] 処方箋データ検証完了`);

      // 顧客存在チェック
      const customer = await this.customerRepo.findById(validatedData.customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 処方箋作成
      const prescription = await this.prescriptionRepo.create(validatedData, createdBy);

      logger.info(`[${operationId}] 処方箋作成サービス完了`, {
        prescriptionId: prescription.id
      });

      return {
        success: true,
        data: prescription
      };

    } catch (error) {
      logger.error(`[${operationId}] 処方箋作成サービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '処方箋の作成に失敗しました。'
        }
      };
    }
  }

  async getCustomerPrescriptions(customerId: UUID): Promise<ApiResponse<Prescription[]>> {
    const operationId = `prescription-service-getByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客処方箋取得サービス開始`, { customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 処方箋履歴取得
      const prescriptions = await this.prescriptionRepo.findByCustomerId(customerId);

      logger.debug(`[${operationId}] 顧客処方箋取得サービス完了`, { count: prescriptions.length });

      return {
        success: true,
        data: prescriptions
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客処方箋取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '処方箋履歴の取得に失敗しました。'
        }
      };
    }
  }

  async getLatestPrescription(customerId: UUID): Promise<ApiResponse<Prescription | null>> {
    const operationId = `prescription-service-getLatest-${Date.now()}`;
    logger.debug(`[${operationId}] 最新処方箋取得サービス開始`, { customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 最新処方箋取得
      const prescription = await this.prescriptionRepo.getLatestPrescription(customerId);

      logger.debug(`[${operationId}] 最新処方箋取得サービス完了`, { 
        found: prescription !== null 
      });

      return {
        success: true,
        data: prescription
      };

    } catch (error) {
      logger.error(`[${operationId}] 最新処方箋取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '最新処方箋の取得に失敗しました。'
        }
      };
    }
  }

  // ============================================
  // 画像管理サービス
  // ============================================

  async uploadCustomerImage(
    imageData: Omit<CustomerImage, 'id' | 'createdAt' | 'hasAnnotations'>,
    uploadedBy: UUID
  ): Promise<ApiResponse<CustomerImage>> {
    const operationId = `image-service-upload-${Date.now()}`;
    logger.info(`[${operationId}] 顧客画像アップロードサービス開始`, { 
      customerId: imageData.customerId,
      fileName: imageData.fileName,
      uploadedBy
    });

    try {
      // データ検証
      const validatedData = validateCustomerImage(imageData);
      logger.debug(`[${operationId}] 画像データ検証完了`);

      // 顧客存在チェック
      const customer = await this.customerRepo.findById(validatedData.customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // ファイル存在確認
      try {
        await fs.access(validatedData.filePath);
      } catch (error) {
        logger.warn(`[${operationId}] アップロードファイルが見つかりません`, {
          filePath: validatedData.filePath
        });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'アップロードファイルが見つかりません。'
          }
        };
      }

      // 画像登録
      const image = await this.imageRepo.create(validatedData, uploadedBy);

      logger.info(`[${operationId}] 顧客画像アップロードサービス完了`, {
        imageId: image.id
      });

      return {
        success: true,
        data: image
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像アップロードサービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '画像のアップロードに失敗しました。'
        }
      };
    }
  }

  async getCustomerImages(customerId: UUID): Promise<ApiResponse<CustomerImage[]>> {
    const operationId = `image-service-getByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客画像取得サービス開始`, { customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 画像一覧取得
      const images = await this.imageRepo.findByCustomerId(customerId);

      logger.debug(`[${operationId}] 顧客画像取得サービス完了`, { count: images.length });

      return {
        success: true,
        data: images
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '画像一覧の取得に失敗しました。'
        }
      };
    }
  }

  async deleteCustomerImage(imageId: UUID, customerId: UUID): Promise<ApiResponse<boolean>> {
    const operationId = `image-service-delete-${Date.now()}`;
    logger.info(`[${operationId}] 顧客画像削除サービス開始`, { imageId, customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // 画像削除
      const deleted = await this.imageRepo.delete(imageId);

      logger.info(`[${operationId}] 顧客画像削除サービス完了`, { deleted });

      return {
        success: true,
        data: deleted
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客画像削除サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '画像の削除に失敗しました。'
        }
      };
    }
  }

  // ============================================
  // メモ管理サービス
  // ============================================

  async createCustomerMemo(
    memoData: Omit<CustomerMemo, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<ApiResponse<CustomerMemo>> {
    const operationId = `memo-service-create-${Date.now()}`;
    logger.info(`[${operationId}] 顧客メモ作成サービス開始`, { 
      customerId: memoData.customerId,
      createdBy
    });

    try {
      // データ検証
      const validatedData = validateCustomerMemo(memoData);
      logger.debug(`[${operationId}] メモデータ検証完了`);

      // 顧客存在チェック
      const customer = await this.customerRepo.findById(validatedData.customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // メモ作成
      const memo = await this.memoRepo.create(validatedData, createdBy);

      logger.info(`[${operationId}] 顧客メモ作成サービス完了`, { memoId: memo.id });

      return {
        success: true,
        data: memo
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ作成サービスエラー:`, error);
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'メモの作成に失敗しました。'
        }
      };
    }
  }

  async getCustomerMemos(customerId: UUID): Promise<ApiResponse<CustomerMemo[]>> {
    const operationId = `memo-service-getByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客メモ取得サービス開始`, { customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // メモ一覧取得
      const memos = await this.memoRepo.findByCustomerId(customerId);

      logger.debug(`[${operationId}] 顧客メモ取得サービス完了`, { count: memos.length });

      return {
        success: true,
        data: memos
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'メモ一覧の取得に失敗しました。'
        }
      };
    }
  }

  async deleteCustomerMemo(memoId: UUID, customerId: UUID): Promise<ApiResponse<boolean>> {
    const operationId = `memo-service-delete-${Date.now()}`;
    logger.info(`[${operationId}] 顧客メモ削除サービス開始`, { memoId, customerId });

    try {
      // 顧客存在チェック
      const customer = await this.customerRepo.findById(customerId);
      if (!customer) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定された顧客が見つかりません。'
          }
        };
      }

      // メモ削除
      const deleted = await this.memoRepo.delete(memoId);

      logger.info(`[${operationId}] 顧客メモ削除サービス完了`, { deleted });

      return {
        success: true,
        data: deleted
      };

    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ削除サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'メモの削除に失敗しました。'
        }
      };
    }
  }

  // ============================================
  // 購入履歴管理サービス
  // ============================================

  /**
   * 顧客の購入履歴（受注履歴）を取得
   */
  async getCustomerOrders(customerId: string): Promise<ApiResponse<Order[]>> {
    const operationId = `service-customer-orders-${Date.now()}`;

    try {
      logger.info(`[${operationId}] 顧客購入履歴取得開始`, { customerId });

      // 顧客の存在確認
      const customerResult = await this.customerRepo.findById(customerId);
      if (!customerResult) {
        logger.warn(`[${operationId}] 顧客が見つかりません`, { customerId });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '顧客が見つかりません。'
          }
        };
      }

      // 顧客の受注を取得（日付降順）
      const ordersResult = await this.orderService.getOrders(
        { customerId, limit: 100 },
        operationId
      );

      if (!ordersResult.success) {
        logger.error(`[${operationId}] 受注取得エラー`, { error: ordersResult.error });
        return ordersResult;
      }

      logger.info(`[${operationId}] 顧客購入履歴取得成功`, {
        customerId,
        orderCount: ordersResult.data?.length
      });

      return {
        success: true,
        data: ordersResult.data || [],
        meta: ordersResult.meta
      };

    } catch (error: any) {
      logger.error(`[${operationId}] 顧客購入履歴取得サービスエラー:`, error);

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: '購入履歴の取得に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // ============================================
  // プライベートヘルパーメソッド
  // ============================================

  private async checkCustomerDuplication(customerData: any): Promise<void> {
    // 電話番号重複チェック
    if (customerData.phone || customerData.mobile) {
      const searchQuery = customerData.phone || customerData.mobile;
      const duplicates = await this.customerRepo.search({
        phone: searchQuery,
        limit: 1
      });

      if (duplicates.customers.length > 0) {
        logger.warn(`顧客重複検出:`, {
          phone: searchQuery,
          existingCustomer: duplicates.customers[0]?.customerCode
        });
        throw new ValidationError(
          '同じ電話番号の顧客が既に登録されています。',
          [{ message: '重複する電話番号です' }]
        );
      }
    }

    // メールアドレス重複チェック（TODO: 将来的にメール検索APIが追加された場合）
    if (customerData.email) {
      // 現在の検索APIではメール検索ができないため、将来的な拡張として残しておく
      logger.debug('メールアドレス重複チェックはスキップ（検索API未対応）');
    }
  }
}