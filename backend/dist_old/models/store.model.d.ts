import { Pool } from 'pg';
import { UUID, DateString } from '../types';
export interface StoreModel {
    id: UUID;
    store_code: string;
    name: string;
    address: string;
    phone?: string;
    manager_name?: string;
    created_at: DateString;
    updated_at: DateString;
}
export declare class StoreRepository {
    private db;
    constructor(db: Pool);
    findByStoreCode(storeCode: string): Promise<StoreModel | null>;
    findById(id: UUID): Promise<StoreModel | null>;
    findAll(): Promise<StoreModel[]>;
}
//# sourceMappingURL=store.model.d.ts.map