const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// ミドルウェア設定
app.use(cors());
app.use(express.json());
app.use(express.static('mockups'));

// テスト用ログインAPI
app.post('/api/auth/login', (req, res) => {
    console.log('Login attempt:', req.body);
    
    const { user_code, password, store_id } = req.body;
    
    // 簡単な認証チェック
    if (user_code === 'staff001' && password === 'password123') {
        res.json({
            success: true,
            data: {
                access_token: 'test-access-token-123',
                refresh_token: 'test-refresh-token-456',
                user: {
                    id: 'test-user-id',
                    user_code: user_code,
                    name: 'テストユーザー',
                    role: 'staff',
                    store_id: store_id
                }
            }
        });
    } else {
        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_CREDENTIALS',
                message: 'ユーザーIDまたはパスワードが正しくありません'
            }
        });
    }
});

// 店舗一覧API
app.get('/api/stores', (req, res) => {
    res.json({
        success: true,
        data: [
            { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: '新宿本店', store_code: 'STORE001' },
            { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab', name: '渋谷店', store_code: 'STORE002' },
            { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaac', name: '池袋店', store_code: 'STORE003' }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`テスト用APIサーバーが http://localhost:${PORT} で起動しました`);
    console.log(`ログイン画面: http://localhost:${PORT}/login.html`);
});