import { User, UUID } from '@/types';
export interface JwtPayload {
    userId: UUID;
    userCode: string;
    storeId: UUID;
    role: string;
    permissions?: string[];
    sessionId?: UUID;
    iat?: number;
    exp?: number;
    jti?: UUID;
}
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export declare class AuthUtils {
    private static instance;
    private constructor();
    static getInstance(): AuthUtils;
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
    generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair;
    verifyAccessToken(token: string): JwtPayload;
    verifyRefreshToken(token: string): JwtPayload;
    storeRefreshToken(userId: UUID, refreshToken: string): Promise<void>;
    getStoredRefreshToken(userId: UUID): Promise<string | null>;
    revokeRefreshToken(userId: UUID): Promise<void>;
    blacklistToken(token: string): Promise<void>;
    isTokenBlacklisted(token: string): Promise<boolean>;
    recordLoginAttempt(identifier: string): Promise<number>;
    getLoginAttempts(identifier: string): Promise<number>;
    resetLoginAttempts(identifier: string): Promise<void>;
    isAccountLocked(identifier: string): Promise<boolean>;
    private parseExpirationTime;
    generateSecureCode(length?: number): string;
    sanitizeUserData(user: any): User;
}
export declare const authUtils: AuthUtils;
//# sourceMappingURL=auth.d.ts.map