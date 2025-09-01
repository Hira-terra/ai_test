import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '@/utils/logger';

interface ValidationOptions {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

/**
 * 汎用バリデーションミドルウェア
 */
export const validate = (schema: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // リクエストボディのバリデーション
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details[0]!.message}`);
      }
    }

    // クエリパラメータのバリデーション
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details[0]!.message}`);
      }
    }

    // パスパラメータのバリデーション
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details[0]!.message}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('バリデーションエラー:', { errors, path: req.path });
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'リクエストデータが無効です',
          details: errors
        }
      });
      return;
    }

    next();
  };
};

// 共通バリデーションスキーマ
const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate'))
  })
};

// 認証関連のバリデーションスキーマ
const authSchemas = {
  login: Joi.object({
    user_code: Joi.string().min(2).max(20).required()
      .messages({
        'string.min': 'ユーザーコードは2文字以上で入力してください',
        'string.max': 'ユーザーコードは20文字以内で入力してください',
        'any.required': 'ユーザーコードは必須です'
      }),
    password: Joi.string().min(6).max(50).required()
      .messages({
        'string.min': 'パスワードは6文字以上で入力してください',
        'string.max': 'パスワードは50文字以内で入力してください',
        'any.required': 'パスワードは必須です'
      }),
    store_code: Joi.string().min(2).max(10).required()
      .messages({
        'string.min': '店舗コードは2文字以上で入力してください',
        'string.max': '店舗コードは10文字以内で入力してください',
        'any.required': '店舗コードは必須です'
      })
  }),

  refresh: Joi.object({
    refreshToken: Joi.string().required()
      .messages({
        'any.required': 'リフレッシュトークンは必須です'
      })
  })
};

// 顧客関連のバリデーションスキーマ
const customerSchemas = {
  create: Joi.object({
    lastName: Joi.string().min(1).max(50).required()
      .messages({
        'string.min': '姓は1文字以上で入力してください',
        'string.max': '姓は50文字以内で入力してください',
        'any.required': '姓は必須です'
      }),
    firstName: Joi.string().min(1).max(50).required()
      .messages({
        'string.min': '名は1文字以上で入力してください',
        'string.max': '名は50文字以内で入力してください',
        'any.required': '名は必須です'
      }),
    lastNameKana: Joi.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/)
      .messages({
        'string.pattern.base': '姓（カナ）はカタカナで入力してください'
      }),
    firstNameKana: Joi.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/)
      .messages({
        'string.pattern.base': '名（カナ）はカタカナで入力してください'
      }),
    gender: Joi.string().valid('male', 'female', 'other'),
    birthDate: Joi.date().iso().max('now'),
    phone: Joi.string().pattern(/^[0-9\-()]+$/).max(20)
      .messages({
        'string.pattern.base': '電話番号は数字、ハイフン、括弧のみ使用できます'
      }),
    mobile: Joi.string().pattern(/^[0-9\-()]+$/).max(20)
      .messages({
        'string.pattern.base': '携帯番号は数字、ハイフン、括弧のみ使用できます'
      }),
    email: Joi.string().email().max(100)
      .messages({
        'string.email': '有効なメールアドレスを入力してください'
      }),
    postalCode: Joi.string().pattern(/^\d{3}-\d{4}$/)
      .messages({
        'string.pattern.base': '郵便番号はXXX-XXXX形式で入力してください'
      }),
    address: Joi.string().max(200),
    notes: Joi.string().max(1000)
  }),

  update: Joi.object({
    lastName: Joi.string().min(1).max(50),
    firstName: Joi.string().min(1).max(50),
    lastNameKana: Joi.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/),
    firstNameKana: Joi.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/),
    gender: Joi.string().valid('male', 'female', 'other'),
    birthDate: Joi.date().iso().max('now'),
    phone: Joi.string().pattern(/^[0-9\-()]+$/).max(20),
    mobile: Joi.string().pattern(/^[0-9\-()]+$/).max(20),
    email: Joi.string().email().max(100),
    postalCode: Joi.string().pattern(/^\d{3}-\d{4}$/),
    address: Joi.string().max(200),
    notes: Joi.string().max(1000)
  }),

  search: Joi.object({
    search: Joi.string().allow('').max(100),
    phone: Joi.string().allow('').max(20),
    address: Joi.string().allow('').max(200),
    ownStoreOnly: Joi.alternatives().try(
      Joi.boolean(),
      Joi.string().valid('true', 'false')
    ).default(true),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('name', 'kana', 'last_visit_date').default('name')
  })
};

// 処方箋関連のバリデーションスキーマ
const prescriptionSchemas = {
  create: Joi.object({
    measuredDate: Joi.date().iso().max('now').required(),
    rightEyeSphere: Joi.number().min(-20).max(20).precision(2),
    rightEyeCylinder: Joi.number().min(-10).max(10).precision(2),
    rightEyeAxis: Joi.number().integer().min(0).max(180),
    rightEyeVision: Joi.number().min(0).max(3.0).precision(1),
    leftEyeSphere: Joi.number().min(-20).max(20).precision(2),
    leftEyeCylinder: Joi.number().min(-10).max(10).precision(2),
    leftEyeAxis: Joi.number().integer().min(0).max(180),
    leftEyeVision: Joi.number().min(0).max(3.0).precision(1),
    pupilDistance: Joi.number().min(40).max(85).precision(1),
    notes: Joi.string().max(500)
  })
};

// エクスポート用のバリデーションミドルウェア
export const validateLoginRequest = validate({
  body: authSchemas.login
});

export const validateRefreshRequest = validate({
  body: authSchemas.refresh
});

export const validateCustomerCreate = validate({
  body: customerSchemas.create
});

export const validateCustomerUpdate = validate({
  body: customerSchemas.update,
  params: Joi.object({
    id: commonSchemas.uuid
  })
});

export const validateCustomerSearch = validate({
  query: customerSchemas.search
});

export const validateCustomerId = validate({
  params: Joi.object({
    id: commonSchemas.uuid
  })
});

export const validatePrescriptionCreate = validate({
  body: prescriptionSchemas.create,
  params: Joi.object({
    customerId: commonSchemas.uuid
  })
});

export const validatePagination = validate({
  query: commonSchemas.pagination
});

export const validateDateRange = validate({
  query: commonSchemas.dateRange
});

/**
 * ファイルアップロードバリデーション
 */
export const validateImageUpload = (req: Request, res: Response, next: NextFunction): void => {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'ファイルが指定されていません'
      }
    });
    return;
  }

  // ファイルサイズチェック（5MB）
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'ファイルサイズは5MB以下にしてください'
      }
    });
    return;
  }

  // ファイルタイプチェック
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'JPEG、PNG、WebPファイルのみアップロード可能です'
      }
    });
    return;
  }

  next();
};