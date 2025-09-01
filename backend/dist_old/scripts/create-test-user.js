"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../utils/tsconfig-paths");
const database_1 = require("@/config/database");
const redis_1 = require("@/utils/redis");
const auth_1 = require("@/utils/auth");
async function createTestUser() {
    try {
        console.log('🔄 テストユーザー作成スクリプトを開始します...');
        if (!redis_1.redis.isReady()) {
            await redis_1.redis.connect();
        }
        const dbHealthy = await database_1.db.testConnection();
        if (!dbHealthy) {
            throw new Error('データベース接続に失敗しました');
        }
        const storeResult = await database_1.db.query('SELECT id FROM stores WHERE store_code = $1', ['TEST001']);
        if (storeResult.rows.length === 0) {
            throw new Error('テスト店舗が見つかりません。先に店舗を作成してください。');
        }
        const storeId = storeResult.rows[0].id;
        console.log(`✅ 店舗ID取得: ${storeId}`);
        const existingUser = await database_1.db.query('SELECT id FROM users WHERE user_code = $1', ['test001']);
        if (existingUser.rows.length > 0) {
            console.log('⚠️  テストユーザー "test001" は既に存在します');
            return;
        }
        const authUtils = auth_1.AuthUtils.getInstance();
        const passwordHash = await authUtils.hashPassword('testpass123');
        console.log('✅ パスワードハッシュ化完了');
        const insertResult = await database_1.db.query(`
      INSERT INTO users (store_id, user_code, name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_code, name, role
    `, [
            storeId,
            'test001',
            'テストユーザー',
            'test@example.com',
            passwordHash,
            'admin',
            true
        ]);
        const createdUser = insertResult.rows[0];
        console.log('✅ テストユーザー作成完了:');
        console.log(`   ID: ${createdUser.id}`);
        console.log(`   ユーザーコード: ${createdUser.user_code}`);
        console.log(`   名前: ${createdUser.name}`);
        console.log(`   権限: ${createdUser.role}`);
        console.log('\n🔑 ログイン情報:');
        console.log('   ユーザーコード: test001');
        console.log('   店舗コード: TEST001');
        console.log('   パスワード: testpass123');
        console.log('\n📝 テスト用cURLコマンド:');
        console.log('curl -X POST http://localhost:3001/api/auth/login \\');
        console.log('  -H "Content-Type: application/json" \\');
        console.log('  -d \'{"userCode": "test001", "storeCode": "TEST001", "password": "testpass123"}\'');
    }
    catch (error) {
        console.error('❌ エラーが発生しました:', error);
        process.exit(1);
    }
    finally {
        await database_1.db.close();
        await redis_1.redis.disconnect();
        process.exit(0);
    }
}
createTestUser();
//# sourceMappingURL=create-test-user.js.map