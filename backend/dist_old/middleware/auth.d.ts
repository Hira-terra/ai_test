import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        userCode: string;
        storeId: string;
        role: UserRole;
        sessionId?: string;
        permissions?: string[];
    };
}
export declare const authenticate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (allowedRoles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireStoreAccess: (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requirePermission: (requiredPermission: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const requireAnyPermission: (requiredPermissions: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map