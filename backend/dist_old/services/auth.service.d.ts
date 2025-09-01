import { Pool } from 'pg';
import { LoginRequest, LoginResponse, User, UUID } from '../types';
export interface LoginResult {
    success: boolean;
    data?: LoginResponse;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}
export interface RefreshResult {
    success: boolean;
    data?: {
        token: string;
        expiresIn: number;
    };
    error?: {
        code: string;
        message: string;
    };
}
export declare class AuthService {
    private db;
    private authRepo;
    constructor(db: Pool);
    login(credentials: LoginRequest, ipAddress: string, userAgent: string): Promise<LoginResult>;
    logout(userId: UUID, token: string): Promise<void>;
    refreshToken(refreshToken: string): Promise<RefreshResult>;
    getCurrentUser(userId: UUID): Promise<User | null>;
    getAllStores(): Promise<{
        id: string;
        storeCode: string;
        name: string;
        address: string;
        phone: string | undefined;
        managerName: string | undefined;
    }[]>;
    private getRolePermissions;
    private detectPlatform;
}
//# sourceMappingURL=auth.service.d.ts.map