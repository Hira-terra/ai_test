import { Pool } from 'pg';
import { UUID, DateString } from '../types';
export interface SessionModel {
    id: UUID;
    user_id: UUID;
    session_id: UUID;
    refresh_token_jti: UUID;
    device_info?: any;
    ip_address?: string;
    user_agent?: string;
    is_active: boolean;
    last_activity: DateString;
    expires_at: DateString;
    created_at: DateString;
}
export interface LoginAttemptModel {
    id: UUID;
    user_code: string;
    store_code?: string;
    ip_address: string;
    user_agent?: string;
    success: boolean;
    failure_reason?: string;
    attempted_at: DateString;
}
export declare class SessionRepository {
    private db;
    constructor(db: Pool);
    createSession(userId: UUID, sessionId: UUID, refreshTokenJti: UUID, deviceInfo: any, ipAddress: string, userAgent: string, expiresAt: Date): Promise<SessionModel>;
    findActiveSession(sessionId: UUID): Promise<SessionModel | null>;
    updateLastActivity(sessionId: UUID): Promise<void>;
    revokeSession(sessionId: UUID): Promise<void>;
    revokeAllUserSessions(userId: UUID, exceptSessionId?: UUID): Promise<void>;
    cleanupOldSessions(userId: UUID, maxSessions?: number): Promise<void>;
    logLoginAttempt(userCode: string, storeCode: string | null, ipAddress: string, userAgent: string | null, success: boolean, failureReason?: string): Promise<void>;
    getRecentFailedAttempts(userCode: string, storeCode: string, minutes?: number): Promise<number>;
}
//# sourceMappingURL=session.model.d.ts.map