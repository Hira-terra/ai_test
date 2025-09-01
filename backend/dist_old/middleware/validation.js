"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateImageUpload = exports.validateDateRange = exports.validatePagination = exports.validatePrescriptionCreate = exports.validateCustomerId = exports.validateCustomerSearch = exports.validateCustomerUpdate = exports.validateCustomerCreate = exports.validateRefreshRequest = exports.validateLoginRequest = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
const logger_1 = require("@/utils/logger");
const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];
        if (schema.body) {
            const { error } = schema.body.validate(req.body);
            if (error) {
                errors.push(`Body: ${error.details[0].message}`);
            }
        }
        if (schema.query) {
            const { error } = schema.query.validate(req.query);
            if (error) {
                errors.push(`Query: ${error.details[0].message}`);
            }
        }
        if (schema.params) {
            const { error } = schema.params.validate(req.params);
            if (error) {
                errors.push(`Params: ${error.details[0].message}`);
            }
        }
        if (errors.length > 0) {
            logger_1.logger.warn('バリデーションエラー:', { errors, path: req.path });
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
exports.validate = validate;
const commonSchemas = {
    uuid: joi_1.default.string().uuid().required(),
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(10)
    }),
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso(),
        endDate: joi_1.default.date().iso().greater(joi_1.default.ref('startDate'))
    })
};
const authSchemas = {
    login: joi_1.default.object({
        user_code: joi_1.default.string().min(2).max(20).required()
            .messages({
            'string.min': 'ユーザーコードは2文字以上で入力してください',
            'string.max': 'ユーザーコードは20文字以内で入力してください',
            'any.required': 'ユーザーコードは必須です'
        }),
        password: joi_1.default.string().min(6).max(50).required()
            .messages({
            'string.min': 'パスワードは6文字以上で入力してください',
            'string.max': 'パスワードは50文字以内で入力してください',
            'any.required': 'パスワードは必須です'
        }),
        store_code: joi_1.default.string().min(2).max(10).required()
            .messages({
            'string.min': '店舗コードは2文字以上で入力してください',
            'string.max': '店舗コードは10文字以内で入力してください',
            'any.required': '店舗コードは必須です'
        })
    }),
    refresh: joi_1.default.object({
        refreshToken: joi_1.default.string().required()
            .messages({
            'any.required': 'リフレッシュトークンは必須です'
        })
    })
};
const customerSchemas = {
    create: joi_1.default.object({
        lastName: joi_1.default.string().min(1).max(50).required()
            .messages({
            'string.min': '姓は1文字以上で入力してください',
            'string.max': '姓は50文字以内で入力してください',
            'any.required': '姓は必須です'
        }),
        firstName: joi_1.default.string().min(1).max(50).required()
            .messages({
            'string.min': '名は1文字以上で入力してください',
            'string.max': '名は50文字以内で入力してください',
            'any.required': '名は必須です'
        }),
        lastNameKana: joi_1.default.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/)
            .messages({
            'string.pattern.base': '姓（カナ）はカタカナで入力してください'
        }),
        firstNameKana: joi_1.default.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/)
            .messages({
            'string.pattern.base': '名（カナ）はカタカナで入力してください'
        }),
        gender: joi_1.default.string().valid('male', 'female', 'other'),
        birthDate: joi_1.default.date().iso().max('now'),
        phone: joi_1.default.string().pattern(/^[0-9\-()]+$/).max(20)
            .messages({
            'string.pattern.base': '電話番号は数字、ハイフン、括弧のみ使用できます'
        }),
        mobile: joi_1.default.string().pattern(/^[0-9\-()]+$/).max(20)
            .messages({
            'string.pattern.base': '携帯番号は数字、ハイフン、括弧のみ使用できます'
        }),
        email: joi_1.default.string().email().max(100)
            .messages({
            'string.email': '有効なメールアドレスを入力してください'
        }),
        postalCode: joi_1.default.string().pattern(/^\d{3}-\d{4}$/)
            .messages({
            'string.pattern.base': '郵便番号はXXX-XXXX形式で入力してください'
        }),
        address: joi_1.default.string().max(200),
        notes: joi_1.default.string().max(1000)
    }),
    update: joi_1.default.object({
        lastName: joi_1.default.string().min(1).max(50),
        firstName: joi_1.default.string().min(1).max(50),
        lastNameKana: joi_1.default.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/),
        firstNameKana: joi_1.default.string().min(1).max(50).pattern(/^[ァ-ヶー]+$/),
        gender: joi_1.default.string().valid('male', 'female', 'other'),
        birthDate: joi_1.default.date().iso().max('now'),
        phone: joi_1.default.string().pattern(/^[0-9\-()]+$/).max(20),
        mobile: joi_1.default.string().pattern(/^[0-9\-()]+$/).max(20),
        email: joi_1.default.string().email().max(100),
        postalCode: joi_1.default.string().pattern(/^\d{3}-\d{4}$/),
        address: joi_1.default.string().max(200),
        notes: joi_1.default.string().max(1000)
    }),
    search: joi_1.default.object({
        search: joi_1.default.string().allow('').max(100),
        phone: joi_1.default.string().allow('').max(20),
        address: joi_1.default.string().allow('').max(200),
        ownStoreOnly: joi_1.default.alternatives().try(joi_1.default.boolean(), joi_1.default.string().valid('true', 'false')).default(true),
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(10),
        sort: joi_1.default.string().valid('name', 'kana', 'last_visit_date').default('name')
    })
};
const prescriptionSchemas = {
    create: joi_1.default.object({
        measuredDate: joi_1.default.date().iso().max('now').required(),
        rightEyeSphere: joi_1.default.number().min(-20).max(20).precision(2),
        rightEyeCylinder: joi_1.default.number().min(-10).max(10).precision(2),
        rightEyeAxis: joi_1.default.number().integer().min(0).max(180),
        rightEyeVision: joi_1.default.number().min(0).max(3.0).precision(1),
        leftEyeSphere: joi_1.default.number().min(-20).max(20).precision(2),
        leftEyeCylinder: joi_1.default.number().min(-10).max(10).precision(2),
        leftEyeAxis: joi_1.default.number().integer().min(0).max(180),
        leftEyeVision: joi_1.default.number().min(0).max(3.0).precision(1),
        pupilDistance: joi_1.default.number().min(40).max(85).precision(1),
        notes: joi_1.default.string().max(500)
    })
};
exports.validateLoginRequest = (0, exports.validate)({
    body: authSchemas.login
});
exports.validateRefreshRequest = (0, exports.validate)({
    body: authSchemas.refresh
});
exports.validateCustomerCreate = (0, exports.validate)({
    body: customerSchemas.create
});
exports.validateCustomerUpdate = (0, exports.validate)({
    body: customerSchemas.update,
    params: joi_1.default.object({
        id: commonSchemas.uuid
    })
});
exports.validateCustomerSearch = (0, exports.validate)({
    query: customerSchemas.search
});
exports.validateCustomerId = (0, exports.validate)({
    params: joi_1.default.object({
        id: commonSchemas.uuid
    })
});
exports.validatePrescriptionCreate = (0, exports.validate)({
    body: prescriptionSchemas.create,
    params: joi_1.default.object({
        customerId: commonSchemas.uuid
    })
});
exports.validatePagination = (0, exports.validate)({
    query: commonSchemas.pagination
});
exports.validateDateRange = (0, exports.validate)({
    query: commonSchemas.dateRange
});
const validateImageUpload = (req, res, next) => {
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
exports.validateImageUpload = validateImageUpload;
//# sourceMappingURL=validation.js.map