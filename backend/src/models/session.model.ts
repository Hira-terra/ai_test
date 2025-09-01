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

export class SessionRepository {
  constructor(private db: Pool) {}

  async createSession(
    userId: UUID,
    sessionId: UUID,
    refreshTokenJti: UUID,
    deviceInfo: any,
    ipAddress: string,
    userAgent: string,
    expiresAt: Date
  ): Promise<SessionModel> {
    // 簡略化：セッション作成はRedisで管理
    // 必要に応じて後でuser_sessionsテーブルを追加して実装
    return {
      id: sessionId,
      user_id: userId,
      session_id: sessionId,
      refresh_token_jti: refreshTokenJti,
      device_info: deviceInfo,
      ip_address: ipAddress,
      user_agent: userAgent,
      is_active: true,
      last_activity: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    };
  }

  async findActiveSession(sessionId: UUID): Promise<SessionModel | null> {
    // 簡略化：セッション検索は現在無効
    return null;
  }

  async updateLastActivity(sessionId: UUID): Promise<void> {
    // 簡略化：セッション更新は現在無効
    return;
  }

  async revokeSession(sessionId: UUID): Promise<void> {
    // 簡略化：セッション無効化は現在無効
    return;
  }

  async revokeAllUserSessions(userId: UUID, exceptSessionId?: UUID): Promise<void> {
    // 簡略化：全セッション無効化は現在無効
    return;
  }

  async cleanupOldSessions(userId: UUID, maxSessions: number = 3): Promise<void> {
    // 簡略化：古いセッションのクリーンアップは現在無効
    return;
  }

  async logLoginAttempt(
    userCode: string,
    storeCode: string | null,
    ipAddress: string,
    userAgent: string | null,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    // 簡略化：ログイン試行ログは現在無効
    // 必要に応じて後でlogin_attemptsテーブルを追加して実装
    return;
  }

  async getRecentFailedAttempts(
    userCode: string,
    storeCode: string,
    minutes: number = 15
  ): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE user_code = $1 
        AND store_code = $2
        AND success = false
        AND attempted_at > NOW() - INTERVAL '${minutes} minutes'
    `;

    const result = await this.db.query(query, [userCode, storeCode]);
    return parseInt(result.rows[0].count, 10);
  }
}