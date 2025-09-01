import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
interface ValidationOptions {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}
export declare const validate: (schema: ValidationOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateLoginRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRefreshRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateCustomerCreate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateCustomerUpdate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateCustomerSearch: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateCustomerId: (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePrescriptionCreate: (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePagination: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDateRange: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateImageUpload: (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validation.d.ts.map