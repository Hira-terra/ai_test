import Joi from 'joi';
import { OrderStatus, PaymentMethod } from '../types';

// カスタムValidationErrorクラス
export class ValidationError extends Error {
  public details: any;
  
  constructor(message: string, details: any = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// 受注ステータスの値
const orderStatuses: OrderStatus[] = ['ordered', 'prescription_done', 'purchase_ordered', 'lens_received', 'in_production', 'ready', 'delivered', 'cancelled'];
const paymentMethods: PaymentMethod[] = ['cash', 'credit', 'electronic', 'receivable'];

// 受注作成バリデーション
export const orderCreateSchema = Joi.object({
  customerId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': '顧客IDは必須です。',
      'string.uuid': '顧客IDの形式が正しくありません。',
      'any.required': '顧客IDは必須です。'
    }),
  
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .uuid()
          .required()
          .messages({
            'string.empty': '商品IDは必須です。',
            'string.uuid': '商品IDの形式が正しくありません。',
            'any.required': '商品IDは必須です。'
          }),
        
        frameId: Joi.string()
          .uuid()
          .optional()
          .allow(null)
          .messages({
            'string.uuid': 'フレームIDの形式が正しくありません。'
          }),
        
        quantity: Joi.number()
          .integer()
          .min(1)
          .max(99)
          .required()
          .messages({
            'number.base': '数量は数値で入力してください。',
            'number.integer': '数量は整数で入力してください。',
            'number.min': '数量は1以上で入力してください。',
            'number.max': '数量は99以下で入力してください。',
            'any.required': '数量は必須です。'
          }),
        
        unitPrice: Joi.number()
          .min(0)
          .max(9999999)
          .required()
          .messages({
            'number.base': '単価は数値で入力してください。',
            'number.min': '単価は0以上で入力してください。',
            'number.max': '単価は9,999,999以下で入力してください。',
            'any.required': '単価は必須です。'
          }),
        
        prescriptionId: Joi.string()
          .uuid()
          .optional()
          .allow(null)
          .messages({
            'string.uuid': '処方箋IDの形式が正しくありません。'
          }),
        
        notes: Joi.string()
          .max(1000)
          .optional()
          .allow('', null)
          .messages({
            'string.max': 'メモは1000文字以下で入力してください。'
          })
      })
    )
    .min(1)
    .max(20)
    .required()
    .messages({
      'array.min': '商品は最低1つ選択してください。',
      'array.max': '商品は最大20個まで選択できます。',
      'any.required': '商品の選択は必須です。'
    }),
  
  subtotalAmount: Joi.number()
    .min(0)
    .max(99999999)
    .optional()
    .messages({
      'number.base': '小計金額は数値で入力してください。',
      'number.min': '小計金額は0以上で入力してください。',
      'number.max': '小計金額は99,999,999以下で入力してください。'
    }),
  
  taxAmount: Joi.number()
    .min(0)
    .max(9999999)
    .optional()
    .messages({
      'number.base': '消費税額は数値で入力してください。',
      'number.min': '消費税額は0以上で入力してください。',
      'number.max': '消費税額は9,999,999以下で入力してください。'
    }),
  
  totalAmount: Joi.number()
    .min(0)
    .max(99999999)
    .optional()
    .messages({
      'number.base': '合計金額は数値で入力してください。',
      'number.min': '合計金額は0以上で入力してください。',
      'number.max': '合計金額は99,999,999以下で入力してください。'
    }),
  
  paidAmount: Joi.number()
    .min(0)
    .max(99999999)
    .optional()
    .default(0)
    .messages({
      'number.base': '入金金額は数値で入力してください。',
      'number.min': '入金金額は0以上で入力してください。',
      'number.max': '入金金額は99,999,999以下で入力してください。'
    }),
  
  deliveryDate: Joi.date()
    .iso()
    .min('now')
    .optional()
    .allow(null)
    .messages({
      'date.base': '納期の形式が正しくありません。',
      'date.iso': '納期はISO形式で入力してください。',
      'date.min': '納期は現在日時以降で設定してください。'
    }),
  
  paymentMethod: Joi.string()
    .valid(...paymentMethods)
    .required()
    .messages({
      'any.only': '支払方法が正しくありません。',
      'any.required': '支払方法は必須です。'
    }),
  
  status: Joi.string()
    .valid(...orderStatuses)
    .optional()
    .messages({
      'any.only': '受注ステータスが正しくありません。'
    }),
  
  notes: Joi.string()
    .max(2000)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'メモは2000文字以下で入力してください。'
    })
});

// 受注更新バリデーション
export const orderUpdateSchema = Joi.object({
  status: Joi.string()
    .valid(...orderStatuses)
    .optional()
    .messages({
      'any.only': 'ステータスが正しくありません。'
    }),
  
  deliveryDate: Joi.date()
    .iso()
    .optional()
    .allow(null)
    .messages({
      'date.base': '納期の形式が正しくありません。',
      'date.iso': '納期はISO形式で入力してください。'
    }),
  
  notes: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'メモは2000文字以下で入力してください。'
    })
}).min(1).messages({
  'object.min': '更新するデータが指定されていません。'
});

// 入金作成バリデーション
export const paymentCreateSchema = Joi.object({
  orderId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.empty': '受注IDは必須です。',
      'string.uuid': '受注IDの形式が正しくありません。',
      'any.required': '受注IDは必須です。'
    }),
  
  paymentAmount: Joi.number()
    .min(1)
    .max(9999999)
    .required()
    .messages({
      'number.base': '入金額は数値で入力してください。',
      'number.min': '入金額は1以上で入力してください。',
      'number.max': '入金額は9,999,999以下で入力してください。',
      'any.required': '入金額は必須です。'
    }),
  
  paymentMethod: Joi.string()
    .valid(...paymentMethods)
    .required()
    .messages({
      'any.only': '支払方法が正しくありません。',
      'any.required': '支払方法は必須です。'
    }),
  
  notes: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'メモは1000文字以下で入力してください。'
    })
});

// 受注検索バリデーション
export const orderSearchSchema = Joi.object({
  customerId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': '顧客IDの形式が正しくありません。'
    }),
  
  status: Joi.string()
    .valid(...orderStatuses)
    .optional()
    .messages({
      'any.only': 'ステータスが正しくありません。'
    }),
  
  fromDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': '開始日の形式が正しくありません。',
      'date.iso': '開始日はISO形式で入力してください。'
    }),
  
  toDate: Joi.date()
    .iso()
    .optional()
    .min(Joi.ref('fromDate'))
    .messages({
      'date.base': '終了日の形式が正しくありません。',
      'date.iso': '終了日はISO形式で入力してください。',
      'date.min': '終了日は開始日以降で設定してください。'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .optional()
    .default(1)
    .messages({
      'number.base': 'ページ番号は数値で入力してください。',
      'number.integer': 'ページ番号は整数で入力してください。',
      'number.min': 'ページ番号は1以上で入力してください。',
      'number.max': 'ページ番号は1000以下で入力してください。'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      'number.base': '表示件数は数値で入力してください。',
      'number.integer': '表示件数は整数で入力してください。',
      'number.min': '表示件数は1以上で入力してください。',
      'number.max': '表示件数は100以下で入力してください。'
    }),
  
  storeId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': '店舗IDの形式が正しくありません。'
    })
});

// バリデーション実行関数
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  data?: any;
}

export function validateOrderCreate(data: any): ValidationResult {
  const { error, value } = orderCreateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    isValid: true,
    data: value
  };
}

export function validateOrderUpdate(data: any): ValidationResult {
  const { error, value } = orderUpdateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    isValid: true,
    data: value
  };
}

export function validatePaymentCreate(data: any): ValidationResult {
  const { error, value } = paymentCreateSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    isValid: true,
    data: value
  };
}

export function validateOrderSearch(data: any): ValidationResult {
  const { error, value } = orderSearchSchema.validate(data, { 
    abortEarly: false,
    stripUnknown: true 
  });
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    isValid: true,
    data: value
  };
}

// エラーヘルパー関数
export function createValidationError(message: string, details?: any): ValidationError {
  return new ValidationError(message, details);
}

export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError;
}