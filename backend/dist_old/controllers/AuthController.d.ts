import { Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
export declare class AuthController {
    login(req: AuthenticatedRequest, res: Response): Promise<void>;
    logout(req: AuthenticatedRequest, res: Response): Promise<void>;
    refresh(req: AuthenticatedRequest, res: Response): Promise<void>;
    me(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map