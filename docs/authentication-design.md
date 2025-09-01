# 認証システム設計書

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 設計中  

## 1. 認証システム概要

### 1.1 認証アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/JS)    │    │   (Node.js)     │    │   (PostgreSQL)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Login Form    │◄──►│ • JWT Service   │◄──►│ • users table   │
│ • Token Storage │    │ • Auth Guard    │    │ • audit_logs    │
│ • Auto Refresh  │    │ • RBAC System   │    │ • sessions      │
│ • Session Mgmt  │    │ • Middleware    │    │ • permissions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 認証フロー

1. **初期ログイン**
   ```
   User → Login Form → Backend → JWT Token → Frontend Storage
   ```

2. **認証付きAPI呼び出し**
   ```
   Frontend → API Request + JWT → Middleware → Resource Access
   ```

3. **トークンリフレッシュ**
   ```
   Expired Token → Refresh Request → New JWT → Continue Session
   ```

## 2. JWT トークン設計

### 2.1 アクセストークン設計

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "sub": "user_uuid",
  "iat": 1691145600,
  "exp": 1691149200,
  "jti": "token_uuid",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_code": "staff001",
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "role": "staff",
    "is_active": true,
    "store": {
      "id": "store_uuid",
      "code": "STORE001",
      "name": "新宿本店"
    }
  },
  "permissions": ["customer:read", "order:write", "register:operate"],
  "session_id": "session_uuid"
}
```

**有効期限**: 1時間（3600秒）

### 2.2 リフレッシュトークン設計

**Payload**:
```json
{
  "sub": "user_uuid",
  "iat": 1691145600,
  "exp": 1693737600,
  "jti": "refresh_token_uuid",
  "type": "refresh",
  "session_id": "session_uuid"
}
```

**有効期限**: 30日（2592000秒）

### 2.3 トークン管理テーブル

```sql
-- セッション管理テーブル
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID UNIQUE NOT NULL,
    refresh_token_jti UUID UNIQUE NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- トークンブラックリスト
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti UUID UNIQUE NOT NULL,
    token_type ENUM('access', 'refresh') NOT NULL,
    blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reason VARCHAR(100)
);
```

### 2.4 トークン検証フロー

```typescript
// トークン検証ミドルウェア
async function verifyToken(req, res, next) {
  try {
    // 1. トークン抽出
    const token = extractTokenFromHeader(req.headers.authorization);
    
    // 2. JWT検証
    const payload = jwt.verify(token, JWT_SECRET);
    
    // 3. ブラックリスト確認
    const isBlacklisted = await checkTokenBlacklist(payload.jti);
    if (isBlacklisted) throw new Error('Token is blacklisted');
    
    // 4. セッション有効性確認
    const session = await validateSession(payload.session_id);
    if (!session.is_active) throw new Error('Session is inactive');
    
    // 5. ユーザー有効性確認
    const user = await getUserById(payload.sub);
    if (!user.is_active) throw new Error('User is inactive');
    
    // 6. リクエストコンテキストに設定
    req.user = payload.user;
    req.permissions = payload.permissions;
    req.session_id = payload.session_id;
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
```

## 3. 権限制御システム（RBAC）

### 3.1 役割階層設計

```
admin (本部管理者)
  ├── 全システム機能にアクセス可能
  ├── 全店舗データの参照・操作
  ├── ユーザー管理
  └── マスタデータ管理

manager (店長)
  ├── 所属店舗データの全権限
  ├── スタッフ管理（所属店舗のみ）
  ├── 売上分析・レポート
  └── レジ精算承認

staff (一般スタッフ)
  ├── 顧客管理（全店舗共通）
  ├── 受注・在庫管理（所属店舗のみ）
  ├── レジ精算（所属店舗のみ）
  └── 原価情報非表示
```

### 3.2 権限テーブル設計

```sql
-- 権限マスタ
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'customer:read'
    display_name VARCHAR(100) NOT NULL, -- '顧客情報参照'
    resource VARCHAR(30) NOT NULL, -- 'customer'
    action VARCHAR(30) NOT NULL, -- 'read'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ロール・権限関連
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- 個別権限付与（例外的な権限設定）
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, permission_id)
);
```

### 3.3 権限定義

```sql
-- 基本権限の挿入
INSERT INTO permissions (name, display_name, resource, action, description) VALUES
-- 顧客管理権限
('customer:read', '顧客情報参照', 'customer', 'read', '顧客情報を参照する'),
('customer:write', '顧客情報編集', 'customer', 'write', '顧客情報を編集する'),
('customer:create', '顧客登録', 'customer', 'create', '新規顧客を登録する'),
('customer:delete', '顧客削除', 'customer', 'delete', '顧客情報を削除する'),

-- 受注管理権限
('order:read', '受注情報参照', 'order', 'read', '受注情報を参照する'),
('order:write', '受注情報編集', 'order', 'write', '受注情報を編集する'),
('order:create', '受注登録', 'order', 'create', '新規受注を登録する'),
('order:cancel', '受注キャンセル', 'order', 'cancel', '受注をキャンセルする'),

-- レジ精算権限
('register:operate', 'レジ操作', 'register', 'operate', 'レジの開設・精算を行う'),
('register:approve', 'レジ承認', 'register', 'approve', 'レジ精算を承認する'),

-- 在庫管理権限
('inventory:read', '在庫参照', 'inventory', 'read', '在庫情報を参照する'),
('inventory:write', '在庫更新', 'inventory', 'write', '在庫情報を更新する'),

-- 分析・レポート権限
('analytics:store', '店舗分析', 'analytics', 'store', '所属店舗の分析データを参照する'),
('analytics:all', '全店舗分析', 'analytics', 'all', '全店舗の分析データを参照する'),

-- 管理権限
('user:read', 'ユーザー参照', 'user', 'read', 'ユーザー情報を参照する'),
('user:write', 'ユーザー編集', 'user', 'write', 'ユーザー情報を編集する'),
('user:create', 'ユーザー作成', 'user', 'create', '新規ユーザーを作成する'),

-- 原価・機密情報権限
('cost:read', '原価参照', 'cost', 'read', '商品原価情報を参照する'),
('sensitive:read', '機密情報参照', 'sensitive', 'read', '機密情報を参照する');

-- ロール別権限設定
-- staff権限
INSERT INTO role_permissions (role, permission_id) 
SELECT 'staff', id FROM permissions 
WHERE name IN (
    'customer:read', 'customer:write', 'customer:create',
    'order:read', 'order:write', 'order:create', 'order:cancel',
    'register:operate',
    'inventory:read', 'inventory:write'
);

-- manager権限（staff権限 + 追加権限）
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name IN (
    'customer:read', 'customer:write', 'customer:create',
    'order:read', 'order:write', 'order:create', 'order:cancel',
    'register:operate', 'register:approve',
    'inventory:read', 'inventory:write',
    'analytics:store',
    'user:read'
);

-- admin権限（全権限）
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;
```

### 3.4 権限チェック関数

```typescript
// 権限チェック関数
class PermissionService {
  async getUserPermissions(userId: string): Promise<string[]> {
    // 1. ロール基本権限取得
    const rolePermissions = await this.getRolePermissions(userId);
    
    // 2. 個別権限取得
    const userPermissions = await this.getUserSpecificPermissions(userId);
    
    // 3. 権限マージ
    return this.mergePermissions(rolePermissions, userPermissions);
  }

  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  // リソースレベル権限チェック（店舗データ分離）
  canAccessStoreData(user: User, targetStoreId: string): boolean {
    // adminは全店舗アクセス可能
    if (user.role === 'admin') return true;
    
    // その他は所属店舗のみ
    return user.store.id === targetStoreId;
  }

  // 原価情報アクセス制御
  canViewCostInfo(userPermissions: string[]): boolean {
    return this.hasPermission(userPermissions, 'cost:read');
  }
}
```

## 4. パスワードポリシーとセキュリティ対策

### 4.1 パスワードポリシー

```typescript
interface PasswordPolicy {
  minLength: 8;
  maxLength: 128;
  requireUppercase: true;
  requireLowercase: true;
  requireNumbers: true;
  requireSpecialChars: false; // 店舗環境を考慮し任意
  preventCommonPasswords: true;
  preventUserInfoInPassword: true;
  passwordHistoryCount: 5; // 過去5回分のパスワード使い回し禁止
  maxAge: 90; // 90日でパスワード有効期限
  lockoutThreshold: 5; // 5回失敗でアカウントロック
  lockoutDuration: 30; // 30分間ロック
}

// パスワード検証関数
class PasswordValidator {
  validate(password: string, user: User): ValidationResult {
    const errors: string[] = [];

    // 長さチェック
    if (password.length < 8) errors.push('パスワードは8文字以上で入力してください');
    if (password.length > 128) errors.push('パスワードは128文字以下で入力してください');

    // 文字種チェック
    if (!/[A-Z]/.test(password)) errors.push('大文字を1文字以上含めてください');
    if (!/[a-z]/.test(password)) errors.push('小文字を1文字以上含めてください');
    if (!/[0-9]/.test(password)) errors.push('数字を1文字以上含めてください');

    // ユーザー情報含有チェック
    if (this.containsUserInfo(password, user)) {
      errors.push('ユーザー名や個人情報をパスワードに含めないでください');
    }

    // 共通パスワードチェック
    if (this.isCommonPassword(password)) {
      errors.push('よく使われるパスワードは使用できません');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

### 4.2 アカウントロック機能

```sql
-- ログイン試行履歴テーブル
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(20) NOT NULL,
    store_code VARCHAR(10),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_login_attempts_user_time (user_code, attempted_at),
    INDEX idx_login_attempts_ip_time (ip_address, attempted_at)
);

-- アカウントロック状態管理
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_failed_login TIMESTAMP WITH TIME ZONE;
```

```typescript
// アカウントロック管理
class AccountLockService {
  async checkLockStatus(userCode: string): Promise<boolean> {
    const user = await this.getUserByCode(userCode);
    if (!user) return false;

    // ロック期限チェック
    if (user.locked_until && new Date() < user.locked_until) {
      return true; // ロック中
    }

    // ロック期限切れの場合は解除
    if (user.locked_until && new Date() >= user.locked_until) {
      await this.unlockAccount(user.id);
    }

    return false;
  }

  async recordFailedLogin(userCode: string, ipAddress: string): Promise<void> {
    // 失敗試行を記録
    await this.logLoginAttempt(userCode, ipAddress, false);

    // 失敗回数を更新
    const user = await this.getUserByCode(userCode);
    if (user) {
      const newFailCount = user.failed_login_count + 1;
      
      if (newFailCount >= LOCKOUT_THRESHOLD) {
        // アカウントをロック
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION * 60 * 1000);
        await this.lockAccount(user.id, lockUntil);
      } else {
        await this.updateFailedLoginCount(user.id, newFailCount);
      }
    }
  }

  async recordSuccessfulLogin(userCode: string, ipAddress: string): Promise<void> {
    await this.logLoginAttempt(userCode, ipAddress, true);
    
    // 失敗カウントをリセット
    const user = await this.getUserByCode(userCode);
    if (user && user.failed_login_count > 0) {
      await this.resetFailedLoginCount(user.id);
    }
  }
}
```

### 4.3 セキュリティヘッダー設定

```typescript
// セキュリティミドルウェア
app.use((req, res, next) => {
  // セキュリティヘッダー設定
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
});

// CORS設定
app.use(cors({
  origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// レート制限
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10, // 最大10回の試行
  message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
```

## 5. セッション管理と監視ログ

### 5.1 セッション管理

```typescript
class SessionService {
  async createSession(user: User, deviceInfo: any, ipAddress: string): Promise<Session> {
    const sessionId = uuid.v4();
    const refreshTokenJti = uuid.v4();
    
    const session = await this.db.userSessions.create({
      user_id: user.id,
      session_id: sessionId,
      refresh_token_jti: refreshTokenJti,
      device_info: deviceInfo,
      ip_address: ipAddress,
      user_agent: deviceInfo.userAgent,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRES * 1000)
    });

    // 古いセッションのクリーンアップ（最大3セッションまで）
    await this.cleanupOldSessions(user.id);

    return session;
  }

  async validateSession(sessionId: string): Promise<Session | null> {
    const session = await this.db.userSessions.findOne({
      session_id: sessionId,
      is_active: true,
      expires_at: { $gt: new Date() }
    });

    if (session) {
      // 最終活動時間を更新
      await this.updateLastActivity(sessionId);
    }

    return session;
  }

  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    // セッションを無効化
    await this.db.userSessions.update(
      { session_id: sessionId },
      { is_active: false, revoked_at: new Date() }
    );

    // 関連するリフレッシュトークンをブラックリスト登録
    const session = await this.getSession(sessionId);
    if (session) {
      await this.blacklistToken(session.refresh_token_jti, 'refresh', reason);
    }
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const sessions = await this.db.userSessions.find({
      user_id: userId,
      is_active: true,
      session_id: { $ne: exceptSessionId }
    });

    for (const session of sessions) {
      await this.revokeSession(session.session_id, 'forced_logout');
    }
  }
}
```

### 5.2 監査ログ設計

```sql
-- 監査ログテーブル
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'error'
    error_message TEXT,
    duration_ms INTEGER,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_logs_user_time (user_id, occurred_at),
    INDEX idx_audit_logs_action_time (action, occurred_at),
    INDEX idx_audit_logs_resource (resource, resource_id)
);

-- セキュリティイベントログ
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    user_id UUID REFERENCES users(id),
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_security_events_type_time (event_type, occurred_at),
    INDEX idx_security_events_severity (severity, occurred_at)
);
```

```typescript
// 監査ログサービス
class AuditLogService {
  async logAction(
    userId: string,
    sessionId: string,
    action: string,
    resource: string,
    resourceId?: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string,
    result: 'success' | 'failure' | 'error' = 'success',
    errorMessage?: string,
    duration?: number
  ): Promise<void> {
    await this.db.auditLogs.create({
      user_id: userId,
      session_id: sessionId,
      action,
      resource,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
      result,
      error_message: errorMessage,
      duration_ms: duration,
      occurred_at: new Date()
    });
  }

  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    userId?: string,
    sessionId?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.db.securityEvents.create({
      event_type: eventType,
      severity,
      user_id: userId,
      session_id: sessionId,
      ip_address: ipAddress,
      details,
      occurred_at: new Date()
    });

    // 重要度が高い場合は即座にアラート
    if (severity === 'high' || severity === 'critical') {
      await this.sendSecurityAlert(eventType, details);
    }
  }

  // 重要な操作の監査ログ
  logCustomerAccess = (userId: string, customerId: string, action: string) => 
    this.logAction(userId, null, action, 'customer', customerId);

  logOrderOperation = (userId: string, orderId: string, action: string, oldValues?: any, newValues?: any) =>
    this.logAction(userId, null, action, 'order', orderId, oldValues, newValues);

  logCashRegisterOperation = (userId: string, registerId: string, action: string, values?: any) =>
    this.logAction(userId, null, action, 'cash_register', registerId, null, values);

  logPrivilegedAccess = (userId: string, resource: string, action: string) =>
    this.logSecurityEvent('privileged_access', 'medium', { resource, action }, userId);
}
```

### 5.3 異常検知アルゴリズム

```typescript
class SecurityMonitoringService {
  async detectAnomalies(): Promise<void> {
    // 1. 短時間での大量ログイン失敗
    await this.detectBruteForceAttacks();
    
    // 2. 異常な場所からのアクセス
    await this.detectUnusualLocationAccess();
    
    // 3. 深夜時間帯の重要操作
    await this.detectOffHoursActivity();
    
    // 4. 権限昇格の試行
    await this.detectPrivilegeEscalation();
    
    // 5. 大量データアクセス
    await this.detectMassDataAccess();
  }

  private async detectBruteForceAttacks(): Promise<void> {
    const suspiciousAttempts = await this.db.query(`
      SELECT user_code, ip_address, COUNT(*) as attempt_count
      FROM login_attempts 
      WHERE success = false 
        AND attempted_at > NOW() - INTERVAL '1 hour'
      GROUP BY user_code, ip_address
      HAVING COUNT(*) >= 10
    `);

    for (const attempt of suspiciousAttempts) {
      await this.auditLog.logSecurityEvent(
        'brute_force_attack',
        'high',
        {
          user_code: attempt.user_code,
          ip_address: attempt.ip_address,
          attempt_count: attempt.attempt_count
        }
      );
    }
  }

  private async detectUnusualLocationAccess(): Promise<void> {
    // IPアドレスの地理的位置を分析
    const unusualAccess = await this.analyzeGeographicalAccess();
    
    for (const access of unusualAccess) {
      await this.auditLog.logSecurityEvent(
        'unusual_location_access',
        'medium',
        access
      );
    }
  }
}
```

これで認証システムの詳細設計の第一段階が完了しました。JWTトークン設計、権限制御、セキュリティ対策、監査ログまでの包括的な設計を行いました。

次は認証ミドルウェアとガードの実装設計に進みましょうか？
