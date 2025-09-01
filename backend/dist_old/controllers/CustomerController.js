"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerController = void 0;
const database_1 = require("@/config/database");
const logger_1 = require("@/utils/logger");
const uuid_1 = require("uuid");
class CustomerController {
    async getCustomers(req, res) {
        try {
            const { search = '', phone = '', address = '', ownStoreOnly: ownStoreOnlyRaw = 'true', page = 1, limit = 10, sort = 'name' } = req.query;
            const ownStoreOnly = ownStoreOnlyRaw === 'true' || ownStoreOnlyRaw === true;
            const offset = (page - 1) * limit;
            let orderBy = 'c.last_name, c.first_name';
            switch (sort) {
                case 'kana':
                    orderBy = 'c.last_name_kana, c.first_name_kana';
                    break;
                case 'last_visit_date':
                    orderBy = 'c.last_visit_date DESC NULLS LAST';
                    break;
                default:
                    orderBy = 'c.last_name, c.first_name';
            }
            let whereConditions = [];
            let queryParams = [];
            let paramIndex = 1;
            if (search) {
                whereConditions.push(`(
          c.customer_code ILIKE $${paramIndex} OR
          CONCAT(c.last_name, c.first_name) ILIKE $${paramIndex} OR
          CONCAT(c.last_name_kana, c.first_name_kana) ILIKE $${paramIndex} OR
          c.email ILIKE $${paramIndex}
        )`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }
            if (phone) {
                whereConditions.push(`(
          c.phone ILIKE $${paramIndex} OR
          c.mobile ILIKE $${paramIndex}
        )`);
                queryParams.push(`%${phone}%`);
                paramIndex++;
            }
            if (address) {
                whereConditions.push(`c.address ILIKE $${paramIndex}`);
                queryParams.push(`%${address}%`);
                paramIndex++;
            }
            if (ownStoreOnly && req.user?.storeId) {
                whereConditions.push(`c.store_id = $${paramIndex}`);
                queryParams.push(req.user.storeId);
                paramIndex++;
            }
            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';
            console.log('=== 顧客検索デバッグ開始 ===');
            console.log('search:', search);
            console.log('whereClause:', whereClause);
            console.log('queryParams:', queryParams);
            console.log('userStoreId:', req.user?.storeId);
            console.log('=== デバッグ終了 ===');
            logger_1.logger.info('顧客検索デバッグ:', {
                search,
                whereClause,
                queryParams,
                userStoreId: req.user?.storeId
            });
            const countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        ${whereClause}
      `;
            logger_1.logger.info('実行するカウントクエリ:', countQuery);
            logger_1.logger.info('パラメータ:', queryParams);
            const countResult = await database_1.db.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total, 10);
            const customersQuery = `
        SELECT 
          c.id, c.customer_code, c.last_name, c.first_name,
          c.last_name_kana, c.first_name_kana,
          CONCAT(c.last_name, ' ', c.first_name) as full_name,
          CONCAT(c.last_name_kana, ' ', c.first_name_kana) as full_name_kana,
          c.gender, c.birth_date, c.phone, c.mobile, c.email,
          c.postal_code, c.address, c.first_visit_date, c.last_visit_date,
          c.visit_count, c.total_purchase_amount, c.notes,
          c.created_at, c.updated_at,
          CASE 
            WHEN c.birth_date IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(c.birth_date))
            ELSE NULL
          END as age
        FROM customers c
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
            queryParams.push(limit, offset);
            const customersResult = await database_1.db.query(customersQuery, queryParams);
            const customers = customersResult.rows.map((row) => ({
                id: row.id,
                customerCode: row.customer_code,
                lastName: row.last_name,
                firstName: row.first_name,
                lastNameKana: row.last_name_kana,
                firstNameKana: row.first_name_kana,
                fullName: row.full_name,
                fullNameKana: row.full_name_kana,
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
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
            const totalPages = Math.ceil(total / limit);
            const pagination = {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            };
            res.status(200).json({
                success: true,
                data: customers,
                meta: { pagination }
            });
        }
        catch (error) {
            logger_1.logger.error('顧客検索エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '顧客検索中にエラーが発生しました'
                }
            });
        }
    }
    async getCustomer(req, res) {
        try {
            const { id } = req.params;
            const customerQuery = `
        SELECT 
          c.id, c.customer_code, c.last_name, c.first_name,
          c.last_name_kana, c.first_name_kana,
          CONCAT(c.last_name, ' ', c.first_name) as full_name,
          CONCAT(c.last_name_kana, ' ', c.first_name_kana) as full_name_kana,
          c.gender, c.birth_date, c.phone, c.mobile, c.email,
          c.postal_code, c.address, c.first_visit_date, c.last_visit_date,
          c.visit_count, c.total_purchase_amount, c.notes,
          c.created_at, c.updated_at,
          CASE 
            WHEN c.birth_date IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(c.birth_date))
            ELSE NULL
          END as age
        FROM customers c
        WHERE c.id = $1
      `;
            const result = await database_1.db.query(customerQuery, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: '顧客が見つかりません'
                    }
                });
                return;
            }
            const row = result.rows[0];
            const customer = {
                id: row.id,
                customerCode: row.customer_code,
                lastName: row.last_name,
                firstName: row.first_name,
                lastNameKana: row.last_name_kana,
                firstNameKana: row.first_name_kana,
                fullName: row.full_name,
                fullNameKana: row.full_name_kana,
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
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            res.status(200).json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            logger_1.logger.error('顧客詳細取得エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '顧客詳細の取得中にエラーが発生しました'
                }
            });
        }
    }
    async createCustomer(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: '認証が必要です'
                    }
                });
                return;
            }
            const { lastName, firstName, lastNameKana, firstNameKana, gender, birthDate, phone, mobile, email, postalCode, address, notes } = req.body;
            const customerCode = await this.generateCustomerCode();
            const customerId = (0, uuid_1.v4)();
            const fullName = `${lastName} ${firstName}`;
            const fullNameKana = lastNameKana && firstNameKana ? `${lastNameKana} ${firstNameKana}` : null;
            const insertQuery = `
        INSERT INTO customers (
          id, customer_code, last_name, first_name, last_name_kana, first_name_kana,
          gender, birth_date, phone, mobile, email, postal_code, address,
          visit_count, total_purchase_amount, notes, first_visit_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW()
        ) RETURNING *,
          CONCAT(last_name, ' ', first_name) as full_name,
          CONCAT(last_name_kana, ' ', first_name_kana) as full_name_kana,
          CASE 
            WHEN birth_date IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(birth_date))
            ELSE NULL
          END as age
      `;
            const result = await database_1.db.query(insertQuery, [
                customerId,
                customerCode,
                lastName,
                firstName,
                lastNameKana,
                firstNameKana,
                gender,
                birthDate,
                phone,
                mobile,
                email,
                postalCode,
                address,
                0,
                0,
                notes,
                new Date().toISOString()
            ]);
            const row = result.rows[0];
            const customer = {
                id: row.id,
                customerCode: row.customer_code,
                lastName: row.last_name,
                firstName: row.first_name,
                lastNameKana: row.last_name_kana,
                firstNameKana: row.first_name_kana,
                fullName: row.full_name,
                fullNameKana: row.full_name_kana,
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
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            logger_1.logger.info(`顧客作成成功: ${customerCode} by ${req.user.userCode}`);
            res.status(201).json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            if (error.code === '23505') {
                res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_ERROR',
                        message: '顧客コードが重複しています'
                    }
                });
                return;
            }
            logger_1.logger.error('顧客作成エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '顧客作成中にエラーが発生しました'
                }
            });
        }
    }
    async updateCustomer(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: '認証が必要です'
                    }
                });
                return;
            }
            const { id } = req.params;
            const updateData = req.body;
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            const allowedFields = [
                'last_name', 'first_name', 'last_name_kana', 'first_name_kana',
                'gender', 'birth_date', 'phone', 'mobile', 'email',
                'postal_code', 'address', 'notes'
            ];
            for (const field of allowedFields) {
                const camelField = this.toCamelCase(field);
                if (updateData.hasOwnProperty(camelField)) {
                    updateFields.push(`${field} = $${paramIndex}`);
                    updateValues.push(updateData[camelField]);
                    paramIndex++;
                }
            }
            if (updateFields.length === 0) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: '更新するフィールドが指定されていません'
                    }
                });
                return;
            }
            updateFields.push('updated_at = NOW()');
            updateValues.push(id);
            const updateQuery = `
        UPDATE customers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *,
          CONCAT(last_name, ' ', first_name) as full_name,
          CONCAT(last_name_kana, ' ', first_name_kana) as full_name_kana,
          CASE 
            WHEN birth_date IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(birth_date))
            ELSE NULL
          END as age
      `;
            const result = await database_1.db.query(updateQuery, updateValues);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: '顧客が見つかりません'
                    }
                });
                return;
            }
            const row = result.rows[0];
            const customer = {
                id: row.id,
                customerCode: row.customer_code,
                lastName: row.last_name,
                firstName: row.first_name,
                lastNameKana: row.last_name_kana,
                firstNameKana: row.first_name_kana,
                fullName: row.full_name,
                fullNameKana: row.full_name_kana,
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
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            logger_1.logger.info(`顧客更新成功: ${customer.customerCode} by ${req.user.userCode}`);
            res.status(200).json({
                success: true,
                data: customer
            });
        }
        catch (error) {
            logger_1.logger.error('顧客更新エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '顧客更新中にエラーが発生しました'
                }
            });
        }
    }
    async deleteCustomer(req, res) {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'AUTHENTICATION_REQUIRED',
                        message: '認証が必要です'
                    }
                });
                return;
            }
            if (req.user.role !== 'admin') {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'AUTHORIZATION_FAILED',
                        message: '顧客削除は管理者のみ実行できます'
                    }
                });
                return;
            }
            const { id } = req.params;
            const relatedDataQuery = `
        SELECT 
          (SELECT COUNT(*) FROM orders WHERE customer_id = $1) as order_count,
          (SELECT COUNT(*) FROM prescriptions WHERE customer_id = $1) as prescription_count,
          (SELECT COUNT(*) FROM customer_images WHERE customer_id = $1) as image_count
      `;
            const relatedResult = await database_1.db.query(relatedDataQuery, [id]);
            const relatedData = relatedResult.rows[0];
            if (relatedData.order_count > 0 || relatedData.prescription_count > 0 || relatedData.image_count > 0) {
                res.status(409).json({
                    success: false,
                    error: {
                        code: 'CONFLICT_ERROR',
                        message: '関連データが存在するため削除できません',
                        details: {
                            orders: relatedData.order_count,
                            prescriptions: relatedData.prescription_count,
                            images: relatedData.image_count
                        }
                    }
                });
                return;
            }
            const deleteQuery = `
        UPDATE customers 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING customer_code
      `;
            const result = await database_1.db.query(deleteQuery, [id]);
            if (result.rows.length === 0) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: '顧客が見つかりません'
                    }
                });
                return;
            }
            const customerCode = result.rows[0].customer_code;
            logger_1.logger.info(`顧客削除成功: ${customerCode} by ${req.user.userCode}`);
            res.status(200).json({
                success: true,
                data: { message: '顧客を削除しました' }
            });
        }
        catch (error) {
            logger_1.logger.error('顧客削除エラー:', error);
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: '顧客削除中にエラーが発生しました'
                }
            });
        }
    }
    async generateCustomerCode() {
        for (let i = 0; i < 10; i++) {
            const randomNum = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
            const customerCode = `C${randomNum}`;
            const existsQuery = 'SELECT id FROM customers WHERE customer_code = $1';
            const result = await database_1.db.query(existsQuery, [customerCode]);
            if (result.rows.length === 0) {
                return customerCode;
            }
        }
        throw new Error('顧客コードの生成に失敗しました');
    }
    toCamelCase(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }
}
exports.CustomerController = CustomerController;
//# sourceMappingURL=CustomerController.js.map