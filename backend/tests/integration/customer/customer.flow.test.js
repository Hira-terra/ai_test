const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;

// テストユーティリティ
const MilestoneTracker = require('../../utils/MilestoneTracker');
const DatabaseTestHelper = require('../../utils/db-test-helper');
const TestAuthHelper = require('../../utils/test-auth-helper');

// アプリケーション（テスト用にモック設定で起動）
process.env.NODE_ENV = 'test';
const app = require('../../../src/app');

/**
 * 顧客管理システム 統合テストスイート
 * 
 * このテストスイートは、顧客管理に関わる全てのAPIエンドポイントを
 * 実際のデータベースと認証システムを使用してテストします。
 * 
 * ★9統合テスト成功請負人への重要事項:
 * - 全てのテストは独立したトランザクション内で実行されます
 * - モックは一切使用せず、実際のPostgreSQL・Redisを使用
 * - テストデータは自動的にユニークになるよう設計
 * - MilestoneTrackerでパフォーマンス測定・デバッグ支援
 */
describe('顧客管理システム 完全統合テスト', () => {
  let dbHelper;
  let authHelper;
  let globalTracker;

  // テスト環境セットアップ
  beforeAll(async () => {
    globalTracker = new MilestoneTracker('統合テスト環境セットアップ');
    
    try {
      globalTracker.setOperation('データベース初期化');
      dbHelper = new DatabaseTestHelper();
      await dbHelper.initialize();
      globalTracker.markSuccess('データベース初期化完了', 'PostgreSQL接続確立');

      globalTracker.setOperation('認証システム初期化');
      authHelper = new TestAuthHelper();
      globalTracker.markSuccess('認証システム初期化完了', 'JWT認証準備完了');

      globalTracker.setOperation('アプリケーション起動確認');
      // アプリケーションの健全性チェック
      const healthResponse = await request(app).get('/health');
      if (healthResponse.status !== 200) {
        throw new Error('アプリケーションが正常に起動していません');
      }
      globalTracker.markSuccess('アプリケーション起動確認完了', 'ヘルスチェック OK');

    } catch (error) {
      globalTracker.markError('環境セットアップ', error);
      throw error;
    }
  });

  // テスト環境クリーンアップ
  afterAll(async () => {
    if (globalTracker) {
      globalTracker.setOperation('テスト環境クリーンアップ');
    }

    try {
      if (authHelper) {
        await authHelper.cleanup();
      }

      if (dbHelper) {
        await dbHelper.close();
      }

      if (globalTracker) {
        globalTracker.markSuccess('クリーンアップ完了', '全リソース解放');
        globalTracker.summary();
      }
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  });

  /**
   * テストケース1: 顧客作成→検索→詳細取得の基本フロー
   */
  describe('顧客基本操作フロー', () => {
    let transaction;
    let testUser;
    let authTokens;
    let createdCustomer;

    beforeEach(async () => {
      const tracker = new MilestoneTracker('顧客基本操作フロー準備');
      
      try {
        tracker.setOperation('テストトランザクション開始');
        transaction = await dbHelper.startTransaction('顧客基本操作フロー');
        tracker.mark('トランザクション開始完了');

        tracker.setOperation('テストユーザー作成');
        const userResult = await authHelper.createTestUser(transaction, {
          role: 'staff',
          name: 'テスト店舗スタッフ',
          userCode: 'teststaff'
        });
        testUser = userResult;
        tracker.mark('テストユーザー作成完了');

        tracker.setOperation('認証トークン生成');
        authTokens = authHelper.generateTestTokens(testUser.user);
        tracker.markSuccess('準備完了', `ユーザー: ${testUser.user.user_code}`);
        
      } catch (error) {
        tracker.markError('準備処理', error);
        throw error;
      }
    });

    afterEach(async () => {
      if (transaction) {
        await dbHelper.endTransaction(transaction.transactionId);
      }
    });

    test('新規顧客作成が正常に動作する', async () => {
      const tracker = new MilestoneTracker('顧客作成テスト');
      
      try {
        tracker.setOperation('テストデータ準備');
        const testData = dbHelper.generateUniqueTestData('顧客作成');
        const customerData = testData.customerData;
        tracker.mark('テストデータ準備完了');

        tracker.setOperation('顧客作成API呼び出し');
        const response = await request(app)
          .post('/api/customers')
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(customerData);

        tracker.mark('API呼び出し完了');

        tracker.setOperation('レスポンス検証');
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('customerCode');
        expect(response.body.data.fullName).toBe(customerData.fullName);
        expect(response.body.data.phone).toBe(customerData.phone);
        expect(response.body.data.email).toBe(customerData.email);

        createdCustomer = response.body.data;
        tracker.markSuccess('レスポンス検証完了', `顧客コード: ${createdCustomer.customerCode}`);

        tracker.setOperation('データベース確認');
        const dbVerification = await dbHelper.verifyTestDataExists(
          transaction,
          'customers',
          'id = $1',
          [createdCustomer.id]
        );
        expect(dbVerification).toBe(true);
        tracker.markSuccess('データベース確認完了', 'データ永続化確認');

        tracker.summary();
      } catch (error) {
        tracker.markError('顧客作成テスト', error);
        throw error;
      }
    });

    test('作成した顧客を検索で取得できる', async () => {
      const tracker = new MilestoneTracker('顧客検索テスト');
      
      try {
        // 前提: 顧客が作成済み
        if (!createdCustomer) {
          // 顧客作成
          const testData = dbHelper.generateUniqueTestData('検索テスト');
          const createResponse = await request(app)
            .post('/api/customers')
            .set(authHelper.createAuthHeader(authTokens.accessToken))
            .send(testData.customerData);
          
          createdCustomer = createResponse.body.data;
        }

        tracker.setOperation('名前検索テスト');
        const searchResponse = await request(app)
          .get('/api/customers')
          .query({ search: createdCustomer.lastName })
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        tracker.mark('名前検索API完了');

        tracker.setOperation('検索結果検証');
        expect(searchResponse.status).toBe(200);
        expect(searchResponse.body.success).toBe(true);
        expect(searchResponse.body.data).toBeInstanceOf(Array);
        expect(searchResponse.body.data.length).toBeGreaterThan(0);
        
        const foundCustomer = searchResponse.body.data.find(
          customer => customer.id === createdCustomer.id
        );
        expect(foundCustomer).toBeTruthy();
        expect(foundCustomer.fullName).toBe(createdCustomer.fullName);
        
        tracker.markSuccess('名前検索完了', `検索結果: ${searchResponse.body.data.length}件`);

        tracker.setOperation('電話番号検索テスト');
        const phoneSearchResponse = await request(app)
          .get('/api/customers')
          .query({ phone: createdCustomer.phone })
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        expect(phoneSearchResponse.status).toBe(200);
        expect(phoneSearchResponse.body.success).toBe(true);
        const phoneFoundCustomer = phoneSearchResponse.body.data.find(
          customer => customer.id === createdCustomer.id
        );
        expect(phoneFoundCustomer).toBeTruthy();
        
        tracker.markSuccess('電話番号検索完了', `電話番号: ${createdCustomer.phone}`);

        tracker.summary();
      } catch (error) {
        tracker.markError('顧客検索テスト', error);
        throw error;
      }
    });

    test('顧客詳細情報を取得できる', async () => {
      const tracker = new MilestoneTracker('顧客詳細取得テスト');
      
      try {
        // 前提: 顧客が作成済み
        if (!createdCustomer) {
          const testData = dbHelper.generateUniqueTestData('詳細取得');
          const createResponse = await request(app)
            .post('/api/customers')
            .set(authHelper.createAuthHeader(authTokens.accessToken))
            .send(testData.customerData);
          
          createdCustomer = createResponse.body.data;
        }

        tracker.setOperation('顧客詳細取得API呼び出し');
        const detailResponse = await request(app)
          .get(`/api/customers/${createdCustomer.id}`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        tracker.mark('詳細取得API完了');

        tracker.setOperation('詳細情報検証');
        expect(detailResponse.status).toBe(200);
        expect(detailResponse.body.success).toBe(true);
        expect(detailResponse.body.data.id).toBe(createdCustomer.id);
        expect(detailResponse.body.data.customerCode).toBe(createdCustomer.customerCode);
        expect(detailResponse.body.data.fullName).toBe(createdCustomer.fullName);
        expect(detailResponse.body.data).toHaveProperty('visitCount');
        expect(detailResponse.body.data).toHaveProperty('totalPurchaseAmount');
        expect(detailResponse.body.data).toHaveProperty('createdAt');
        expect(detailResponse.body.data).toHaveProperty('updatedAt');

        tracker.markSuccess('詳細情報検証完了', `顧客: ${detailResponse.body.data.fullName}`);

        tracker.summary();
      } catch (error) {
        tracker.markError('顧客詳細取得テスト', error);
        throw error;
      }
    });
  });

  /**
   * テストケース2: 処方箋管理フロー
   */
  describe('処方箋管理フロー', () => {
    let transaction;
    let testUser;
    let authTokens;
    let testCustomer;

    beforeEach(async () => {
      const tracker = new MilestoneTracker('処方箋テスト準備');
      
      try {
        transaction = await dbHelper.startTransaction('処方箋管理フロー');
        
        const userResult = await authHelper.createTestUser(transaction, {
          role: 'staff',
          name: '処方箋テストスタッフ'
        });
        testUser = userResult;
        authTokens = authHelper.generateTestTokens(testUser.user);

        // テスト用顧客作成
        const testData = dbHelper.generateUniqueTestData('処方箋テスト');
        const customerResponse = await request(app)
          .post('/api/customers')
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(testData.customerData);
        
        testCustomer = customerResponse.body.data;
        tracker.markSuccess('準備完了', `顧客: ${testCustomer.customerCode}`);
        
      } catch (error) {
        tracker.markError('処方箋テスト準備', error);
        throw error;
      }
    });

    afterEach(async () => {
      if (transaction) {
        await dbHelper.endTransaction(transaction.transactionId);
      }
    });

    test('処方箋を作成・取得できる', async () => {
      const tracker = new MilestoneTracker('処方箋作成取得テスト');
      
      try {
        tracker.setOperation('処方箋データ準備');
        const testData = dbHelper.generateUniqueTestData('処方箋');
        const prescriptionData = testData.prescriptionData;
        tracker.mark('処方箋データ準備完了');

        tracker.setOperation('処方箋作成API呼び出し');
        const createResponse = await request(app)
          .post(`/api/customers/${testCustomer.id}/prescriptions`)
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(prescriptionData);

        tracker.mark('処方箋作成API完了');

        tracker.setOperation('作成結果検証');
        expect(createResponse.status).toBe(201);
        expect(createResponse.body.success).toBe(true);
        expect(createResponse.body.data).toHaveProperty('id');
        expect(createResponse.body.data.customerId).toBe(testCustomer.id);
        expect(createResponse.body.data.rightEyeSphere).toBe(prescriptionData.rightEyeSphere);
        expect(createResponse.body.data.leftEyeSphere).toBe(prescriptionData.leftEyeSphere);
        expect(createResponse.body.data.pupilDistance).toBe(prescriptionData.pupilDistance);

        const createdPrescription = createResponse.body.data;
        tracker.markSuccess('処方箋作成完了', `ID: ${createdPrescription.id}`);

        tracker.setOperation('処方箋一覧取得');
        const listResponse = await request(app)
          .get(`/api/customers/${testCustomer.id}/prescriptions`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.success).toBe(true);
        expect(listResponse.body.data).toBeInstanceOf(Array);
        expect(listResponse.body.data.length).toBeGreaterThan(0);
        
        const foundPrescription = listResponse.body.data.find(
          p => p.id === createdPrescription.id
        );
        expect(foundPrescription).toBeTruthy();
        
        tracker.markSuccess('処方箋取得完了', `履歴件数: ${listResponse.body.data.length}`);

        tracker.summary();
      } catch (error) {
        tracker.markError('処方箋作成取得テスト', error);
        throw error;
      }
    });
  });

  /**
   * テストケース3: 顧客メモ管理フロー
   */
  describe('顧客メモ管理フロー', () => {
    let transaction;
    let testUser;
    let authTokens;
    let testCustomer;

    beforeEach(async () => {
      const tracker = new MilestoneTracker('メモテスト準備');
      
      try {
        transaction = await dbHelper.startTransaction('メモ管理フロー');
        
        const userResult = await authHelper.createTestUser(transaction, {
          role: 'staff',
          name: 'メモテストスタッフ'
        });
        testUser = userResult;
        authTokens = authHelper.generateTestTokens(testUser.user);

        // テスト用顧客作成
        const testData = dbHelper.generateUniqueTestData('メモテスト');
        const customerResponse = await request(app)
          .post('/api/customers')
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(testData.customerData);
        
        testCustomer = customerResponse.body.data;
        tracker.markSuccess('準備完了', `顧客: ${testCustomer.customerCode}`);
        
      } catch (error) {
        tracker.markError('メモテスト準備', error);
        throw error;
      }
    });

    afterEach(async () => {
      if (transaction) {
        await dbHelper.endTransaction(transaction.transactionId);
      }
    });

    test('顧客メモを作成・取得・削除できる', async () => {
      const tracker = new MilestoneTracker('メモ管理テスト');
      
      try {
        tracker.setOperation('メモデータ準備');
        const testData = dbHelper.generateUniqueTestData('メモ管理');
        const memoData = testData.memoData;
        tracker.mark('メモデータ準備完了');

        tracker.setOperation('メモ作成API呼び出し');
        const createResponse = await request(app)
          .post(`/api/customers/${testCustomer.id}/memos`)
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(memoData);

        tracker.mark('メモ作成API完了');

        tracker.setOperation('作成結果検証');
        expect(createResponse.status).toBe(201);
        expect(createResponse.body.success).toBe(true);
        expect(createResponse.body.data).toHaveProperty('id');
        expect(createResponse.body.data.customerId).toBe(testCustomer.id);
        expect(createResponse.body.data.memoText).toBe(memoData.memoText);
        expect(createResponse.body.data.memoType).toBe(memoData.memoType);

        const createdMemo = createResponse.body.data;
        tracker.markSuccess('メモ作成完了', `ID: ${createdMemo.id}`);

        tracker.setOperation('メモ一覧取得');
        const listResponse = await request(app)
          .get(`/api/customers/${testCustomer.id}/memos`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.success).toBe(true);
        expect(listResponse.body.data).toBeInstanceOf(Array);
        expect(listResponse.body.data.length).toBeGreaterThan(0);
        
        const foundMemo = listResponse.body.data.find(
          m => m.id === createdMemo.id
        );
        expect(foundMemo).toBeTruthy();
        
        tracker.markSuccess('メモ取得完了', `メモ件数: ${listResponse.body.data.length}`);

        tracker.setOperation('メモ削除');
        const deleteResponse = await request(app)
          .delete(`/api/customers/${testCustomer.id}/memos/${createdMemo.id}`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.success).toBe(true);
        
        tracker.markSuccess('メモ削除完了', `削除対象: ${createdMemo.id}`);

        // 削除確認
        tracker.setOperation('削除確認');
        const confirmResponse = await request(app)
          .get(`/api/customers/${testCustomer.id}/memos`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        const deletedMemo = confirmResponse.body.data.find(
          m => m.id === createdMemo.id
        );
        expect(deletedMemo).toBeFalsy();
        
        tracker.markSuccess('削除確認完了', 'メモが削除されていることを確認');

        tracker.summary();
      } catch (error) {
        tracker.markError('メモ管理テスト', error);
        throw error;
      }
    });
  });

  /**
   * テストケース4: エラーハンドリングと境界値テスト
   */
  describe('エラーハンドリング・境界値テスト', () => {
    let transaction;
    let testUser;
    let authTokens;

    beforeEach(async () => {
      transaction = await dbHelper.startTransaction('エラーハンドリングテスト');
      
      const userResult = await authHelper.createTestUser(transaction, {
        role: 'staff',
        name: 'エラーテストスタッフ'
      });
      testUser = userResult;
      authTokens = authHelper.generateTestTokens(testUser.user);
    });

    afterEach(async () => {
      if (transaction) {
        await dbHelper.endTransaction(transaction.transactionId);
      }
    });

    test('無効なトークンでアクセスした場合に401エラーが返る', async () => {
      const tracker = new MilestoneTracker('認証エラーテスト');
      
      try {
        tracker.setOperation('無効トークンでのアクセス');
        const response = await request(app)
          .get('/api/customers')
          .set('Authorization', 'Bearer invalid-token');

        tracker.mark('無効トークンアクセス完了');

        tracker.setOperation('エラーレスポンス検証');
        expect(response.status).toBe(401);
        tracker.markSuccess('認証エラー確認完了', '401 Unauthorized');

        tracker.summary();
      } catch (error) {
        tracker.markError('認証エラーテスト', error);
        throw error;
      }
    });

    test('存在しない顧客IDで詳細取得を試みた場合に404エラーが返る', async () => {
      const tracker = new MilestoneTracker('404エラーテスト');
      
      try {
        tracker.setOperation('存在しない顧客ID検索');
        const nonExistentId = '00000000-0000-0000-0000-000000000000';
        const response = await request(app)
          .get(`/api/customers/${nonExistentId}`)
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        tracker.mark('存在しない顧客検索完了');

        tracker.setOperation('404エラー検証');
        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
        
        tracker.markSuccess('404エラー確認完了', 'NOT_FOUND');

        tracker.summary();
      } catch (error) {
        tracker.markError('404エラーテスト', error);
        throw error;
      }
    });

    test('無効なデータで顧客作成を試みた場合にバリデーションエラーが返る', async () => {
      const tracker = new MilestoneTracker('バリデーションエラーテスト');
      
      try {
        tracker.setOperation('無効データでの顧客作成');
        const invalidData = {
          lastName: '', // 必須フィールドが空
          firstName: '', // 必須フィールドが空
          email: 'invalid-email', // 無効なメールアドレス
          phone: 'あいうえお', // 無効な電話番号形式
          age: -1 // 無効な年齢
        };

        const response = await request(app)
          .post('/api/customers')
          .set(authHelper.createAuthHeader(authTokens.accessToken))
          .send(invalidData);

        tracker.mark('無効データ作成試行完了');

        tracker.setOperation('バリデーションエラー検証');
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toBeDefined();
        expect(response.body.error.details.length).toBeGreaterThan(0);
        
        tracker.markSuccess('バリデーションエラー確認完了', `エラー数: ${response.body.error.details.length}`);

        tracker.summary();
      } catch (error) {
        tracker.markError('バリデーションエラーテスト', error);
        throw error;
      }
    });
  });

  /**
   * テストケース5: パフォーマンステスト
   */
  describe('パフォーマンステスト', () => {
    let transaction;
    let testUser;
    let authTokens;

    beforeEach(async () => {
      transaction = await dbHelper.startTransaction('パフォーマンステスト');
      
      const userResult = await authHelper.createTestUser(transaction, {
        role: 'staff',
        name: 'パフォーマンステストスタッフ'
      });
      testUser = userResult;
      authTokens = authHelper.generateTestTokens(testUser.user);
    });

    afterEach(async () => {
      if (transaction) {
        await dbHelper.endTransaction(transaction.transactionId);
      }
    });

    test('大量データ検索のパフォーマンス', async () => {
      const tracker = new MilestoneTracker('大量データ検索パフォーマンステスト');
      
      try {
        tracker.setOperation('テストデータ大量作成');
        const creationPromises = [];
        
        for (let i = 0; i < 50; i++) {
          const testData = dbHelper.generateUniqueTestData(`大量データ${i}`);
          const promise = request(app)
            .post('/api/customers')
            .set(authHelper.createAuthHeader(authTokens.accessToken))
            .send(testData.customerData);
          creationPromises.push(promise);
        }

        const creationResults = await Promise.all(creationPromises);
        
        // 全てが成功していることを確認
        creationResults.forEach(result => {
          expect(result.status).toBe(201);
        });
        
        tracker.markSuccess('大量データ作成完了', `${creationResults.length}件の顧客作成`);

        tracker.setOperation('検索性能測定');
        const searchStartTime = Date.now();
        
        const searchResponse = await request(app)
          .get('/api/customers')
          .query({ limit: 100 })
          .set(authHelper.createAuthHeader(authTokens.accessToken));

        const searchDuration = Date.now() - searchStartTime;
        
        tracker.mark(`検索完了 (${searchDuration}ms)`);

        tracker.setOperation('検索結果検証');
        expect(searchResponse.status).toBe(200);
        expect(searchResponse.body.success).toBe(true);
        expect(searchResponse.body.data.length).toBeGreaterThanOrEqual(50);
        expect(searchResponse.body.meta.pagination.total).toBeGreaterThanOrEqual(50);

        // パフォーマンス基準確認（5秒以下）
        expect(searchDuration).toBeLessThan(5000);
        
        if (searchDuration < 1000) {
          tracker.markSuccess('高速検索確認', `${searchDuration}ms - 優秀`);
        } else if (searchDuration < 3000) {
          tracker.markSuccess('標準検索確認', `${searchDuration}ms - 良好`);
        } else {
          tracker.markWarning('低速検索確認', `${searchDuration}ms - 要最適化検討`);
        }

        tracker.summary();
      } catch (error) {
        tracker.markError('大量データ検索パフォーマンステスト', error);
        throw error;
      }
    }, 60000); // タイムアウトを60秒に延長
  });
});

/**
 * ★9統合テスト成功請負人への引き継ぎ情報
 * 
 * 【テスト実行方法】
 * npm run test:integration
 * 
 * 【前提条件】
 * 1. PostgreSQLサーバーが起動していること
 * 2. Redisサーバーが起動していること  
 * 3. 環境変数が適切に設定されていること
 * 4. データベースが作成済みであること
 * 
 * 【テストの特徴】
 * - 全テストケースは独立実行可能
 * - データの相互依存なし
 * - ユニークデータ自動生成
 * - 実データベース・実認証使用
 * - モック一切不使用
 * - 詳細なパフォーマンス計測
 * - 自動トランザクション分離
 * 
 * 【デバッグ情報】
 * - MilestoneTrackerで詳細な実行時間分析
 * - 操作ごとの時間計測
 * - エラー発生箇所の特定
 * - パフォーマンスボトルネック検出
 * 
 * 【失敗時の対応】
 * 1. MilestoneTrackerのサマリー確認
 * 2. データベース接続状態確認
 * 3. 環境変数設定確認
 * 4. トランザクション状態確認
 * 5. 必要に応じて個別テスト実行
 */