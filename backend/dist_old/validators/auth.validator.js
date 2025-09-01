"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthValidator = void 0;
class AuthValidator {
    static validateLogin(req, res, next) {
        const { userCode, user_code, password, storeCode, store_code } = req.body;
        const finalUserCode = userCode || user_code;
        const finalStoreCode = storeCode || store_code;
        const errors = [];
        if (!finalUserCode) {
            errors.push('ユーザーコードは必須です');
        }
        else if (typeof finalUserCode !== 'string') {
            errors.push('ユーザーコードは文字列である必要があります');
        }
        else if (finalUserCode.length < 3 || finalUserCode.length > 20) {
            errors.push('ユーザーコードは3文字以上20文字以下で入力してください');
        }
        else if (!/^[a-zA-Z0-9_-]+$/.test(finalUserCode)) {
            errors.push('ユーザーコードは英数字、ハイフン、アンダースコアのみ使用できます');
        }
        if (!password) {
            errors.push('パスワードは必須です');
        }
        else if (typeof password !== 'string') {
            errors.push('パスワードは文字列である必要があります');
        }
        else if (password.length < 8 || password.length > 128) {
            errors.push('パスワードは8文字以上128文字以下で入力してください');
        }
        if (!finalStoreCode) {
            errors.push('店舗コードは必須です');
        }
        else if (typeof finalStoreCode !== 'string') {
            errors.push('店舗コードは文字列である必要があります');
        }
        else if (finalStoreCode.length < 3 || finalStoreCode.length > 10) {
            errors.push('店舗コードは3文字以上10文字以下で入力してください');
        }
        else if (!/^[A-Z0-9]+$/.test(finalStoreCode)) {
            errors.push('店舗コードは大文字英数字のみ使用できます');
        }
        if (errors.length > 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力内容に誤りがあります',
                    details: errors
                }
            });
            return;
        }
        next();
    }
    static validateRefreshToken(req, res, next) {
        const { refreshToken } = req.body;
        const errors = [];
        if (!refreshToken) {
            errors.push('リフレッシュトークンは必須です');
        }
        else if (typeof refreshToken !== 'string') {
            errors.push('リフレッシュトークンは文字列である必要があります');
        }
        else if (refreshToken.length < 10) {
            errors.push('リフレッシュトークンが無効です');
        }
        if (errors.length > 0) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: '入力内容に誤りがあります',
                    details: errors
                }
            });
            return;
        }
        next();
    }
    static validatePasswordPolicy(password, userInfo) {
        const errors = [];
        if (password.length < 8) {
            errors.push('パスワードは8文字以上で入力してください');
        }
        if (password.length > 128) {
            errors.push('パスワードは128文字以下で入力してください');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('大文字を1文字以上含めてください');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('小文字を1文字以上含めてください');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('数字を1文字以上含めてください');
        }
        if (userInfo) {
            const lowerPassword = password.toLowerCase();
            if (userInfo.userCode && lowerPassword.includes(userInfo.userCode.toLowerCase())) {
                errors.push('ユーザーコードをパスワードに含めないでください');
            }
            if (userInfo.name) {
                const nameParts = userInfo.name.toLowerCase().split(/\s+/);
                for (const part of nameParts) {
                    if (part.length > 2 && lowerPassword.includes(part)) {
                        errors.push('名前をパスワードに含めないでください');
                        break;
                    }
                }
            }
        }
        const commonPasswords = [
            'password', 'password123', '12345678', '123456789', 'qwerty123',
            'abc12345', 'password1', 'admin123', 'letmein', 'welcome123'
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('よく使われるパスワードは使用できません');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.AuthValidator = AuthValidator;
//# sourceMappingURL=auth.validator.js.map