const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS設定
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// JSON解析
app.use(express.json());

// 静的ファイル配信
app.use(express.static('public'));

// ルートエンドポイント
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: '眼鏡店顧客管理システムAPI - デモ環境',
    services: {
      database: 'MOCK',
      redis: 'MOCK'
    }
  });
});

// モック認証エンドポイント
app.post('/api/auth/login', (req, res) => {
  const { userCode, password, storeCode } = req.body;
  
  // デモ用の簡単な認証
  if ((userCode === 'admin' && password === 'password') || 
      (userCode === 'staff' && password === 'password')) {
    res.json({
      success: true,
      data: {
        accessToken: 'demo_access_token_' + Date.now(),
        refreshToken: 'demo_refresh_token_' + Date.now(),
        user: {
          id: '12345678-1234-5678-9012-123456789012',
          userCode: userCode,
          name: userCode === 'admin' ? '管理者' : 'スタッフ',
          email: `${userCode}@demo.com`,
          role: userCode,
          storeId: '87654321-4321-8765-2109-876543210987'
        },
        store: {
          id: '87654321-4321-8765-2109-876543210987',
          code: storeCode || 'demo',
          name: 'デモ店舗'
        },
        expiresIn: 3600
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: 'ユーザーコードまたはパスワードが正しくありません'
      }
    });
  }
});

// モック顧客一覧エンドポイント
app.get('/api/customers', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: '認証が必要です'
      }
    });
  }
  
  // モック顧客データ
  const mockCustomers = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      customerCode: 'C20250818001',
      fullName: '田中 太郎',
      fullNameKana: 'タナカ タロウ',
      phone: '03-1234-5678',
      email: 'tanaka@example.com',
      address: '東京都渋谷区1-1-1',
      visitCount: 5,
      totalPurchaseAmount: 150000,
      lastVisitDate: '2024-08-15T10:30:00Z',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-08-15T10:35:00Z'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      customerCode: 'C20250818002',
      fullName: '佐藤 花子',
      fullNameKana: 'サトウ ハナコ',
      phone: '03-9876-5432',
      email: 'sato@example.com',
      address: '神奈川県横浜市2-2-2',
      visitCount: 3,
      totalPurchaseAmount: 89000,
      lastVisitDate: '2024-08-10T14:20:00Z',
      createdAt: '2024-02-20T11:00:00Z',
      updatedAt: '2024-08-10T14:25:00Z'
    }
  ];
  
  res.json({
    success: true,
    data: mockCustomers,
    meta: {
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  });
});

// モック顧客作成エンドポイント
app.post('/api/customers', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: '認証が必要です'
      }
    });
  }
  
  const customerData = req.body;
  
  // モック顧客作成レスポンス
  const newCustomer = {
    id: '33333333-3333-3333-3333-333333333333',
    customerCode: 'C20250818' + String(Date.now()).substr(-3),
    fullName: `${customerData.lastName} ${customerData.firstName}`,
    fullNameKana: `${customerData.lastNameKana} ${customerData.firstNameKana}`,
    lastName: customerData.lastName,
    firstName: customerData.firstName,
    lastNameKana: customerData.lastNameKana,
    firstNameKana: customerData.firstNameKana,
    gender: customerData.gender,
    birthDate: customerData.birthDate,
    phone: customerData.phone,
    email: customerData.email,
    address: customerData.address,
    notes: customerData.notes,
    visitCount: 0,
    totalPurchaseAmount: 0,
    firstVisitDate: new Date().toISOString(),
    lastVisitDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    data: newCustomer
  });
});

// 404エラーハンドラ
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'エンドポイントが見つかりません'
    }
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 デモサーバーが起動しました`);
  console.log(`📡 ポート: ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`👓 認証画面: http://localhost:${PORT}`);
  console.log(`\n🔐 デモ認証情報:`);
  console.log(`   ユーザーコード: admin または staff`);
  console.log(`   パスワード: password`);
  console.log(`   店舗コード: demo`);
});