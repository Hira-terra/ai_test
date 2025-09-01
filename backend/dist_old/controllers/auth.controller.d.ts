import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
export declare class AuthController {
    private authService;
    constructor();
    login(req: Request, res: Response): Promise<void>;
    logout(req: AuthenticatedRequest, res: Response): Promise<void>;
    refresh(req: Request, res: Response): Promise<void>;
    me(req: AuthenticatedRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map