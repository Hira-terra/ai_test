import { Store } from '../types';
import { StoreModel } from '../models/store.model';

export const mapStoreModelToStore = (storeModel: StoreModel): Store => ({
  id: storeModel.id,
  storeCode: storeModel.store_code,
  name: storeModel.name,
  address: storeModel.address,
  phone: storeModel.phone,
  managerName: storeModel.manager_name,
  isActive: storeModel.is_active,
  createdAt: storeModel.created_at,
  updatedAt: storeModel.updated_at
});

export const mapStoreModelsToStores = (storeModels: StoreModel[]): Store[] =>
  storeModels.map(mapStoreModelToStore);