import { Pool } from 'pg';
import { StoreRepository } from '../models/store.model';
import { Store, CreateStoreRequest, UpdateStoreRequest, UUID } from '../types';
import { generateOperationId } from '../utils/helpers';
import { logger } from '../utils/logger';
import { ValidationError } from '../validators/customer.validator';
import { mapStoreModelToStore, mapStoreModelsToStores } from '../utils/store-mapper';

export class StoreService {
  private storeRepository: StoreRepository;

  constructor(private pool: Pool) {
    this.storeRepository = new StoreRepository(pool);
  }

  /**
   * 店舗一覧取得
   */
  async getAllStores(): Promise<Store[]> {
    const operationId = generateOperationId('getAllStores');
    logger.info(`[STORE_SERVICE] 店舗一覧取得開始 (${operationId})`);

    try {
      const stores = await this.storeRepository.findAll();
      logger.info(`[STORE_SERVICE] 店舗一覧取得完了: ${stores.length}件 (${operationId})`);
      return mapStoreModelsToStores(stores);
    } catch (error) {
      logger.error(`[STORE_SERVICE] 店舗一覧取得エラー (${operationId}):`, error);
      throw error;
    }
  }

  /**
   * 店舗詳細取得（ID）
   */
  async getStoreById(id: UUID): Promise<Store | null> {
    const operationId = generateOperationId('getStoreById');
    logger.info(`[STORE_SERVICE] 店舗詳細取得開始: ${id} (${operationId})`);

    try {
      const store = await this.storeRepository.findById(id);
      
      if (!store) {
        logger.warn(`[STORE_SERVICE] 店舗が見つかりません: ${id} (${operationId})`);
        return null;
      }

      logger.info(`[STORE_SERVICE] 店舗詳細取得完了: ${store.store_code} (${operationId})`);
      return mapStoreModelToStore(store);
    } catch (error) {
      logger.error(`[STORE_SERVICE] 店舗詳細取得エラー (${operationId}):`, error);
      throw error;
    }
  }

  /**
   * 店舗詳細取得（コード）
   */
  async getStoreByCode(storeCode: string): Promise<Store | null> {
    const operationId = generateOperationId('getStoreByCode');
    logger.info(`[STORE_SERVICE] 店舗コード検索開始: ${storeCode} (${operationId})`);

    try {
      const store = await this.storeRepository.findByStoreCode(storeCode);
      
      if (!store) {
        logger.warn(`[STORE_SERVICE] 店舗が見つかりません: ${storeCode} (${operationId})`);
        return null;
      }

      logger.info(`[STORE_SERVICE] 店舗コード検索完了: ${store.name} (${operationId})`);
      return mapStoreModelToStore(store);
    } catch (error) {
      logger.error(`[STORE_SERVICE] 店舗コード検索エラー (${operationId}):`, error);
      throw error;
    }
  }

  /**
   * 店舗作成
   */
  async createStore(data: CreateStoreRequest): Promise<Store> {
    const operationId = generateOperationId('createStore');
    logger.info(`[STORE_SERVICE] 店舗作成開始: ${data.storeCode} (${operationId})`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 既存の店舗コードとの重複チェック
      const existingStore = await this.storeRepository.findByStoreCode(data.storeCode);
      if (existingStore) {
        throw new ValidationError(`店舗コード ${data.storeCode} は既に使用されています`, []);
      }

      // 店舗作成
      const store = await this.storeRepository.create(data, client);
      
      await client.query('COMMIT');
      
      logger.info(`[STORE_SERVICE] 店舗作成完了: ${store.id} (${operationId})`);
      return mapStoreModelToStore(store);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[STORE_SERVICE] 店舗作成エラー (${operationId}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 店舗更新
   */
  async updateStore(id: UUID, data: UpdateStoreRequest): Promise<Store> {
    const operationId = generateOperationId('updateStore');
    logger.info(`[STORE_SERVICE] 店舗更新開始: ${id} (${operationId})`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 存在確認
      const existingStore = await this.storeRepository.findById(id);
      if (!existingStore) {
        throw new ValidationError(`店舗が見つかりません: ${id}`, []);
      }

      // 店舗コード変更時の重複チェック
      if (data.storeCode && data.storeCode !== existingStore.store_code) {
        const duplicateStore = await this.storeRepository.findByStoreCode(data.storeCode);
        if (duplicateStore) {
          throw new ValidationError(`店舗コード ${data.storeCode} は既に使用されています`, []);
        }
      }

      // 更新実行
      const updatedStore = await this.storeRepository.update(id, data, client);
      
      await client.query('COMMIT');
      
      logger.info(`[STORE_SERVICE] 店舗更新完了: ${updatedStore.store_code} (${operationId})`);
      return mapStoreModelToStore(updatedStore);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[STORE_SERVICE] 店舗更新エラー (${operationId}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 店舗削除（論理削除）
   */
  async deleteStore(id: UUID): Promise<void> {
    const operationId = generateOperationId('deleteStore');
    logger.info(`[STORE_SERVICE] 店舗削除開始: ${id} (${operationId})`);

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 店舗が存在するかチェック
      const existingStore = await this.storeRepository.findById(id);
      if (!existingStore) {
        throw new ValidationError(`削除対象の店舗が見つかりません: ${id}`, []);
      }

      // ユーザーが存在するかチェック
      const usersCount = await this.storeRepository.countUsers(id);
      if (usersCount > 0) {
        logger.warn(`[STORE_SERVICE] 削除対象の店舗が見つかりません: ${existingStore.store_code} (${operationId})`);
        throw new ValidationError(`店舗 ${existingStore.store_code} には ${usersCount} 人のユーザーが所属しているため削除できません`, []);
      }

      // 店舗削除実行
      await this.storeRepository.softDelete(id);
      
      await client.query('COMMIT');
      
      logger.info(`[STORE_SERVICE] 店舗削除完了 (${operationId})`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`[STORE_SERVICE] 店舗削除エラー (${operationId}):`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 店舗の統計情報取得
   */
  async getStoreStatistics(id: UUID): Promise<any> {
    const operationId = generateOperationId('getStoreStatistics');
    logger.info(`[STORE_SERVICE] 店舗統計取得開始: ${id} (${operationId})`);

    try {
      const store = await this.storeRepository.findById(id);
      if (!store) {
        throw new ValidationError(`店舗が見つかりません: ${id}`, []);
      }

      const [usersCount, customersCount] = await Promise.all([
        this.storeRepository.countUsers(id),
        this.storeRepository.countCustomers(id)
      ]);

      const statistics = {
        storeId: id,
        storeCode: store.store_code,
        storeName: store.name,
        usersCount,
        customersCount,
        isActive: store.is_active
      };

      logger.info(`[STORE_SERVICE] 店舗統計取得完了 (${operationId})`);
      return statistics;
    } catch (error) {
      logger.error(`[STORE_SERVICE] 店舗統計取得エラー (${operationId}):`, error);
      throw error;
    }
  }
}