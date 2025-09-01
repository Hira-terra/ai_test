const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const MilestoneTracker = require('./MilestoneTracker');

/**
 * 統合テスト用認証支援ユーティリティ
 * 
 * このユーティリティは統合テスト実行時の認証処理を支援し、
 * 実際のJWTトークン生成とユーザー認証状態をエミュレートします。
 */
class TestAuthHelper {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
    this.testUsers = new Map();
    this.testTokens = new Map();
  }

  // テスト用ユーザーの作成
  async createTestUser(transaction, userData = {}) {
    const tracker = new MilestoneTracker('テストユーザー作成');
    
    try {
      tracker.setOperation('ユーザーデータ準備');
      
      const testId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const defaultUser = {
        id: uuidv4(),
        user_code: userData.userCode || `testuser${testId}`,
        name: userData.name || `テストユーザー${testId}`,
        email: userData.email || `${testId}@test.example.com`,
        role: userData.role || 'staff',
        is_active: true,
        store_id: userData.storeId || uuidv4(),
        password_hash: await bcrypt.hash(userData.password || 'test123456', 12)
      };

      tracker.mark('ユーザーデータ準備完了');

      tracker.setOperation('ユーザーDB登録');
      
      // ユーザーをデータベースに挿入
      const userInsertQuery = `
        INSERT INTO users (
          id, user_code, name, email, role, is_active, 
          store_id, password_hash, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING id, user_code, name, email, role, is_active, store_id, created_at
      `;

      const userResult = await transaction.query(userInsertQuery, [
        defaultUser.id,
        defaultUser.user_code,
        defaultUser.name,
        defaultUser.email,
        defaultUser.role,
        defaultUser.is_active,
        defaultUser.store_id,
        defaultUser.password_hash
      ]);

      const createdUser = userResult.rows[0];
      tracker.markSuccess('ユーザー登録完了', createdUser.user_code);

      // 店舗データが必要な場合は作成
      if (!userData.skipStoreCreation) {
        tracker.setOperation('テスト店舗作成');
        
        const storeInsertQuery = `
          INSERT INTO stores (
            id, store_code, name, address, phone, manager_name, 
            created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
          RETURNING id, store_code, name
        `;

        const storeData = [
          defaultUser.store_id,
          userData.storeCode || `store${testId}`,
          userData.storeName || `テスト店舗${testId}`,
          userData.storeAddress || `テスト県テスト市テスト町1-1`,
          userData.storePhone || '03-1234-5678',
          userData.storeManager || createdUser.name
        ];

        const storeResult = await transaction.query(storeInsertQuery, storeData);
        
        if (storeResult.rows.length > 0) {
          tracker.markSuccess('店舗作成完了', storeResult.rows[0].store_code);
        } else {
          tracker.markWarning('店舗作成スキップ', '既存店舗を使用');
        }
      }

      // テストユーザーをメモリに保存
      this.testUsers.set(createdUser.id, {
        ...createdUser,
        plainPassword: userData.password || 'test123456',
        storeId: defaultUser.store_id
      });

      tracker.markSuccess('テストユーザー作成完了', `ID: ${createdUser.id}`);
      return {
        user: createdUser,
        plainPassword: userData.password || 'test123456',
        storeId: defaultUser.store_id
      };

    } catch (error) {
      tracker.markError('テストユーザー作成', error);
      throw new Error(`テストユーザー作成失敗: ${error.message}`);
    }
  }

  // JWTトークン生成
  generateTestTokens(user) {
    const tracker = new MilestoneTracker('トークン生成');
    
    try {
      tracker.setOperation('JWTペイロード作成');
      
      const payload = {
        id: user.id || user.user_id,
        userCode: user.user_code,
        role: user.role,
        storeId: user.store_id || user.storeId,
        iat: Math.floor(Date.now() / 1000)
      };

      tracker.mark('ペイロード準備完了');

      tracker.setOperation('アクセストークン生成');
      const accessToken = jwt.sign(payload, this.jwtSecret, { 
        expiresIn: '1h',
        issuer: 'glasses-store-test',
        audience: 'glasses-store-client'
      });
      
      tracker.mark('アクセストークン完了');

      tracker.setOperation('リフレッシュトークン生成');
      const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { 
        expiresIn: '7d',
        issuer: 'glasses-store-test',
        audience: 'glasses-store-client' 
      });

      tracker.markSuccess('トークン生成完了', `ユーザー: ${user.user_code}`);

      const tokens = {
        accessToken,
        refreshToken,
        user: {
          id: user.id || user.user_id,
          userCode: user.user_code,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.store_id || user.storeId
        },
        expiresIn: 3600
      };

      // トークンをメモリに保存
      this.testTokens.set(accessToken, tokens);

      return tokens;

    } catch (error) {
      tracker.markError('トークン生成', error);
      throw new Error(`トークン生成失敗: ${error.message}`);
    }
  }

  // 認証ヘッダー生成
  createAuthHeader(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  // マルチパート認証ヘッダー生成（ファイルアップロード用）
  createMultipartAuthHeader(accessToken) {
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
      // Content-Typeは設定しない（multipartの境界がmulterで自動設定される）
    };
  }

  // ログインシミュレーション
  async simulateLogin(transaction, userCode, password, storeCode) {
    const tracker = new MilestoneTracker('ログインシミュレーション');
    
    try {
      tracker.setOperation('ユーザー検索');
      
      const loginQuery = `
        SELECT 
          u.id, u.user_code, u.name, u.email, u.role, u.is_active,
          u.password_hash, u.store_id, s.store_code, s.name as store_name
        FROM users u
        INNER JOIN stores s ON u.store_id = s.id
        WHERE u.user_code = $1 AND s.store_code = $2 AND u.is_active = true
      `;

      const result = await transaction.query(loginQuery, [userCode, storeCode]);

      if (result.rows.length === 0) {
        tracker.markError('ログイン', new Error('ユーザーが見つかりません'));
        throw new Error('認証失敗: ユーザーまたは店舗が見つかりません');
      }

      const user = result.rows[0];
      tracker.mark('ユーザー検索完了');

      tracker.setOperation('パスワード検証');
      
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        tracker.markError('パスワード検証', new Error('パスワード不一致'));
        throw new Error('認証失敗: パスワードが正しくません');
      }

      tracker.markSuccess('パスワード検証完了', userCode);

      tracker.setOperation('最終ログイン日更新');
      await transaction.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      tracker.mark('最終ログイン日更新完了');

      // トークン生成
      const tokens = this.generateTestTokens(user);
      
      tracker.markSuccess('ログイン完了', `${userCode}@${storeCode}`);

      return {
        success: true,
        ...tokens,
        store: {
          id: user.store_id,
          code: user.store_code,
          name: user.store_name
        }
      };

    } catch (error) {
      tracker.markError('ログインシミュレーション', error);
      throw error;
    }
  }

  // トークン検証
  verifyTestToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const stored = this.testTokens.get(token);
      
      if (!stored) {
        throw new Error('トークンが見つかりません');
      }

      return {
        valid: true,
        user: decoded,
        storedData: stored
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  // 権限チェック
  hasPermission(user, requiredRole) {
    const roleHierarchy = ['staff', 'manager', 'admin'];
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  }

  // テストデータクリーンアップ
  cleanup() {
    const tracker = new MilestoneTracker('認証データクリーンアップ');
    
    try {
      const userCount = this.testUsers.size;
      const tokenCount = this.testTokens.size;
      
      this.testUsers.clear();
      this.testTokens.clear();
      
      tracker.markSuccess('クリーンアップ完了', `ユーザー: ${userCount}件, トークン: ${tokenCount}件`);
      
      return tracker.summary();
    } catch (error) {
      tracker.markError('クリーンアップ', error);
      throw error;
    }
  }

  // 複数ロール用テストユーザー作成
  async createMultiRoleTestUsers(transaction) {
    const tracker = new MilestoneTracker('複数ロールユーザー作成');
    
    try {
      const users = {};
      const roles = ['staff', 'manager', 'admin'];
      
      for (const role of roles) {
        tracker.setOperation(`${role}ユーザー作成`);
        
        const userData = {
          role,
          name: `テスト${role}ユーザー`,
          email: `test-${role}@test.example.com`,
          userCode: `test${role}`,
          password: 'test123456'
        };

        const result = await this.createTestUser(transaction, userData);
        users[role] = result;
        
        tracker.markSuccess(`${role}ユーザー作成完了`, result.user.user_code);
      }

      return users;
    } catch (error) {
      tracker.markError('複数ロールユーザー作成', error);
      throw error;
    }
  }
}

module.exports = TestAuthHelper;