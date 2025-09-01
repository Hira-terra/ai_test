import { Request, Response, NextFunction } from 'express';
declare class RateLimiter {
    private loginLimiter;
    private apiLimiter;
    private refreshLimiter;
    private uploadLimiter;
    constructor();
    private checkRateLimit;
    loginAttempts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    apiRequests: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    tokenRefresh: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    fileUpload: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    authenticatedRequests: (req: any, res: Response, next: NextFunction) => Promise<void>;
}
export declare const rateLimiter: RateLimiter;
export declare const createRateLimiter: (options: {
    points: number;
    duration: number;
    blockDuration?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export {};
//# sourceMappingURL=rateLimiter.d.ts.map