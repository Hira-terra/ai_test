import { 
  User, 
  UserRole,
  UUID,
  ApiResponse,
  PaginationInfo
} from '../types';
import { UserRepository } from '../models/user.model';
import { logger } from '../utils/logger';
import bcryptjs from 'bcryptjs';

export interface CreateUserRequest {
  userCode: string;
  name: string;
  email?: string;
  password: string;
  role: UserRole;
  storeId: UUID;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserSearchParams {
  storeId?: string;
  role?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
    logger.info('[UserService] 初期化完了');
  }

  // ユーザー一覧取得
  async getUsers(params: UserSearchParams, operationId: string): Promise<ApiResponse<User[]>> {
    const startTime = Date.now();

    try {
      logger.info(`[UserService:getUsers] ユーザー一覧取得開始 - ${operationId}`, { params });

      const { users, total } = await this.userRepo.findUsers(params);

      const pagination: PaginationInfo = {
        page: params.page || 1,
        limit: params.limit || 50,
        total,
        totalPages: Math.ceil(total / (params.limit || 50)),
        hasNext: ((params.page || 1) * (params.limit || 50)) < total,
        hasPrev: (params.page || 1) > 1
      };

      const duration = Date.now() - startTime;
      logger.info(`[UserService:getUsers] ユーザー一覧取得成功 - ${operationId}`, {
        count: users.length,
        total,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: users,
        meta: { pagination }
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserService:getUsers] ユーザー一覧取得エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        params,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザー一覧の取得に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // ユーザー詳細取得
  async getUserById(id: string, operationId: string): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      logger.info(`[UserService:getUserById] ユーザー詳細取得開始 - ${operationId}`, { id });

      if (!id) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ユーザーIDが指定されていません。'
          }
        };
      }

      const user = await this.userRepo.findUserById(id);

      if (!user) {
        logger.warn(`[UserService:getUserById] ユーザーが見つかりません - ${operationId}`, { id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定されたユーザーが見つかりません。'
          }
        };
      }

      const duration = Date.now() - startTime;
      logger.info(`[UserService:getUserById] ユーザー詳細取得成功 - ${operationId}`, {
        userId: user.id,
        userCode: user.userCode,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: user
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserService:getUserById] ユーザー詳細取得エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        userId: id,
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザー詳細の取得に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // ユーザー作成
  async createUser(userData: CreateUserRequest, operationId: string): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      logger.info(`[UserService:createUser] ユーザー作成開始 - ${operationId}`, {
        userCode: userData.userCode,
        storeId: userData.storeId,
        role: userData.role
      });

      // バリデーション
      if (!userData.userCode || !userData.name || !userData.password || !userData.role || !userData.storeId) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '必要な項目が入力されていません。'
          }
        };
      }

      // ユーザーコードの重複チェック
      const existingUser = await this.userRepo.findUserByUserCode(userData.userCode);
      if (existingUser) {
        logger.warn(`[UserService:createUser] ユーザーコードが既に存在 - ${operationId}`, {
          userCode: userData.userCode
        });
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'このユーザーコードは既に使用されています。'
          }
        };
      }

      // パスワードのハッシュ化
      const saltRounds = 12;
      const hashedPassword = await bcryptjs.hash(userData.password, saltRounds);

      const createData = {
        ...userData,
        password: hashedPassword,
        isActive: userData.isActive !== false // デフォルトはtrue
      };

      const user = await this.userRepo.createUser(createData);

      const duration = Date.now() - startTime;
      logger.info(`[UserService:createUser] ユーザー作成成功 - ${operationId}`, {
        userId: user.id,
        userCode: user.userCode,
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: user
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserService:createUser] ユーザー作成エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        userData: { ...userData, password: '[REDACTED]' },
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザーの作成に失敗しました。',
          details: error.message
        }
      };
    }
  }

  // ユーザー更新
  async updateUser(id: string, updates: UpdateUserRequest, operationId: string): Promise<ApiResponse<User>> {
    const startTime = Date.now();

    try {
      logger.info(`[UserService:updateUser] ユーザー更新開始 - ${operationId}`, {
        id,
        updateFields: Object.keys(updates)
      });

      // パスワードが含まれている場合はハッシュ化
      if (updates.password) {
        const saltRounds = 12;
        updates.password = await bcryptjs.hash(updates.password, saltRounds);
      }

      const user = await this.userRepo.updateUser(id, updates);

      if (!user) {
        logger.warn(`[UserService:updateUser] ユーザーが見つかりません - ${operationId}`, { id });
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '指定されたユーザーが見つかりません。'
          }
        };
      }

      const duration = Date.now() - startTime;
      logger.info(`[UserService:updateUser] ユーザー更新成功 - ${operationId}`, {
        userId: user.id,
        userCode: user.userCode,
        updatedFields: Object.keys(updates),
        duration: `${duration}ms`
      });

      return {
        success: true,
        data: user
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[UserService:updateUser] ユーザー更新エラー - ${operationId}`, {
        error: error.message,
        stack: error.stack,
        userId: id,
        updates: { ...updates, password: updates.password ? '[REDACTED]' : undefined },
        duration: `${duration}ms`
      });

      return {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'ユーザーの更新に失敗しました。',
          details: error.message
        }
      };
    }
  }
}