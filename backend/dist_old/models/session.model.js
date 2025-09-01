"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
class SessionRepository {
    constructor(db) {
        this.db = db;
    }
    async createSession(userId, sessionId, refreshTokenJti, deviceInfo, ipAddress, userAgent, expiresAt) {
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
    async findActiveSession(sessionId) {
        return null;
    }
    async updateLastActivity(sessionId) {
        return;
    }
    async revokeSession(sessionId) {
        return;
    }
    async revokeAllUserSessions(userId, exceptSessionId) {
        return;
    }
    async cleanupOldSessions(userId, maxSessions = 3) {
        return;
    }
    async logLoginAttempt(userCode, storeCode, ipAddress, userAgent, success, failureReason) {
        return;
    }
    async getRecentFailedAttempts(userCode, storeCode, minutes = 15) {
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
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=session.model.js.map