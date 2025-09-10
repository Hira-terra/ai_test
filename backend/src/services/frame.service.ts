import { FrameModel, Frame, CreateFrameData, UpdateFrameData, FrameStatus } from '../models/frame.model';
import { frameStatusHistoryModel } from '../models/frameStatusHistory.model';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface IndividualItemData {
  serialNumber: string;
  color?: string;
  size?: string;
  status?: FrameStatus;
  location?: string;
}

export interface CreateIndividualItemsData {
  purchaseOrderItemId: string;
  productId: string;
  storeId: string;
  purchaseDate: string;
  purchasePrice?: number;
  items: IndividualItemData[];
}

export class FrameService {
  /**
   * 個体管理品の一括登録
   */
  async createIndividualItems(data: CreateIndividualItemsData): Promise<Frame[]> {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] 個体管理品一括登録開始', {
      operationId,
      productId: data.productId,
      itemCount: data.items.length
    });

    try {
      // 個体番号の重複チェック
      await this.validateSerialNumbers(data.items.map(item => item.serialNumber));

      // フレーム個体データの準備
      const framesData: CreateFrameData[] = data.items.map(item => ({
        productId: data.productId,
        storeId: data.storeId,
        serialNumber: item.serialNumber,
        color: item.color,
        size: item.size,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice,
        status: item.status || 'in_stock',
        location: item.location || 'メイン倉庫'
      }));

      // 一括作成実行
      const frames = await FrameModel.createBulk(framesData);

      logger.info('[FRAME_SERVICE] 個体管理品一括登録完了', {
        operationId,
        createdCount: frames.length
      });

      return frames;

    } catch (error) {
      logger.error('[FRAME_SERVICE] 個体管理品一括登録エラー', { 
        error, 
        operationId,
        data: data
      });
      throw error;
    }
  }

  /**
   * 個体番号の重複チェック
   */
  private async validateSerialNumbers(serialNumbers: string[]): Promise<void> {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] 個体番号検証開始', { 
      operationId, 
      count: serialNumbers.length,
      serialNumbers: serialNumbers.slice(0, 5) // 最初の5個のみログ出力
    });

    // 配列内での重複チェック
    const duplicatesInArray = serialNumbers.filter((serial, index) => 
      serialNumbers.indexOf(serial) !== index
    );
    
    if (duplicatesInArray.length > 0) {
      logger.error('[FRAME_SERVICE] 配列内重複検出', { operationId, duplicatesInArray });
      throw new Error(`個体番号が重複しています: ${duplicatesInArray.join(', ')}`);
    }

    // データベース内での重複チェック（一括検索で効率化）
    const existingFramesQuery = `
      SELECT serial_number 
      FROM frames 
      WHERE serial_number = ANY($1::text[])
    `;
    
    try {
      const result = await db.query(existingFramesQuery, [serialNumbers]);
      
      if (result.rows.length > 0) {
        const existingSerials = result.rows.map((row: any) => row.serial_number);
        logger.error('[FRAME_SERVICE] データベース内重複検出', { 
          operationId, 
          existingSerials 
        });
        throw new Error(`個体番号「${existingSerials.join(', ')}」は既に存在します`);
      }
      
      logger.info('[FRAME_SERVICE] 個体番号検証完了', { operationId });
    } catch (error) {
      logger.error('[FRAME_SERVICE] 個体番号検証エラー', { error, operationId });
      throw error;
    }
  }

  /**
   * 店舗別フレーム個体一覧取得
   */
  async getFramesByStore(storeId: string, filters?: {
    status?: FrameStatus;
    productId?: string;
    serialNumber?: string;
  }): Promise<Frame[]> {
    logger.info('[FRAME_SERVICE] 店舗別フレーム個体取得', { storeId, filters });

    try {
      return await FrameModel.findByStore(storeId, filters);
    } catch (error) {
      logger.error('[FRAME_SERVICE] 店舗別フレーム個体取得エラー', { error, storeId });
      throw error;
    }
  }

  /**
   * 商品別フレーム個体一覧取得
   */
  async getFramesByProduct(productId: string, storeId?: string): Promise<Frame[]> {
    logger.info('[FRAME_SERVICE] 商品別フレーム個体取得', { productId, storeId });

    try {
      return await FrameModel.findByProductId(productId, storeId);
    } catch (error) {
      logger.error('[FRAME_SERVICE] 商品別フレーム個体取得エラー', { error, productId });
      throw error;
    }
  }

  /**
   * フレーム個体詳細取得
   */
  async getFrameById(id: string): Promise<Frame | null> {
    logger.info('[FRAME_SERVICE] フレーム個体詳細取得', { id });

    try {
      return await FrameModel.findById(id);
    } catch (error) {
      logger.error('[FRAME_SERVICE] フレーム個体詳細取得エラー', { error, id });
      throw error;
    }
  }

  /**
   * 個体番号検索
   */
  async getFrameBySerialNumber(serialNumber: string): Promise<Frame | null> {
    logger.info('[FRAME_SERVICE] 個体番号検索', { serialNumber });

    try {
      return await FrameModel.findBySerialNumber(serialNumber);
    } catch (error) {
      logger.error('[FRAME_SERVICE] 個体番号検索エラー', { error, serialNumber });
      throw error;
    }
  }

  /**
   * フレーム個体更新
   */
  async updateFrame(id: string, updateData: UpdateFrameData): Promise<Frame | null> {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] フレーム個体更新開始', { operationId, id, updateData });

    try {
      const frame = await FrameModel.update(id, updateData);

      if (!frame) {
        throw new Error(`フレーム個体が見つかりません: ${id}`);
      }

      logger.info('[FRAME_SERVICE] フレーム個体更新完了', { operationId, id });
      return frame;

    } catch (error) {
      logger.error('[FRAME_SERVICE] フレーム個体更新エラー', { error, operationId, id });
      throw error;
    }
  }

  /**
   * フレーム個体のステータス更新（履歴記録付き）
   */
  async updateFrameStatus(
    id: string,
    newStatus: FrameStatus,
    changedBy: string,
    orderId?: string,
    changeReason?: string,
    notes?: string
  ): Promise<Frame | null> {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] ステータス更新開始', { 
      operationId, 
      id, 
      newStatus, 
      changedBy 
    });

    try {
      const frame = await FrameModel.updateStatus(
        id,
        newStatus,
        changedBy,
        orderId,
        changeReason,
        notes
      );

      if (!frame) {
        throw new Error(`フレーム個体が見つかりません: ${id}`);
      }

      logger.info('[FRAME_SERVICE] ステータス更新完了', { operationId, id, newStatus });
      return frame;

    } catch (error) {
      logger.error('[FRAME_SERVICE] ステータス更新エラー', { error, operationId, id });
      throw error;
    }
  }

  /**
   * フレーム個体のステータス履歴取得
   */
  async getFrameStatusHistory(frameId: string) {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] ステータス履歴取得開始', { operationId, frameId });

    try {
      const history = await frameStatusHistoryModel.getFrameStatusHistory(frameId);
      logger.info('[FRAME_SERVICE] ステータス履歴取得完了', { 
        operationId, 
        frameId, 
        historyCount: history.length 
      });
      return history;

    } catch (error) {
      logger.error('[FRAME_SERVICE] ステータス履歴取得エラー', { error, operationId, frameId });
      throw error;
    }
  }

  /**
   * フレーム個体削除
   */
  async deleteFrame(id: string): Promise<boolean> {
    const operationId = uuidv4();
    logger.info('[FRAME_SERVICE] フレーム個体削除開始', { operationId, id });

    try {
      const result = await FrameModel.delete(id);

      if (!result) {
        throw new Error(`フレーム個体が見つかりません: ${id}`);
      }

      logger.info('[FRAME_SERVICE] フレーム個体削除完了', { operationId, id });
      return result;

    } catch (error) {
      logger.error('[FRAME_SERVICE] フレーム個体削除エラー', { error, operationId, id });
      throw error;
    }
  }

  /**
   * ステータス別在庫数取得
   */
  async getInventorySummary(storeId: string, productId?: string): Promise<Record<FrameStatus, number>> {
    logger.info('[FRAME_SERVICE] 在庫サマリー取得', { storeId, productId });

    try {
      const frames = await FrameModel.findByStore(storeId, { productId });
      
      const summary: Record<FrameStatus, number> = {
        in_stock: 0,
        reserved: 0,
        sold: 0,
        damaged: 0,
        transferred: 0
      };

      frames.forEach(frame => {
        summary[frame.status]++;
      });

      return summary;

    } catch (error) {
      logger.error('[FRAME_SERVICE] 在庫サマリー取得エラー', { error, storeId });
      throw error;
    }
  }

  /**
   * 個体番号生成（自動生成ヘルパー）
   */
  generateSerialNumber(productCode: string, storeCode: string = 'ST01', index: number = 1): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // 商品コード-店舗コード-日付-連番 形式
    return `${productCode}-${storeCode}-${timestamp}-${String(index).padStart(3, '0')}`;
  }
}

export const frameService = new FrameService();