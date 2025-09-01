import { Pool } from 'pg';
import { UserRole, UUID, DateString } from '../types';
export interface UserModel {
    id: UUID;
    user_code: string;
    name: string;
    email?: string;
    password: string;
    role: UserRole;
    is_active: boolean;
    store_id: UUID;
    last_login_at?: DateString;
    created_at: DateString;
    updated_at: DateString;
}
export declare class UserRepository {
    private db;
    constructor(db: Pool);
    findByUserCodeAndStoreCode(userCode: string, storeCode: string): Promise<UserModel | null>;
    findById(id: UUID): Promise<UserModel | null>;
    updateLastLoginAt(id: UUID): Promise<void>;
    incrementFailedLoginCount(id: UUID): Promise<number>;
    lockAccount(id: UUID, lockedUntil: Date): Promise<void>;
    resetFailedLoginCount(id: UUID): Promise<void>;
    unlockAccount(id: UUID): Promise<void>;
    isAccountLocked(id: UUID): Promise<boolean>;
}
//# sourceMappingURL=user.model.d.ts.map