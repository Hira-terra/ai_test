import { Pool, PoolClient } from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import {
  Customer,
  Prescription,
  CustomerImage,
  CustomerMemo,
  ImageAnnotation,
  FabricCanvasData,
  CustomerSearchParams,
  PaginationInfo,
  UUID,
  DateString
} from '../types';

// データベースモデル型定義
interface CustomerModel {
  id: UUID;
  customer_code: string;
  last_name: string;
  first_name: string;
  last_name_kana?: string;
  first_name_kana?: string;
  gender?: 'male' | 'female' | 'other';
  birth_date?: DateString;
  age?: number;
  phone?: string;
  mobile?: string;
  email?: string;
  postal_code?: string;
  address?: string;
  first_visit_date?: DateString;
  last_visit_date?: DateString;
  visit_count: number;
  total_purchase_amount: number;
  notes?: string;
  store_id: UUID;
  created_at: DateString;
  updated_at: DateString;
  // JOINで取得する店舗情報
  store_code?: string;
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_manager_name?: string;
}

interface CustomerSearchResult {
  customers: Customer[];
  pagination: PaginationInfo;
}

export class CustomerRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[CustomerRepository] 初期化完了');
  }

  private transformToCustomer(row: CustomerModel): Customer {
    // full_name, full_name_kanaをDBカラムから生成
    const fullName = `${row.last_name} ${row.first_name}`;
    const fullNameKana = row.last_name_kana && row.first_name_kana 
      ? `${row.last_name_kana} ${row.first_name_kana}` 
      : undefined;
    
    // 店舗情報（JOINで取得した場合のみ）
    const registeredStore = row.store_code ? {
      id: row.store_id,
      storeCode: row.store_code,
      name: row.store_name!,
      address: row.store_address!,
      phone: row.store_phone,
      managerName: row.store_manager_name
    } : undefined;
    
    return {
      id: row.id,
      customerCode: row.customer_code,
      lastName: row.last_name,
      firstName: row.first_name,
      lastNameKana: row.last_name_kana,
      firstNameKana: row.first_name_kana,
      fullName: fullName,
      fullNameKana: fullNameKana,
      gender: row.gender,
      birthDate: row.birth_date,
      age: row.age,
      phone: row.phone,
      mobile: row.mobile,
      email: row.email,
      postalCode: row.postal_code,
      address: row.address,
      firstVisitDate: row.first_visit_date,
      lastVisitDate: row.last_visit_date,
      visitCount: row.visit_count,
      totalPurchaseAmount: row.total_purchase_amount,
      notes: row.notes,
      registeredStoreId: row.store_id,
      registeredStore: registeredStore,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async create(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const operationId = `customer-create-${Date.now()}`;
    logger.info(`[${operationId}] 顧客作成開始`, { customerName: customer.fullName });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const customerCode = await this.generateCustomerCode(client);
      logger.debug(`[${operationId}] 顧客コード生成完了: ${customerCode}`);

      const query = `
        INSERT INTO customers (
          customer_code, last_name, first_name, last_name_kana, first_name_kana,
          gender, birth_date, phone, mobile,
          email, postal_code, address, first_visit_date, visit_count,
          total_purchase_amount, notes, store_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const values = [
        customerCode,
        customer.lastName,
        customer.firstName,
        customer.lastNameKana || null,
        customer.firstNameKana || null,
        customer.gender || null,
        customer.birthDate || null,
        customer.phone || null,
        customer.mobile || null,
        customer.email || null,
        customer.postalCode || null,
        customer.address || null,
        customer.firstVisitDate || new Date().toISOString(),
        customer.visitCount || 1,
        customer.totalPurchaseAmount || 0,
        customer.notes || null,
        customer.registeredStoreId
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const createdCustomer = this.transformToCustomer(result.rows[0]);
      logger.info(`[${operationId}] 顧客作成完了`, { 
        customerId: createdCustomer.id, 
        customerCode: createdCustomer.customerCode 
      });

      return createdCustomer;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 顧客作成エラー:`, error);
      throw new Error(`顧客の作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }

  async findById(id: UUID, storeId?: UUID): Promise<Customer | null> {
    const operationId = `customer-findById-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客検索開始 (ID: ${id})`);

    try {
      const query = `SELECT * FROM customers WHERE id = $1${storeId ? ' AND store_id = $2' : ''}`;
      const params = storeId ? [id, storeId] : [id];
      const result = await this.db.query(query, params);

      if (result.rows[0]) {
        const customer = this.transformToCustomer(result.rows[0]);
        logger.debug(`[${operationId}] 顧客検索完了:`, { customerCode: customer.customerCode });
        return customer;
      }

      logger.debug(`[${operationId}] 顧客が見つかりません`);
      return null;
    } catch (error) {
      logger.error(`[${operationId}] 顧客検索エラー:`, error);
      throw new Error(`顧客の検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async update(id: UUID, updates: Partial<Customer>, storeId?: UUID): Promise<Customer | null> {
    const operationId = `customer-update-${Date.now()}`;
    logger.info(`[${operationId}] 顧客更新開始 (ID: ${id})`);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        lastName: 'last_name',
        firstName: 'first_name',
        lastNameKana: 'last_name_kana',
        firstNameKana: 'first_name_kana',
        // fullName: フロントエンドから送信されるが、DBには存在しないのでスキップ
        // fullNameKana: フロントエンドから送信されるが、DBには存在しないのでスキップ
        gender: 'gender',
        birthDate: 'birth_date',
        phone: 'phone',
        mobile: 'mobile',
        email: 'email',
        postalCode: 'postal_code',
        address: 'address',
        registeredStoreId: 'store_id',
        lastVisitDate: 'last_visit_date',
        visitCount: 'visit_count',
        totalPurchaseAmount: 'total_purchase_amount',
        notes: 'notes'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (key in fieldMap && value !== undefined) {
          logger.debug(`[${operationId}] フィールド更新: ${key} = ${value} -> ${fieldMap[key]}`);
          setClauses.push(`${fieldMap[key]} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        await client.query('ROLLBACK');
        logger.debug(`[${operationId}] 更新項目がありません`);
        return await this.findById(id, storeId);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(id);
      
      let whereClause = `WHERE id = $${paramIndex}`;
      if (storeId) {
        paramIndex++;
        values.push(storeId);
        whereClause += ` AND store_id = $${paramIndex}`;
      }

      const query = `
        UPDATE customers 
        SET ${setClauses.join(', ')}
        ${whereClause}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      if (result.rows[0]) {
        const updatedCustomer = this.transformToCustomer(result.rows[0]);
        logger.info(`[${operationId}] 顧客更新完了`, { customerCode: updatedCustomer.customerCode });
        return updatedCustomer;
      }

      logger.warn(`[${operationId}] 更新対象の顧客が見つかりません`);
      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 顧客更新エラー:`, error);
      throw new Error(`顧客の更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }

  async search(params: CustomerSearchParams, storeId?: UUID): Promise<CustomerSearchResult> {
    const operationId = `customer-search-${Date.now()}`;
    logger.info(`[${operationId}] 顧客検索開始`, params);

    const startTime = Date.now();

    try {
      const { 
        search, 
        phone, 
        address, 
        page = 1, 
        limit = 20, 
        sort = 'name' 
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (search && search.trim()) {
        whereConditions.push(`(
          (c.last_name || ' ' || c.first_name) ILIKE $${paramIndex} OR 
          (c.last_name_kana || ' ' || c.first_name_kana) ILIKE $${paramIndex} OR
          c.customer_code ILIKE $${paramIndex} OR
          c.phone ILIKE $${paramIndex} OR
          c.mobile ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search.trim()}%`);
        paramIndex++;
      }

      if (phone && phone.trim()) {
        whereConditions.push(`(c.phone LIKE $${paramIndex} OR c.mobile LIKE $${paramIndex})`);
        queryParams.push(`%${phone.trim()}%`);
        paramIndex++;
      }

      if (address && address.trim()) {
        whereConditions.push(`c.address ILIKE $${paramIndex}`);
        queryParams.push(`%${address.trim()}%`);
        paramIndex++;
      }
      
      if (storeId) {
        whereConditions.push(`c.store_id = $${paramIndex}`);
        queryParams.push(storeId);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      const sortMap: Record<string, string> = {
        name: '(c.last_name || \' \' || c.first_name)',
        fullName: '(c.last_name || \' \' || c.first_name)',
        fullName_asc: '(c.last_name || \' \' || c.first_name) ASC',
        fullName_desc: '(c.last_name || \' \' || c.first_name) DESC',
        kana: '(c.last_name_kana || \' \' || c.first_name_kana)',
        last_visit_date: 'c.last_visit_date DESC'
      };

      const orderBy = sortMap[sort] || '(c.last_name || \' \' || c.first_name)';
      
      logger.debug(`[${operationId}] ORDER BY clause: ${orderBy}`);

      // 総件数取得
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        LEFT JOIN stores s ON c.store_id = s.id
        ${whereClause}
      `;

      logger.debug(`[${operationId}] 件数取得クエリ実行`);
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // データ取得（店舗情報含む）
      const dataQuery = `
        SELECT 
          c.*,
          s.store_code, s.name as store_name, s.address as store_address, 
          s.phone as store_phone, s.manager_name as store_manager_name
        FROM customers c
        LEFT JOIN stores s ON c.store_id = s.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      
      logger.debug(`[${operationId}] データ取得クエリ実行`);
      const dataResult = await this.db.query(dataQuery, queryParams);

      const customers = dataResult.rows.map(row => this.transformToCustomer(row));
      const totalPages = Math.ceil(total / limit);

      const searchResult = {
        customers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

      const duration = Date.now() - startTime;
      logger.info(`[${operationId}] 顧客検索完了 (${duration}ms)`, { 
        found: customers.length, 
        total, 
        page 
      });

      return searchResult;
    } catch (error) {
      logger.error(`[${operationId}] 顧客検索エラー:`, error);
      throw new Error(`顧客の検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async updateLastVisitDate(id: UUID, storeId?: UUID): Promise<void> {
    const operationId = `customer-updateVisit-${Date.now()}`;
    logger.debug(`[${operationId}] 来店日更新開始 (ID: ${id})`);

    try {
      const query = `
        UPDATE customers 
        SET last_visit_date = NOW(), visit_count = visit_count + 1, updated_at = NOW()
        WHERE id = $1${storeId ? ' AND store_id = $2' : ''}
      `;
      const params = storeId ? [id, storeId] : [id];

      await this.db.query(query, params);
      logger.debug(`[${operationId}] 来店日更新完了`);
    } catch (error) {
      logger.error(`[${operationId}] 来店日更新エラー:`, error);
      throw new Error(`来店日の更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async updateTotalPurchaseAmount(id: UUID, additionalAmount: number): Promise<void> {
    const operationId = `customer-updateAmount-${Date.now()}`;
    logger.debug(`[${operationId}] 購入金額更新開始`, { id, additionalAmount });

    try {
      const query = `
        UPDATE customers 
        SET total_purchase_amount = total_purchase_amount + $2, updated_at = NOW()
        WHERE id = $1
      `;

      await this.db.query(query, [id, additionalAmount]);
      logger.debug(`[${operationId}] 購入金額更新完了`);
    } catch (error) {
      logger.error(`[${operationId}] 購入金額更新エラー:`, error);
      throw new Error(`購入金額の更新に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  private async generateCustomerCode(client: PoolClient): Promise<string> {
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    
    const query = `
      SELECT customer_code 
      FROM customers 
      WHERE customer_code LIKE $1
      ORDER BY customer_code DESC 
      LIMIT 1
    `;

    const result = await client.query(query, [`${datePrefix}%`]);
    
    if (result.rows.length === 0) {
      return `${datePrefix}001`;
    }

    const lastCode = result.rows[0].customer_code;
    const sequence = parseInt(lastCode.slice(-3)) + 1;
    
    return `${datePrefix}${sequence.toString().padStart(3, '0')}`;
  }
}

// 処方箋リポジトリ
export class PrescriptionRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[PrescriptionRepository] 初期化完了');
  }

  private transformToPrescription(row: any): Prescription {
    return {
      id: row.id,
      customerId: row.customer_id,
      measuredDate: row.measured_date,
      rightEyeSphere: row.right_eye_sphere,
      rightEyeCylinder: row.right_eye_cylinder,
      rightEyeAxis: row.right_eye_axis,
      rightEyeVision: row.right_eye_vision,
      leftEyeSphere: row.left_eye_sphere,
      leftEyeCylinder: row.left_eye_cylinder,
      leftEyeAxis: row.left_eye_axis,
      leftEyeVision: row.left_eye_vision,
      pupilDistance: row.pupil_distance,
      notes: row.notes,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  async create(
    prescription: Omit<Prescription, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<Prescription> {
    const operationId = `prescription-create-${Date.now()}`;
    logger.info(`[${operationId}] 処方箋作成開始`, { customerId: prescription.customerId });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO prescriptions (
          customer_id, measured_date, right_eye_sphere, right_eye_cylinder,
          right_eye_axis, right_eye_vision, left_eye_sphere, left_eye_cylinder,
          left_eye_axis, left_eye_vision, pupil_distance, notes, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        prescription.customerId,
        prescription.measuredDate,
        prescription.rightEyeSphere,
        prescription.rightEyeCylinder,
        prescription.rightEyeAxis,
        prescription.rightEyeVision,
        prescription.leftEyeSphere,
        prescription.leftEyeCylinder,
        prescription.leftEyeAxis,
        prescription.leftEyeVision,
        prescription.pupilDistance,
        prescription.notes,
        createdBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const createdPrescription = this.transformToPrescription(result.rows[0]);
      logger.info(`[${operationId}] 処方箋作成完了`, { prescriptionId: createdPrescription.id });

      return createdPrescription;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 処方箋作成エラー:`, error);
      throw new Error(`処方箋の作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID): Promise<Prescription[]> {
    const operationId = `prescription-findByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 処方箋履歴検索開始`, { customerId });

    try {
      const query = `
        SELECT * FROM prescriptions 
        WHERE customer_id = $1 
        ORDER BY measured_date DESC, created_at DESC
      `;

      const result = await this.db.query(query, [customerId]);
      const prescriptions = result.rows.map(row => this.transformToPrescription(row));

      logger.debug(`[${operationId}] 処方箋履歴検索完了`, { count: prescriptions.length });
      return prescriptions;
    } catch (error) {
      logger.error(`[${operationId}] 処方箋履歴検索エラー:`, error);
      throw new Error(`処方箋履歴の検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async getLatestPrescription(customerId: UUID): Promise<Prescription | null> {
    const operationId = `prescription-getLatest-${Date.now()}`;
    logger.debug(`[${operationId}] 最新処方箋取得開始`, { customerId });

    try {
      const query = `
        SELECT * FROM prescriptions 
        WHERE customer_id = $1 
        ORDER BY measured_date DESC, created_at DESC 
        LIMIT 1
      `;

      const result = await this.db.query(query, [customerId]);
      
      if (result.rows[0]) {
        const prescription = this.transformToPrescription(result.rows[0]);
        logger.debug(`[${operationId}] 最新処方箋取得完了`);
        return prescription;
      }

      logger.debug(`[${operationId}] 処方箋が見つかりません`);
      return null;
    } catch (error) {
      logger.error(`[${operationId}] 最新処方箋取得エラー:`, error);
      throw new Error(`最新処方箋の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }
}

// 顧客画像リポジトリ
export class CustomerImageRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[CustomerImageRepository] 初期化完了');
  }

  private transformToCustomerImage(row: any): CustomerImage {
    return {
      id: row.id,
      customerId: row.customer_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      imageType: row.image_type,
      title: row.title,
      description: row.description,
      capturedDate: row.captured_date,
      hasAnnotations: row.has_annotations || false,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at
    };
  }

  async create(
    image: Omit<CustomerImage, 'id' | 'createdAt' | 'hasAnnotations'>,
    uploadedBy: UUID
  ): Promise<CustomerImage> {
    const operationId = `image-create-${Date.now()}`;
    logger.info(`[${operationId}] 画像登録開始`, { 
      customerId: image.customerId, 
      fileName: image.fileName 
    });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO customer_images (
          customer_id, file_name, file_path, file_size, mime_type,
          image_type, title, description, captured_date, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        image.customerId,
        image.fileName,
        image.filePath,
        image.fileSize,
        image.mimeType,
        image.imageType,
        image.title || null,
        image.description || null,
        image.capturedDate || null,
        uploadedBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const createdImage = this.transformToCustomerImage(result.rows[0]);
      logger.info(`[${operationId}] 画像登録完了`, { imageId: createdImage.id });

      return createdImage;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 画像登録エラー:`, error);
      throw new Error(`画像の登録に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID): Promise<CustomerImage[]> {
    const operationId = `image-findByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客画像検索開始`, { customerId });

    try {
      const query = `
        SELECT * FROM customer_images 
        WHERE customer_id = $1 
        ORDER BY created_at DESC
      `;

      const result = await this.db.query(query, [customerId]);
      const images = result.rows.map(row => this.transformToCustomerImage(row));

      logger.debug(`[${operationId}] 顧客画像検索完了`, { count: images.length });
      return images;
    } catch (error) {
      logger.error(`[${operationId}] 顧客画像検索エラー:`, error);
      throw new Error(`顧客画像の検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async delete(id: UUID): Promise<boolean> {
    const operationId = `image-delete-${Date.now()}`;
    logger.info(`[${operationId}] 画像削除開始`, { imageId: id });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // 関連する注釈も削除
      await client.query('DELETE FROM image_annotations WHERE customer_image_id = $1', [id]);
      
      const result = await client.query('DELETE FROM customer_images WHERE id = $1', [id]);
      
      await client.query('COMMIT');

      const deleted = (result.rowCount ?? 0) > 0;
      logger.info(`[${operationId}] 画像削除完了`, { deleted });

      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] 画像削除エラー:`, error);
      throw new Error(`画像の削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }
}

// 顧客メモリポジトリ
export class CustomerMemoRepository {
  private db: Pool;

  constructor() {
    this.db = db.getPool();
    logger.info('[CustomerMemoRepository] 初期化完了');
  }

  private transformToCustomerMemo(row: any): CustomerMemo {
    return {
      id: row.id,
      customerId: row.customer_id,
      memoText: row.memo_text,
      memoType: row.memo_type,
      createdBy: row.created_by,
      createdAt: row.created_at
    };
  }

  async create(
    memo: Omit<CustomerMemo, 'id' | 'createdAt'>,
    createdBy: UUID
  ): Promise<CustomerMemo> {
    const operationId = `memo-create-${Date.now()}`;
    logger.info(`[${operationId}] メモ作成開始`, { customerId: memo.customerId });

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO customer_memos (
          customer_id, memo_text, memo_type, created_by
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [
        memo.customerId,
        memo.memoText,
        memo.memoType,
        createdBy
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      const createdMemo = this.transformToCustomerMemo(result.rows[0]);
      logger.info(`[${operationId}] メモ作成完了`, { memoId: createdMemo.id });

      return createdMemo;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[${operationId}] メモ作成エラー:`, error);
      throw new Error(`メモの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      client.release();
    }
  }

  async findByCustomerId(customerId: UUID, limit = 50): Promise<CustomerMemo[]> {
    const operationId = `memo-findByCustomer-${Date.now()}`;
    logger.debug(`[${operationId}] 顧客メモ検索開始`, { customerId, limit });

    try {
      const query = `
        SELECT * FROM customer_memos 
        WHERE customer_id = $1 
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.db.query(query, [customerId, limit]);
      const memos = result.rows.map(row => this.transformToCustomerMemo(row));

      logger.debug(`[${operationId}] 顧客メモ検索完了`, { count: memos.length });
      return memos;
    } catch (error) {
      logger.error(`[${operationId}] 顧客メモ検索エラー:`, error);
      throw new Error(`顧客メモの検索に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  async delete(id: UUID): Promise<boolean> {
    const operationId = `memo-delete-${Date.now()}`;
    logger.info(`[${operationId}] メモ削除開始`, { memoId: id });

    try {
      const result = await this.db.query('DELETE FROM customer_memos WHERE id = $1', [id]);
      const deleted = (result.rowCount ?? 0) > 0;

      logger.info(`[${operationId}] メモ削除完了`, { deleted });
      return deleted;
    } catch (error) {
      logger.error(`[${operationId}] メモ削除エラー:`, error);
      throw new Error(`メモの削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }
}