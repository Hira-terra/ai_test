import { Pool } from 'pg';
import { UserModel } from '../models/user.model';
import { StoreModel } from '../models/store.model';
import { SessionModel } from '../models/session.model';
import { UUID } from '../types';
export declare class AuthRepository {
    private db;
    private userRepo;
    private storeRepo;
    private sessionRepo;
    constructor(db: Pool);
    findUserWithStore(userCode: string, storeCode: string): Promise<{
        user: UserModel;
        store: StoreModel;
    } | null>;
    getUserById(userId: UUID): Promise<{
        user: UserModel;
        store: StoreModel;
    } | null>;
    isAccountLocked(userCode: string, storeCode: string): Promise<boolean>;
    recordLoginAttempt(userCode: string, storeCode: string, ipAddress: string, userAgent: string | null, success: boolean, failureReason?: string): Promise<void>;
    resetLoginAttempts(userId: UUID): Promise<void>;
    updateLastLoginAt(userId: UUID): Promise<void>;
    createSession(userId: UUID, deviceInfo: any, ipAddress: string, userAgent: string, expiresIn: number): Promise<SessionModel>;
    validateSession(sessionId: UUID): Promise<SessionModel | null>;
    revokeSession(sessionId: UUID): Promise<void>;
    revokeAllUserSessions(userId: UUID, exceptSessionId?: UUID): Promise<void>;
    getAllStores(): Promise<StoreModel[]>;
}
//# sourceMappingURL=auth.repository.d.ts.map