const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = 3001;

// CORS設定
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// データベース接続（フォールバック対応）
let db;
try {
  db = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'glasses_store_db',
    user: 'glasses_user',
    password: 'changeme_postgres',
    connectionTimeoutMillis: 5000,
    max: 10
  });
  
  // 接続テスト
  db.query('SELECT 1').then(() => {
    console.log('Database connection successful');
  }).catch(error => {
    console.warn('Database connection test failed, will use mock data:', error.message);
    db = null;
  });
} catch (error) {
  console.warn('Database connection failed, using mock data:', error.message);
  db = null;
}

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ログインAPI（簡易版）
app.post('/api/auth/login', async (req, res) => {
  try {
    const { user_code, password, store_code } = req.body;
    
    console.log('Login attempt:', { user_code, store_code, password: '***' });
    
    // 簡易認証（実際のハッシュ検証はスキップ）
    if (user_code === 'test001' && password === 'password123' && store_code === 'TEST001') {
      const token = 'test-token-' + Date.now();
      const user = {
        id: 'aa753b2c-3de2-40b0-9b30-9ecc2cd67887',
        userCode: 'test001',
        name: 'テストユーザー',
        store: { id: 'b9a98fac-cd05-4075-b024-1e28d696391a', name: 'テスト店舗' }
      };
      
      res.json({
        success: true,
        data: {
          accessToken: token,
          user: user
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: '認証情報が正しくありません' }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'ログイン処理中にエラーが発生しました' }
    });
  }
});

// モックデータ
const mockCustomers = [
  {
    id: 'c1',
    customer_code: 'C001',
    last_name: '田中',
    first_name: '太郎',
    last_name_kana: 'タナカ',
    first_name_kana: 'タロウ',
    phone: '03-1234-5678',
    mobile: '090-1234-5678',
    email: 'tanaka@example.com',
    address: '東京都渋谷区渋谷1-1-1',
    last_visit_date: '2024-01-15',
    visit_count: 5,
    total_purchase_amount: 45000
  },
  {
    id: 'c2',
    customer_code: 'C002',
    last_name: '佐藤',
    first_name: '花子',
    last_name_kana: 'サトウ',
    first_name_kana: 'ハナコ',
    phone: '03-2345-6789',
    mobile: '090-2345-6789',
    email: 'sato@example.com',
    address: '東京都新宿区新宿2-2-2',
    last_visit_date: '2024-02-20',
    visit_count: 3,
    total_purchase_amount: 32000
  },
  {
    id: 'c3',
    customer_code: 'C003',
    last_name: '鈴木',
    first_name: '一郎',
    last_name_kana: 'スズキ',
    first_name_kana: 'イチロウ',
    phone: '03-3456-7890',
    mobile: '090-3456-7890',
    email: 'suzuki@example.com',
    address: '東京都品川区品川3-3-3',
    last_visit_date: '2024-03-10',
    visit_count: 8,
    total_purchase_amount: 78000
  }
];

// 顧客検索API（簡易版）
app.get('/api/customers', async (req, res) => {
  try {
    const { search = '', phone = '', address = '', ownStoreOnly = 'true', page = 1, limit = 10, sort = 'name' } = req.query;
    
    console.log('Customer search:', { search, phone, address, ownStoreOnly, page, limit, sort });
    
    // データベース接続が利用できない場合はモックデータを使用
    let customers = [];
    let total = 0;
    
    if (db) {
      try {
        // データベースから取得を試行
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        
        if (search) {
          whereConditions.push(`(
            customer_code ILIKE $${paramIndex} OR
            CONCAT(last_name, ' ', first_name) ILIKE $${paramIndex} OR
            CONCAT(last_name_kana, ' ', first_name_kana) ILIKE $${paramIndex} OR
            email ILIKE $${paramIndex}
          )`);
          params.push(`%${search}%`);
          paramIndex++;
        }
        
        if (phone) {
          whereConditions.push(`(phone ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex})`);
          params.push(`%${phone}%`);
          paramIndex++;
        }
        
        if (address) {
          whereConditions.push(`address ILIKE $${paramIndex}`);
          params.push(`%${address}%`);
          paramIndex++;
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        let orderBy = 'last_name, first_name';
        if (sort === 'kana') orderBy = 'last_name_kana, first_name_kana';
        if (sort === 'last_visit_date') orderBy = 'last_visit_date DESC NULLS LAST';
        
        const offset = (page - 1) * limit;
        
        // 件数取得
        const countQuery = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
        const countResult = await db.query(countQuery, params);
        total = parseInt(countResult.rows[0].total, 10);
        
        // データ取得
        const dataQuery = `
          SELECT 
            c.id, c.customer_code, c.last_name, c.first_name,
            c.last_name_kana, c.first_name_kana,
            CONCAT(c.last_name, ' ', c.first_name) as full_name,
            CONCAT(c.last_name_kana, ' ', c.first_name_kana) as full_name_kana,
            c.gender, c.birth_date, c.phone, c.mobile, c.email, 
            c.postal_code, c.address, c.notes, c.last_visit_date,
            c.visit_count, c.total_purchase_amount, c.store_id,
            s.store_code, s.name as store_name
          FROM customers c
          LEFT JOIN stores s ON c.store_id = s.id
          ${whereClause}
          ORDER BY ${orderBy}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        const dataResult = await db.query(dataQuery, params);
        
        customers = dataResult.rows.map(row => ({
          id: row.id,
          customerCode: row.customer_code,
          fullName: row.full_name,
          fullNameKana: row.full_name_kana,
          gender: row.gender,
          birthDate: row.birth_date,
          phone: row.phone,
          mobile: row.mobile,
          email: row.email,
          postalCode: row.postal_code,
          address: row.address,
          notes: row.notes,
          lastVisitDate: row.last_visit_date,
          visitCount: row.visit_count || 0,
          totalPurchaseAmount: row.total_purchase_amount || 0,
          storeId: row.store_id,
          store: {
            id: row.store_id,
            storeCode: row.store_code,
            name: row.store_name
          }
        }));
        
      } catch (error) {
        console.warn('Database query failed, using mock data:', error.message);
        db = null; // 以降はモックデータを使用
      }
    }
    
    // データベース接続がない場合、またはクエリに失敗した場合はモックデータを使用
    if (!db) {
      console.log('Using mock data for customer search');
      let filteredCustomers = [...mockCustomers];
      
      // 検索フィルタリング
      if (search) {
        const searchLower = search.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer => 
          customer.customer_code.toLowerCase().includes(searchLower) ||
          (customer.last_name + ' ' + customer.first_name).toLowerCase().includes(searchLower) ||
          (customer.last_name_kana + ' ' + customer.first_name_kana).toLowerCase().includes(searchLower) ||
          customer.email.toLowerCase().includes(searchLower)
        );
      }
      
      if (phone) {
        filteredCustomers = filteredCustomers.filter(customer => 
          customer.phone.includes(phone) || customer.mobile.includes(phone)
        );
      }
      
      if (address) {
        filteredCustomers = filteredCustomers.filter(customer => 
          customer.address.includes(address)
        );
      }
      
      // ソート
      if (sort === 'kana') {
        filteredCustomers.sort((a, b) => (a.last_name_kana + a.first_name_kana).localeCompare(b.last_name_kana + b.first_name_kana));
      } else if (sort === 'last_visit_date') {
        filteredCustomers.sort((a, b) => new Date(b.last_visit_date) - new Date(a.last_visit_date));
      } else {
        filteredCustomers.sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name));
      }
      
      total = filteredCustomers.length;
      const offset = (page - 1) * limit;
      const paginatedCustomers = filteredCustomers.slice(offset, offset + parseInt(limit));
      
      customers = paginatedCustomers.map(customer => ({
        id: customer.id,
        customerCode: customer.customer_code,
        fullName: customer.last_name + ' ' + customer.first_name,
        fullNameKana: customer.last_name_kana + ' ' + customer.first_name_kana,
        phone: customer.phone,
        mobile: customer.mobile,
        email: customer.email,
        address: customer.address,
        lastVisitDate: customer.last_visit_date,
        visitCount: customer.visit_count,
        totalPurchaseAmount: customer.total_purchase_amount
      }));
    }
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      success: true,
      data: customers,
      meta: {
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages
        }
      }
    });
    
  } catch (error) {
    console.error('Customer search error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '顧客検索中にエラーが発生しました' }
    });
  }
});

// 顧客詳細取得API
app.get('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Customer detail request for ID:', id);
    
    if (db) {
      try {
        // データベースから顧客詳細を取得
        const query = `
          SELECT 
            c.id, c.customer_code, c.last_name, c.first_name,
            c.last_name_kana, c.first_name_kana,
            CONCAT(c.last_name, ' ', c.first_name) as full_name,
            CONCAT(c.last_name_kana, ' ', c.first_name_kana) as full_name_kana,
            c.gender, c.birth_date, c.phone, c.mobile, c.email, 
            c.postal_code, c.address, c.notes, c.last_visit_date,
            c.visit_count, c.total_purchase_amount, c.store_id,
            s.store_code, s.name as store_name
          FROM customers c
          LEFT JOIN stores s ON c.store_id = s.id
          WHERE c.id = $1
        `;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '指定された顧客が見つかりません' }
          });
        }
        
        const row = result.rows[0];
        const customer = {
          id: row.id,
          customerCode: row.customer_code,
          fullName: row.full_name,
          fullNameKana: row.full_name_kana,
          gender: row.gender,
          birthDate: row.birth_date,
          phone: row.phone,
          mobile: row.mobile,
          email: row.email,
          postalCode: row.postal_code,
          address: row.address,
          notes: row.notes,
          lastVisitDate: row.last_visit_date,
          visitCount: row.visit_count || 0,
          totalPurchaseAmount: row.total_purchase_amount || 0,
          storeId: row.store_id,
          store: {
            id: row.store_id,
            storeCode: row.store_code,
            name: row.store_name
          }
        };
        
        res.json({
          success: true,
          data: customer
        });
        
      } catch (error) {
        console.warn('Database query failed, using mock data:', error.message);
        // データベースエラーの場合はモックデータを使用
        const mockCustomer = mockCustomers.find(c => c.id === id);
        if (mockCustomer) {
          res.json({
            success: true,
            data: {
              id: mockCustomer.id,
              customerCode: mockCustomer.customer_code,
              fullName: mockCustomer.last_name + ' ' + mockCustomer.first_name,
              fullNameKana: mockCustomer.last_name_kana + ' ' + mockCustomer.first_name_kana,
              phone: mockCustomer.phone,
              mobile: mockCustomer.mobile,
              email: mockCustomer.email,
              address: mockCustomer.address,
              lastVisitDate: mockCustomer.last_visit_date,
              visitCount: mockCustomer.visit_count,
              totalPurchaseAmount: mockCustomer.total_purchase_amount
            }
          });
        } else {
          res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '指定された顧客が見つかりません' }
          });
        }
      }
    } else {
      // データベース接続がない場合はモックデータを使用
      const mockCustomer = mockCustomers.find(c => c.id === id);
      if (mockCustomer) {
        res.json({
          success: true,
          data: {
            id: mockCustomer.id,
            customerCode: mockCustomer.customer_code,
            fullName: mockCustomer.last_name + ' ' + mockCustomer.first_name,
            fullNameKana: mockCustomer.last_name_kana + ' ' + mockCustomer.first_name_kana,
            phone: mockCustomer.phone,
            mobile: mockCustomer.mobile,
            email: mockCustomer.email,
            address: mockCustomer.address,
            lastVisitDate: mockCustomer.last_visit_date,
            visitCount: mockCustomer.visit_count,
            totalPurchaseAmount: mockCustomer.total_purchase_amount
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: '指定された顧客が見つかりません' }
        });
      }
    }
    
  } catch (error) {
    console.error('Customer detail error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '顧客詳細取得中にエラーが発生しました' }
    });
  }
});

// 顧客新規作成API
app.post('/api/customers', async (req, res) => {
  try {
    const { lastName, firstName, lastNameKana, firstNameKana, gender, birthDate, phone, mobile, email, postalCode, address, notes, storeId } = req.body;
    
    console.log('Customer creation request:', { lastName, firstName, phone, email });
    
    if (!lastName || !firstName || !lastNameKana || !firstNameKana) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '姓名とフリガナは必須です' }
      });
    }
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '所属店舗は必須です' }
      });
    }
    
    // メールアドレスの形式チェック
    if (email && email.trim()) {
      const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'メールアドレスの形式が正しくありません' }
        });
      }
    }
    
    if (db) {
      try {
        // 新しい顧客コードを生成
        const codeResult = await db.query('SELECT MAX(customer_code) as max_code FROM customers WHERE customer_code ~ \'^C[0-9]+$\'');
        let nextCode = 'C00000001';
        
        if (codeResult.rows[0].max_code) {
          const currentMax = parseInt(codeResult.rows[0].max_code.substring(1));
          nextCode = 'C' + String(currentMax + 1).padStart(8, '0');
        }
        
        const insertQuery = `
          INSERT INTO customers (
            customer_code, last_name, first_name, last_name_kana, first_name_kana,
            gender, birth_date, phone, mobile, email, postal_code, address, notes,
            store_id, visit_count, total_purchase_amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, 0, NOW(), NOW())
          RETURNING id, customer_code
        `;
        
        const result = await db.query(insertQuery, [
          nextCode, lastName, firstName, lastNameKana, firstNameKana,
          gender || null, birthDate || null, phone || null, mobile || null, 
          email || null, postalCode || null, address || null, notes || null,
          storeId
        ]);
        
        const newCustomer = result.rows[0];
        
        res.json({
          success: true,
          data: {
            id: newCustomer.id,
            customerCode: newCustomer.customer_code
          },
          message: '顧客を登録しました'
        });
        
      } catch (error) {
        console.error('Database insert failed:', error);
        
        // メール制約違反の場合
        if (error.constraint === 'email_format_customer') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'メールアドレスの形式が正しくありません' }
          });
        }
        
        res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: '顧客登録中にエラーが発生しました' }
        });
      }
    } else {
      // データベース接続がない場合はモックレスポンス
      res.json({
        success: true,
        data: {
          id: 'mock-' + Date.now(),
          customerCode: 'C' + String(Math.floor(Math.random() * 100000)).padStart(8, '0')
        },
        message: '顧客を登録しました（モック）'
      });
    }
    
  } catch (error) {
    console.error('Customer creation error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '顧客登録中にエラーが発生しました' }
    });
  }
});

// 顧客更新API
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lastName, firstName, lastNameKana, firstNameKana, gender, birthDate, phone, mobile, email, postalCode, address, notes, storeId } = req.body;
    
    console.log('Customer update request for ID:', id, { lastName, firstName, phone, email });
    
    if (!lastName || !firstName || !lastNameKana || !firstNameKana) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '姓名とフリガナは必須です' }
      });
    }
    
    if (!storeId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '所属店舗は必須です' }
      });
    }
    
    // メールアドレスの形式チェック
    if (email && email.trim()) {
      const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'メールアドレスの形式が正しくありません' }
        });
      }
    }
    
    if (db) {
      try {
        const updateQuery = `
          UPDATE customers SET
            last_name = $2, first_name = $3, last_name_kana = $4, first_name_kana = $5,
            gender = $6, birth_date = $7, phone = $8, mobile = $9, email = $10,
            postal_code = $11, address = $12, notes = $13, store_id = $14, updated_at = NOW()
          WHERE id = $1
          RETURNING id, customer_code
        `;
        
        const result = await db.query(updateQuery, [
          id, lastName, firstName, lastNameKana, firstNameKana,
          gender || null, birthDate || null, phone || null, mobile || null, 
          email || null, postalCode || null, address || null, notes || null,
          storeId
        ]);
        
        if (result.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '指定された顧客が見つかりません' }
          });
        }
        
        res.json({
          success: true,
          data: {
            id: result.rows[0].id,
            customerCode: result.rows[0].customer_code
          },
          message: '顧客情報を更新しました'
        });
        
      } catch (error) {
        console.error('Database update failed:', error);
        
        // メール制約違反の場合
        if (error.constraint === 'email_format_customer') {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'メールアドレスの形式が正しくありません' }
          });
        }
        
        res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: '顧客更新中にエラーが発生しました' }
        });
      }
    } else {
      // データベース接続がない場合はモックレスポンス
      res.json({
        success: true,
        data: {
          id: id,
          customerCode: 'C00000001'
        },
        message: '顧客情報を更新しました（モック）'
      });
    }
    
  } catch (error) {
    console.error('Customer update error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '顧客更新中にエラーが発生しました' }
    });
  }
});

// 顧客削除API
app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Customer deletion request for ID:', id);
    
    if (db) {
      try {
        // 顧客が存在するかチェック
        const checkQuery = 'SELECT id, customer_code, last_name, first_name FROM customers WHERE id = $1';
        const checkResult = await db.query(checkQuery, [id]);
        
        if (checkResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: '指定された顧客が見つかりません' }
          });
        }
        
        const customer = checkResult.rows[0];
        
        // 顧客を削除
        const deleteQuery = 'DELETE FROM customers WHERE id = $1';
        await db.query(deleteQuery, [id]);
        
        res.json({
          success: true,
          message: `${customer.last_name} ${customer.first_name}さん（${customer.customer_code}）を削除しました`
        });
        
      } catch (error) {
        console.error('Database delete failed:', error);
        
        // 外部キー制約エラーをチェック
        if (error.code === '23503') {
          return res.status(400).json({
            success: false,
            error: { code: 'CONSTRAINT_ERROR', message: 'この顧客には関連する注文データがあるため削除できません' }
          });
        }
        
        res.status(500).json({
          success: false,
          error: { code: 'SERVER_ERROR', message: '顧客削除中にエラーが発生しました' }
        });
      }
    } else {
      // データベース接続がない場合はモックレスポンス
      res.json({
        success: true,
        message: '顧客を削除しました（モック）'
      });
    }
    
  } catch (error) {
    console.error('Customer deletion error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '顧客削除中にエラーが発生しました' }
    });
  }
});

// 店舗一覧取得API
app.get('/api/stores', async (req, res) => {
  try {
    console.log('Store list request');
    
    if (db) {
      try {
        const query = 'SELECT id, store_code, name FROM stores ORDER BY name';
        const result = await db.query(query);
        
        const stores = result.rows.map(row => ({
          id: row.id,
          storeCode: row.store_code,
          name: row.name
        }));
        
        res.json({
          success: true,
          data: stores
        });
        
      } catch (error) {
        console.warn('Database query failed, using mock stores:', error.message);
        // データベースエラーの場合はモックデータを返す
        const mockStores = [
          { id: 'b9a98fac-cd05-4075-b024-1e28d696391a', storeCode: 'TEST001', name: 'テスト店舗' },
          { id: 'mock-store-2', storeCode: 'STORE002', name: '新宿店' },
          { id: 'mock-store-3', storeCode: 'STORE003', name: '渋谷店' }
        ];
        
        res.json({
          success: true,
          data: mockStores
        });
      }
    } else {
      // データベース接続がない場合はモックデータを返す
      const mockStores = [
        { id: 'b9a98fac-cd05-4075-b024-1e28d696391a', storeCode: 'TEST001', name: 'テスト店舗' },
        { id: 'mock-store-2', storeCode: 'STORE002', name: '新宿店' },
        { id: 'mock-store-3', storeCode: 'STORE003', name: '渋谷店' }
      ];
      
      res.json({
        success: true,
        data: mockStores
      });
    }
    
  } catch (error) {
    console.error('Store list error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: '店舗一覧取得中にエラーが発生しました' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Login page: http://localhost:${PORT}/login.html`);
  console.log(`Customer search: http://localhost:${PORT}/customer-search.html`);
});