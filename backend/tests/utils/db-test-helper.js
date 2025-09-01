const { Pool } = require('pg');
const MilestoneTracker = require('./MilestoneTracker');

/**
 * データベーステスト支援ユーティリティ
 * 
 * このユーティリティは統合テスト実行時のデータベース操作を支援し、
 * テストの独立性とデータの一貫性を保証します。
 */
class DatabaseTestHelper {
  constructor() {
    this.pool = null;
    this.activeTransactions = new Map();
    this.testCounter = 0;
  }

  // データベース接続初期化
  async initialize() {
    const tracker = new MilestoneTracker('DB初期化');
    
    try {
      tracker.setOperation('データベース接続設定');
      
      const config = {
        host: process.env.DB_HOST || 'postgres',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'glasses_store_db',
        user: process.env.DB_USER || 'glasses_user',
        password: process.env.DB_PASSWORD || 'changeme_postgres',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
      };

      tracker.mark('設定完了');

      tracker.setOperation('データベース接続');
      this.pool = new Pool(config);
      
      // 接続テスト
      const testClient = await this.pool.connect();
      await testClient.query('SELECT NOW()');
      testClient.release();
      
      tracker.markSuccess('接続確立', `${config.host}:${config.port}/${config.database}`);
      
      return tracker.summary();
    } catch (error) {
      tracker.markError('接続失敗', error);
      throw new Error(`データベース初期化失敗: ${error.message}`);
    }
  }

  // 独立したトランザクション開始
  async startTransaction(testName) {
    if (!this.pool) {
      throw new Error('データベースが初期化されていません');
    }

    const transactionId = `test-${++this.testCounter}-${Date.now()}`;
    const tracker = new MilestoneTracker(`トランザクション[${testName}]`);
    
    try {
      tracker.setOperation('クライアント取得');
      const client = await this.pool.connect();
      tracker.mark('クライアント取得完了');
      
      tracker.setOperation('トランザクション開始');
      await client.query('BEGIN');
      
      // セッション設定（テストデータの分離）
      await client.query(`SET search_path TO public`);
      await client.query(`SET application_name TO '${testName}'`);
      
      tracker.markSuccess('トランザクション開始', transactionId);
      
      this.activeTransactions.set(transactionId, {
        client,
        testName,
        startTime: Date.now(),
        tracker
      });

      return {
        transactionId,
        client,
        query: async (text, params) => {
          const startTime = Date.now();
          try {
            const result = await client.query(text, params);
            const duration = Date.now() - startTime;
            tracker.mark(`クエリ実行完了(${duration}ms)`);
            return result;
          } catch (error) {
            tracker.markError('クエリ実行', error);
            throw error;
          }
        }
      };
    } catch (error) {
      tracker.markError('トランザクション開始', error);
      throw error;
    }
  }

  // トランザクション終了（ロールバック）
  async endTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      console.warn(`⚠️ トランザクション ${transactionId} が見つかりません`);
      return;
    }

    const { client, testName, tracker } = transaction;

    try {
      tracker.setOperation('トランザクション終了');
      await client.query('ROLLBACK');
      tracker.markSuccess('ロールバック完了', testName);
      
      client.release();
      this.activeTransactions.delete(transactionId);
      
      return tracker.summary();
    } catch (error) {
      tracker.markError('ロールバック', error);
      client.release();
      this.activeTransactions.delete(transactionId);
      throw error;
    }
  }

  // 全てのアクティブトランザクションを終了
  async cleanupAllTransactions() {
    const tracker = new MilestoneTracker('トランザクション全削除');
    
    try {
      const transactionIds = Array.from(this.activeTransactions.keys());
      tracker.mark(`アクティブトランザクション数: ${transactionIds.length}`);

      for (const transactionId of transactionIds) {
        try {
          await this.endTransaction(transactionId);
          tracker.markSuccess('トランザクション削除', transactionId);
        } catch (error) {
          tracker.markWarning('トランザクション削除失敗', error.message);
        }
      }

      tracker.markSuccess('全削除完了', `${transactionIds.length}件処理`);
      return tracker.summary();
    } catch (error) {
      tracker.markError('全削除処理', error);
      throw error;
    }
  }

  // テスト用ユニークデータ生成
  generateUniqueTestData(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const testId = `${prefix}-${timestamp}-${random}`;

    return {
      testId,
      customerData: {
        lastName: `${prefix}姓`,
        firstName: `${prefix}名${random}`,
        lastNameKana: `テスト`,
        firstNameKana: `${random}`,
        fullName: `${prefix}姓 ${prefix}名${random}`,
        fullNameKana: `テスト ${random}`,
        phone: `090-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        email: `${testId}@test.example.com`,
        address: `テスト県テスト市${random}`,
        postalCode: `${Math.floor(Math.random() * 9000000 + 1000000).toString().substring(0, 3)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        notes: `統合テスト用データ - ${testId}`
      },
      prescriptionData: {
        measuredDate: new Date().toISOString(),
        rightEyeSphere: Math.round((Math.random() * 10 - 5) * 4) / 4, // -5.0 to +5.0 in 0.25 steps
        rightEyeCylinder: Math.round((Math.random() * 4 - 2) * 4) / 4, // -2.0 to +2.0 in 0.25 steps
        rightEyeAxis: Math.floor(Math.random() * 181), // 0 to 180
        rightEyeVision: Math.round((Math.random() * 1.5 + 0.1) * 10) / 10, // 0.1 to 1.6
        leftEyeSphere: Math.round((Math.random() * 10 - 5) * 4) / 4,
        leftEyeCylinder: Math.round((Math.random() * 4 - 2) * 4) / 4,
        leftEyeAxis: Math.floor(Math.random() * 181),
        leftEyeVision: Math.round((Math.random() * 1.5 + 0.1) * 10) / 10,
        pupilDistance: Math.round((Math.random() * 25 + 55) * 10) / 10, // 55.0 to 80.0
        notes: `テスト処方箋 - ${testId}`
      },
      memoData: {
        memoText: `統合テスト用メモ - ${testId}\n作成日時: ${new Date().toISOString()}`,
        memoType: Math.random() > 0.5 ? 'text' : 'handwritten'
      }
    };
  }

  // テストデータ存在確認
  async verifyTestDataExists(transaction, tableName, whereClause, params) {
    const tracker = new MilestoneTracker(`データ確認[${tableName}]`);
    
    try {
      tracker.setOperation('存在確認クエリ実行');
      const query = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
      const result = await transaction.query(query, params);
      
      const count = parseInt(result.rows[0].count);
      tracker.markSuccess('確認完了', `件数: ${count}`);
      
      return count > 0;
    } catch (error) {
      tracker.markError('確認失敗', error);
      throw error;
    }
  }

  // データベース接続終了
  async close() {
    const tracker = new MilestoneTracker('DB終了処理');
    
    try {
      // アクティブトランザクションのクリーンアップ
      await this.cleanupAllTransactions();
      
      if (this.pool) {
        tracker.setOperation('コネクションプール終了');
        await this.pool.end();
        this.pool = null;
        tracker.markSuccess('終了完了', 'データベース接続切断');
      }

      return tracker.summary();
    } catch (error) {
      tracker.markError('終了処理', error);
      throw error;
    }
  }

  // 接続状態確認
  isConnected() {
    return this.pool !== null;
  }

  // アクティブトランザクション数取得
  getActiveTransactionCount() {
    return this.activeTransactions.size;
  }
}

module.exports = DatabaseTestHelper;