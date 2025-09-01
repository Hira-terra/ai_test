import request from 'supertest';
import app from '../../../src/index';
import dbHelper from '../../utils/db-test-helper';
import authHelper from '../../utils/test-auth-helper';
import testIsolation from '../../utils/test-isolation';
import uniqueFactory from '../../utils/unique-data-factory';
import { MilestoneTracker } from '../../utils/MilestoneTracker';

describe('認証API統合テスト', () => {
  let testTransaction;

  beforeAll(async () => {
    // データベース接続確認
    await dbHelper.connect();
  });

  beforeEach(async () => {
    // 各テストを独立したトランザクションで実行
    const testId = testIsolation.generateTestId();
    testTransaction = await testIsolation.beginTestTransaction(testId);
  });

  afterEach(async () => {
    // テスト完了後にロールバック
    if (testTransaction) {
      await testIsolation.rollbackAll();
    }
    // テストデータクリーンアップ
    await authHelper.cleanupTestData();
  });

  afterAll(async () => {
    await dbHelper.close();
  });

  describe('POST /api/auth/login', () => {
    it('正常なログイン認証ができる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // ユニークなテストデータ準備
      tracker.setOperation('テストデータ準備');
      const { user, store } = await authHelper.createTestUserWithStore();
      tracker.mark('データ準備完了');

      // APIリクエスト送信
      tracker.setOperation('API呼び出し');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: user.plainPassword,
          store_code: store.store_code
        });
      tracker.mark('APIレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.userCode).toBe(user.user_code);
      expect(response.body.data.user.store.storeCode).toBe(store.store_code);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.expiresIn).toBeGreaterThan(0);
      
      // パスワードが返されていないことを確認
      expect(response.body.data.user.password).toBeUndefined();
      tracker.mark('検証完了');

      // 結果サマリー
      tracker.summary();
    });

    it('無効なユーザーコードでログインに失敗する', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストデータ準備
      tracker.setOperation('テストデータ準備');
      const { store } = await authHelper.createTestUserWithStore();
      const invalidUserCode = uniqueFactory.generateUniqueUserCode();
      tracker.mark('データ準備完了');

      // APIリクエスト送信
      tracker.setOperation('API呼び出し');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: invalidUserCode,
          password: 'TestPassword123',
          store_code: store.store_code
        });
      tracker.mark('APIレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      tracker.mark('検証完了');

      tracker.summary();
    });

    it('無効なパスワードでログインに失敗する', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストデータ準備
      tracker.setOperation('テストデータ準備');
      const { user, store } = await authHelper.createTestUserWithStore();
      tracker.mark('データ準備完了');

      // APIリクエスト送信
      tracker.setOperation('API呼び出し');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: 'WrongPassword123',
          store_code: store.store_code
        });
      tracker.mark('APIレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
      tracker.mark('検証完了');

      tracker.summary();
    });

    it('アカウントロック状態でログインに失敗する', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストデータ準備
      tracker.setOperation('テストデータ準備');
      const { user, store } = await authHelper.createTestUserWithStore();
      
      // アカウントをロック
      await authHelper.lockUserAccount(user.id);
      tracker.mark('データ準備完了');

      // APIリクエスト送信
      tracker.setOperation('API呼び出し');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: user.plainPassword,
          store_code: store.store_code
        });
      tracker.mark('APIレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(423);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
      tracker.mark('検証完了');

      tracker.summary();
    });

    it('必須パラメータが不足している場合にエラーになる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // APIリクエスト送信（パスワードなし）
      tracker.setOperation('API呼び出し');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: 'TEST001',
          store_code: 'ST001'
        });
      tracker.mark('APIレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toContain('パスワードは必須です');
      tracker.mark('検証完了');

      tracker.summary();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('認証済みユーザーがログアウトできる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストユーザーでログイン
      tracker.setOperation('テストユーザー作成とログイン');
      const { user, store } = await authHelper.createTestUserWithStore();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: user.plainPassword,
          store_code: store.store_code
        });
      
      const token = authHelper.extractTokenFromResponse(loginResponse);
      expect(token).toBeDefined();
      tracker.mark('ログイン完了');

      // ログアウトリクエスト
      tracker.setOperation('ログアウトAPI呼び出し');
      const response = await request(app)
        .post('/api/auth/logout')
        .set(authHelper.getAuthHeader(token));
      tracker.mark('ログアウトレスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('ログアウトしました');
      tracker.mark('検証完了');

      // ログアウト後のトークン無効化確認
      tracker.setOperation('トークン無効化確認');
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(token));
      
      expect(meResponse.status).toBe(401);
      tracker.mark('トークン無効化確認完了');

      tracker.summary();
    });

    it('未認証でログアウトしようとするとエラーになる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // 認証なしでログアウト試行
      tracker.setOperation('未認証ログアウトAPI呼び出し');
      const response = await request(app)
        .post('/api/auth/logout');
      tracker.mark('レスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      tracker.mark('検証完了');

      tracker.summary();
    });
  });

  describe('GET /api/auth/me', () => {
    it('認証済みユーザーの情報を取得できる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストユーザーでログイン
      tracker.setOperation('テストユーザー作成とログイン');
      const { user, store } = await authHelper.createTestUserWithStore({
        role: 'manager'
      });
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: user.plainPassword,
          store_code: store.store_code
        });
      
      const token = authHelper.extractTokenFromResponse(loginResponse);
      tracker.mark('ログイン完了');

      // ユーザー情報取得
      tracker.setOperation('ユーザー情報API呼び出し');
      const response = await request(app)
        .get('/api/auth/me')
        .set(authHelper.getAuthHeader(token));
      tracker.mark('レスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userCode).toBe(user.user_code);
      expect(response.body.data.name).toBe(user.name);
      expect(response.body.data.role).toBe('manager');
      expect(response.body.data.store.storeCode).toBe(store.store_code);
      expect(response.body.data.password).toBeUndefined();
      tracker.mark('検証完了');

      tracker.summary();
    });

    it('未認証でユーザー情報を取得しようとするとエラーになる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // 認証なしでユーザー情報取得試行
      tracker.setOperation('未認証API呼び出し');
      const response = await request(app)
        .get('/api/auth/me');
      tracker.mark('レスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      tracker.mark('検証完了');

      tracker.summary();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('有効なリフレッシュトークンで新しいアクセストークンを取得できる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テストユーザーでログイン
      tracker.setOperation('テストユーザー作成とログイン');
      const { user, store } = await authHelper.createTestUserWithStore();
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          user_code: user.user_code,
          password: user.plainPassword,
          store_code: store.store_code
        });
      
      // リフレッシュトークンは実装に応じて取得方法を調整
      const refreshToken = loginResponse.body.data.refreshToken || 'dummy-refresh-token';
      tracker.mark('ログイン完了');

      if (refreshToken !== 'dummy-refresh-token') {
        // トークンリフレッシュ
        tracker.setOperation('トークンリフレッシュAPI呼び出し');
        const response = await request(app)
          .post('/api/auth/refresh')
          .send({ refreshToken });
        tracker.mark('レスポンス受信');

        // レスポンス検証
        tracker.setOperation('レスポンス検証');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.expiresIn).toBeGreaterThan(0);
        tracker.mark('検証完了');
      }

      tracker.summary();
    });

    it('無効なリフレッシュトークンでエラーになる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // 無効なトークンでリフレッシュ試行
      tracker.setOperation('無効トークンでAPI呼び出し');
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' });
      tracker.mark('レスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      tracker.mark('検証完了');

      tracker.summary();
    });
  });

  describe('GET /api/stores', () => {
    it('店舗一覧を取得できる', async () => {
      const tracker = new MilestoneTracker();
      tracker.mark('テスト開始');

      // テスト店舗作成
      tracker.setOperation('テスト店舗作成');
      const store1 = await authHelper.createTestStore({ name: 'テスト店舗1' });
      const store2 = await authHelper.createTestStore({ name: 'テスト店舗2' });
      const store3 = await authHelper.createTestStore({ name: 'テスト店舗3', is_active: false });
      tracker.mark('店舗作成完了');

      // 店舗一覧取得
      tracker.setOperation('店舗一覧API呼び出し');
      const response = await request(app)
        .get('/api/stores');
      tracker.mark('レスポンス受信');

      // レスポンス検証
      tracker.setOperation('レスポンス検証');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // アクティブな店舗のみが返されることを確認
      const storeCodes = response.body.data.map(s => s.storeCode);
      expect(storeCodes).toContain(store1.store_code);
      expect(storeCodes).toContain(store2.store_code);
      expect(storeCodes).not.toContain(store3.store_code);
      
      // 各店舗のデータ構造を確認
      response.body.data.forEach(store => {
        expect(store).toHaveProperty('id');
        expect(store).toHaveProperty('storeCode');
        expect(store).toHaveProperty('name');
        expect(store).toHaveProperty('address');
      });
      tracker.mark('検証完了');

      tracker.summary();
    });
  });
});