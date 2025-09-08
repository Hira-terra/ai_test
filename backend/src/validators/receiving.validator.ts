import Joi from 'joi';
import { CreateReceivingRequest } from '../types';

// 品質ステータスの有効値
const qualityStatuses = ['good', 'damaged', 'defective', 'incorrect_spec'];

// 入庫ステータスの有効値
const receivingStatuses = ['partial', 'complete', 'with_issues'];

/**
 * 入庫登録リクエストのバリデーションスキーマ
 */
export const createReceivingSchema = Joi.object({
  purchaseOrderId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': '発注書IDは必須です',
      'string.uuid': '発注書IDの形式が無効です',
      'any.required': '発注書IDは必須です'
    }),

  receivedDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'string.empty': '入庫日は必須です',
      'string.pattern.base': '入庫日はYYYY-MM-DD形式で入力してください',
      'any.required': '入庫日は必須です'
    }),

  items: Joi.array()
    .items(
      Joi.object({
        purchaseOrderItemId: Joi.string()
          .uuid()
          .required()
          .messages({
            'string.empty': '発注明細IDは必須です',
            'string.uuid': '発注明細IDの形式が無効です',
            'any.required': '発注明細IDは必須です'
          }),

        receivedQuantity: Joi.number()
          .integer()
          .min(0)
          .required()
          .messages({
            'number.base': '入庫数量は数値で入力してください',
            'number.integer': '入庫数量は整数で入力してください',
            'number.min': '入庫数量は0以上で入力してください',
            'any.required': '入庫数量は必須です'
          }),

        qualityStatus: Joi.string()
          .valid(...qualityStatuses)
          .default('good')
          .messages({
            'any.only': `品質ステータスは次の値から選択してください: ${qualityStatuses.join(', ')}`
          }),

        actualCost: Joi.number()
          .precision(2)
          .min(0)
          .optional()
          .allow(null)
          .messages({
            'number.base': '実際コストは数値で入力してください',
            'number.precision': '実際コストは小数点以下2桁以内で入力してください',
            'number.min': '実際コストは0以上で入力してください'
          }),

        notes: Joi.string()
          .max(500)
          .optional()
          .allow('')
          .messages({
            'string.max': '備考は500文字以内で入力してください'
          })
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': '入庫明細は1件以上登録してください',
      'any.required': '入庫明細は必須です'
    }),

  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '備考は1000文字以内で入力してください'
    })
});

/**
 * 入庫一覧検索パラメータのバリデーションスキーマ
 */
export const receivingSearchSchema = Joi.object({
  storeId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': '店舗IDの形式が無効です'
    }),

  fromDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': '開始日はYYYY-MM-DD形式で入力してください'
    }),

  toDate: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      'string.pattern.base': '終了日はYYYY-MM-DD形式で入力してください'
    }),

  supplierId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': '仕入先IDの形式が無効です'
    }),

  status: Joi.string()
    .valid(...receivingStatuses)
    .optional()
    .messages({
      'any.only': `ステータスは次の値から選択してください: ${receivingStatuses.join(', ')}`
    }),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'ページ番号は数値で入力してください',
      'number.integer': 'ページ番号は整数で入力してください',
      'number.min': 'ページ番号は1以上で入力してください'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': '取得件数は数値で入力してください',
      'number.integer': '取得件数は整数で入力してください',
      'number.min': '取得件数は1以上で入力してください',
      'number.max': '取得件数は100以下で入力してください'
    })
});

/**
 * 品質チェック結果更新のバリデーションスキーマ
 */
export const qualityCheckSchema = Joi.object({
  receivingItemId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': '入庫明細IDは必須です',
      'string.uuid': '入庫明細IDの形式が無効です',
      'any.required': '入庫明細IDは必須です'
    }),

  qualityStatus: Joi.string()
    .valid(...qualityStatuses)
    .required()
    .messages({
      'any.only': `品質ステータスは次の値から選択してください: ${qualityStatuses.join(', ')}`,
      'any.required': '品質ステータスは必須です'
    }),

  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': '備考は500文字以内で入力してください'
    })
});

/**
 * UUIDパラメータのバリデーションスキーマ
 */
export const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': 'IDは必須です',
      'string.uuid': 'IDの形式が無効です',
      'any.required': 'IDは必須です'
    })
});

/**
 * 入庫完了処理のバリデーションスキーマ
 */
export const completeReceivingSchema = Joi.object({
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': '備考は1000文字以内で入力してください'
    })
});

/**
 * カスタムバリデーション関数：日付範囲の検証
 */
export const validateDateRange = (fromDate?: string, toDate?: string): boolean => {
  if (!fromDate || !toDate) {
    return true; // どちらかが未指定の場合はOK
  }

  const from = new Date(fromDate);
  const to = new Date(toDate);

  return from <= to;
};

/**
 * カスタムバリデーション関数：受注可能数量の検証
 */
export const validateReceivableQuantity = (
  receivedQuantity: number, 
  expectedQuantity: number, 
  alreadyReceivedQuantity: number = 0
): boolean => {
  const remainingQuantity = expectedQuantity - alreadyReceivedQuantity;
  return receivedQuantity <= remainingQuantity && receivedQuantity >= 0;
};

/**
 * バリデーションエラーのフォーマット関数
 */
export const formatValidationError = (error: Joi.ValidationError) => {
  return {
    code: 'VALIDATION_ERROR',
    message: '入力データに問題があります',
    details: error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }))
  };
};

/**
 * リクエストデータの型変換とバリデーション
 */
export const validateCreateReceivingRequest = (data: any): CreateReceivingRequest => {
  const { error, value } = createReceivingSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new Error(`バリデーションエラー: ${formatValidationError(error).details.map(d => d.message).join(', ')}`);
  }

  // 日付範囲の追加チェック
  const receivedDate = new Date(value.receivedDate);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // 今日の終わり

  if (receivedDate > today) {
    throw new Error('入庫日は今日以前の日付を指定してください');
  }

  // 入庫数量が0より大きい明細のみを残す
  value.items = value.items.filter((item: any) => item.receivedQuantity > 0);

  if (value.items.length === 0) {
    throw new Error('入庫数量が1以上の明細を1件以上登録してください');
  }

  return value as CreateReceivingRequest;
};