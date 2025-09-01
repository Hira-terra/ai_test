import Joi from 'joi';
import { 
  Customer, 
  Prescription, 
  CustomerSearchParams,
  CustomerImage,
  CustomerMemo,
  FabricCanvasData 
} from '../types';

// 日本語の正規表現パターン（半角スペースも許可）
const KANA_PATTERN = /^[\u3041-\u3096\u30A1-\u30FA\u30FC\u3000-\u303F ]*$/;
const PHONE_PATTERN = /^[\d-+()]*$/;
const POSTAL_CODE_PATTERN = /^\d{3}-?\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 顧客作成・更新用バリデーションスキーマ
export const customerCreateSchema = Joi.object({
  lastName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': '姓は必須です',
      'string.min': '姓は1文字以上で入力してください',
      'string.max': '姓は50文字以下で入力してください',
      'any.required': '姓は必須です'
    }),

  firstName: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': '名は必須です',
      'string.min': '名は1文字以上で入力してください',
      'string.max': '名は50文字以下で入力してください',
      'any.required': '名は必須です'
    }),

  lastNameKana: Joi.string()
    .pattern(KANA_PATTERN)
    .max(50)
    .allow('', null)
    .messages({
      'string.pattern.base': '姓（カナ）はひらがな・カタカナで入力してください',
      'string.max': '姓（カナ）は50文字以下で入力してください'
    }),

  firstNameKana: Joi.string()
    .pattern(KANA_PATTERN)
    .max(50)
    .allow('', null)
    .messages({
      'string.pattern.base': '名（カナ）はひらがな・カタカナで入力してください',
      'string.max': '名（カナ）は50文字以下で入力してください'
    }),

  fullName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': '氏名は必須です',
      'any.required': '氏名は必須です'
    }),

  fullNameKana: Joi.string()
    .pattern(KANA_PATTERN)
    .max(100)
    .allow('', null)
    .messages({
      'string.pattern.base': '氏名（カナ）はひらがな・カタカナで入力してください'
    }),

  gender: Joi.string()
    .valid('male', 'female', 'other')
    .allow(null)
    .messages({
      'any.only': '性別は男性・女性・その他から選択してください'
    }),

  birthDate: Joi.date()
    .iso()
    .max('now')
    .allow(null)
    .messages({
      'date.format': '生年月日は有効な日付を入力してください',
      'date.max': '生年月日は現在の日付以前を入力してください'
    }),

  age: Joi.number()
    .integer()
    .min(0)
    .max(150)
    .allow(null)
    .messages({
      'number.base': '年齢は数値で入力してください',
      'number.min': '年齢は0以上で入力してください',
      'number.max': '年齢は150以下で入力してください'
    }),

  phone: Joi.string()
    .pattern(PHONE_PATTERN)
    .max(20)
    .allow('', null)
    .messages({
      'string.pattern.base': '電話番号は数字・ハイフン・括弧のみ使用できます',
      'string.max': '電話番号は20文字以下で入力してください'
    }),

  mobile: Joi.string()
    .pattern(PHONE_PATTERN)
    .max(20)
    .allow('', null)
    .messages({
      'string.pattern.base': '携帯電話番号は数字・ハイフン・括弧のみ使用できます',
      'string.max': '携帯電話番号は20文字以下で入力してください'
    }),

  email: Joi.string()
    .pattern(EMAIL_PATTERN)
    .max(100)
    .allow('', null)
    .messages({
      'string.pattern.base': '有効なメールアドレスを入力してください',
      'string.max': 'メールアドレスは100文字以下で入力してください'
    }),

  postalCode: Joi.string()
    .pattern(POSTAL_CODE_PATTERN)
    .allow('', null)
    .messages({
      'string.pattern.base': '郵便番号は123-4567の形式で入力してください'
    }),

  address: Joi.string()
    .max(200)
    .allow('', null)
    .messages({
      'string.max': '住所は200文字以下で入力してください'
    }),

  firstVisitDate: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': '初回来店日は有効な日付を入力してください'
    }),

  visitCount: Joi.number()
    .integer()
    .min(0)
    .default(1)
    .messages({
      'number.base': '来店回数は数値で入力してください',
      'number.min': '来店回数は0以上で入力してください'
    }),

  totalPurchaseAmount: Joi.number()
    .min(0)
    .default(0)
    .messages({
      'number.base': '総購入金額は数値で入力してください',
      'number.min': '総購入金額は0以上で入力してください'
    }),

  notes: Joi.string()
    .max(1000)
    .allow('', null)
    .messages({
      'string.max': '備考は1000文字以下で入力してください'
    }),

  registeredStoreId: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': '登録店舗IDは有効なUUIDである必要があります'
    })
});

// 顧客更新用バリデーションスキーマ（部分更新対応）
export const customerUpdateSchema = customerCreateSchema.fork(
  ['lastName', 'firstName', 'fullName'], 
  (schema) => schema.optional()
);

// 顧客検索パラメータ用バリデーションスキーマ
export const customerSearchSchema = Joi.object({
  search: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': '検索語は100文字以下で入力してください'
    }),

  phone: Joi.string()
    .pattern(PHONE_PATTERN)
    .max(20)
    .allow('')
    .messages({
      'string.pattern.base': '電話番号は数字・ハイフン・括弧のみ使用できます',
      'string.max': '電話番号は20文字以下で入力してください'
    }),

  address: Joi.string()
    .max(200)
    .allow('')
    .messages({
      'string.max': '住所は200文字以下で入力してください'
    }),

  ownStoreOnly: Joi.boolean()
    .default(false),

  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'ページ番号は数値で入力してください',
      'number.min': 'ページ番号は1以上で入力してください'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .messages({
      'number.base': '表示件数は数値で入力してください',
      'number.min': '表示件数は1以上で入力してください',
      'number.max': '表示件数は100以下で入力してください'
    }),

  sort: Joi.string()
    .valid('name', 'kana', 'last_visit_date', 'fullName', 'fullName_asc', 'fullName_desc')
    .default('name')
    .messages({
      'any.only': 'ソート順は name・kana・last_visit_date・fullName・fullName_asc・fullName_desc から選択してください'
    })
});

// 処方箋バリデーションスキーマ
export const prescriptionSchema = Joi.object({
  customerId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '顧客IDは有効なUUID形式である必要があります',
      'any.required': '顧客IDは必須です'
    }),

  measuredDate: Joi.date()
    .iso()
    .required()
    .messages({
      'date.format': '測定日は有効な日付を入力してください',
      'any.required': '測定日は必須です'
    }),

  rightEyeSphere: Joi.number()
    .min(-25)
    .max(25)
    .precision(2)
    .allow(null)
    .messages({
      'number.base': '右眼球面度数は数値で入力してください',
      'number.min': '右眼球面度数は-25以上で入力してください',
      'number.max': '右眼球面度数は25以下で入力してください'
    }),

  rightEyeCylinder: Joi.number()
    .min(-8)
    .max(8)
    .precision(2)
    .allow(null)
    .messages({
      'number.base': '右眼円柱度数は数値で入力してください',
      'number.min': '右眼円柱度数は-8以上で入力してください',
      'number.max': '右眼円柱度数は8以下で入力してください'
    }),

  rightEyeAxis: Joi.number()
    .integer()
    .min(0)
    .max(180)
    .allow(null)
    .messages({
      'number.base': '右眼軸は数値で入力してください',
      'number.min': '右眼軸は0以上で入力してください',
      'number.max': '右眼軸は180以下で入力してください'
    }),

  rightEyeVision: Joi.number()
    .min(0)
    .max(2)
    .precision(1)
    .allow(null)
    .messages({
      'number.base': '右眼視力は数値で入力してください',
      'number.min': '右眼視力は0以上で入力してください',
      'number.max': '右眼視力は2.0以下で入力してください'
    }),

  leftEyeSphere: Joi.number()
    .min(-25)
    .max(25)
    .precision(2)
    .allow(null)
    .messages({
      'number.base': '左眼球面度数は数値で入力してください',
      'number.min': '左眼球面度数は-25以上で入力してください',
      'number.max': '左眼球面度数は25以下で入力してください'
    }),

  leftEyeCylinder: Joi.number()
    .min(-8)
    .max(8)
    .precision(2)
    .allow(null)
    .messages({
      'number.base': '左眼円柱度数は数値で入力してください',
      'number.min': '左眼円柱度数は-8以上で入力してください',
      'number.max': '左眼円柱度数は8以下で入力してください'
    }),

  leftEyeAxis: Joi.number()
    .integer()
    .min(0)
    .max(180)
    .allow(null)
    .messages({
      'number.base': '左眼軸は数値で入力してください',
      'number.min': '左眼軸は0以上で入力してください',
      'number.max': '左眼軸は180以下で入力してください'
    }),

  leftEyeVision: Joi.number()
    .min(0)
    .max(2)
    .precision(1)
    .allow(null)
    .messages({
      'number.base': '左眼視力は数値で入力してください',
      'number.min': '左眼視力は0以上で入力してください',
      'number.max': '左眼視力は2.0以下で入力してください'
    }),

  pupilDistance: Joi.number()
    .min(40)
    .max(85)
    .precision(1)
    .allow(null)
    .messages({
      'number.base': '瞳孔間距離は数値で入力してください',
      'number.min': '瞳孔間距離は40mm以上で入力してください',
      'number.max': '瞳孔間距離は85mm以下で入力してください'
    }),

  notes: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '備考は500文字以下で入力してください'
    })
});

// 画像アップロード用バリデーションスキーマ
export const customerImageSchema = Joi.object({
  customerId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '顧客IDは有効なUUID形式である必要があります',
      'any.required': '顧客IDは必須です'
    }),

  fileName: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.empty': 'ファイル名は必須です',
      'string.max': 'ファイル名は255文字以下で入力してください',
      'any.required': 'ファイル名は必須です'
    }),

  filePath: Joi.string()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'ファイルパスは必須です',
      'string.max': 'ファイルパスは500文字以下で入力してください',
      'any.required': 'ファイルパスは必須です'
    }),

  fileSize: Joi.number()
    .integer()
    .min(1)
    .max(10485760) // 10MB
    .required()
    .messages({
      'number.base': 'ファイルサイズは数値で入力してください',
      'number.min': 'ファイルサイズは1バイト以上である必要があります',
      'number.max': 'ファイルサイズは10MB以下である必要があります',
      'any.required': 'ファイルサイズは必須です'
    }),

  mimeType: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/gif')
    .required()
    .messages({
      'any.only': 'ファイル形式はJPEG、PNG、GIFのみ対応しています',
      'any.required': 'ファイル形式は必須です'
    }),

  imageType: Joi.string()
    .valid('face', 'glasses', 'prescription', 'other')
    .default('other')
    .messages({
      'any.only': '画像タイプは face・glasses・prescription・other から選択してください'
    }),

  title: Joi.string()
    .max(100)
    .allow('', null)
    .messages({
      'string.max': 'タイトルは100文字以下で入力してください'
    }),

  description: Joi.string()
    .max(500)
    .allow('', null)
    .messages({
      'string.max': '説明は500文字以下で入力してください'
    }),

  capturedDate: Joi.date()
    .iso()
    .allow(null)
    .messages({
      'date.format': '撮影日は有効な日付を入力してください'
    })
});

// メモバリデーションスキーマ
export const customerMemoSchema = Joi.object({
  customerId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '顧客IDは有効なUUID形式である必要があります',
      'any.required': '顧客IDは必須です'
    }),

  memoText: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'メモ内容は必須です',
      'string.min': 'メモ内容は1文字以上で入力してください',
      'string.max': 'メモ内容は2000文字以下で入力してください',
      'any.required': 'メモ内容は必須です'
    }),

  memoType: Joi.string()
    .valid('handwritten', 'text')
    .default('text')
    .messages({
      'any.only': 'メモタイプは handwritten・text から選択してください'
    })
});

// 画像注釈バリデーションスキーマ
export const imageAnnotationSchema = Joi.object({
  annotationData: Joi.object({
    version: Joi.string()
      .required()
      .messages({
        'any.required': 'Fabricバージョンは必須です'
      }),

    objects: Joi.array()
      .items(Joi.object().unknown(true))
      .required()
      .messages({
        'any.required': '描画オブジェクトは必須です'
      })
  })
  .required()
  .messages({
    'any.required': '注釈データは必須です'
  })
});

// UUIDパラメータ用バリデーションスキーマ
export const uuidParamSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'IDは有効なUUID形式である必要があります',
      'any.required': 'IDは必須です'
    })
});

// バリデーション実行ヘルパー関数
export const validateCustomerCreate = (data: any) => {
  const { error, value } = customerCreateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('顧客作成データの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateCustomerUpdate = (data: any) => {
  const { error, value } = customerUpdateSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('顧客更新データの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateCustomerSearch = (data: any) => {
  console.log('🔍 Validating search params:', data);
  
  const { error, value } = customerSearchSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    console.error('❌ Validation error details:', error.details);
    throw new ValidationError('検索パラメータの検証に失敗しました', error.details);
  }
  
  console.log('✅ Validation successful:', value);
  return value;
};

export const validatePrescription = (data: any) => {
  const { error, value } = prescriptionSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('処方箋データの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateCustomerImage = (data: any) => {
  const { error, value } = customerImageSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('画像データの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateCustomerMemo = (data: any) => {
  const { error, value } = customerMemoSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('メモデータの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateImageAnnotation = (data: any) => {
  const { error, value } = imageAnnotationSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('画像注釈データの検証に失敗しました', error.details);
  }
  
  return value;
};

export const validateUuidParam = (data: any) => {
  const { error, value } = uuidParamSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    throw new ValidationError('UUIDパラメータの検証に失敗しました', error.details);
  }
  
  return value;
};

// カスタムバリデーションエラークラス
export class ValidationError extends Error {
  public details: any[];
  
  constructor(message: string, details: any[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}