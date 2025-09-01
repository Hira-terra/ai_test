import { Request, Response, NextFunction } from 'express';
export declare class AuthValidator {
    static validateLogin(req: Request, res: Response, next: NextFunction): void;
    static validateRefreshToken(req: Request, res: Response, next: NextFunction): void;
    static validatePasswordPolicy(password: string, userInfo?: {
        userCode?: string;
        name?: string;
    }): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=auth.validator.d.ts.map