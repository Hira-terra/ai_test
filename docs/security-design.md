# セキュリティ設計書

**バージョン**: 1.0.0  
**最終更新日**: 2025-08-08  
**ステータス**: 設計完了  

## 1. セキュリティ概要

### 1.1 セキュリティ目標

| 要素 | 目標 | 実装手法 |
|------|------|----------|
| **機密性** | 顧客個人情報・原価情報の保護 | 暗号化・アクセス制御・権限分離 |
| **完全性** | データの改ざん防止 | 監査ログ・トランザクション制御・検証機能 |
| **可用性** | サービスの継続性確保 | 冗長化・バックアップ・監視 |
| **認証** | なりすまし防止 | 多要素認証・強固なパスワードポリシー |
| **認可** | 不適切なアクセス防止 | RBAC・店舗データ分離・最小権限原則 |

### 1.2 脅威モデル

#### 外部脅威
- **不正アクセス**: ブルートフォース攻撃、認証情報窃取
- **データ漏洩**: SQLインジェクション、不適切なAPI設計
- **サービス妨害**: DDoS攻撃、リソース枯渇攻撃
- **マルウェア**: ウイルス感染、ランサムウェア

#### 内部脅威
- **権限濫用**: スタッフによる不正アクセス、データ持ち出し
- **ヒューマンエラー**: 誤操作、設定ミス
- **内部犯行**: 悪意のある従業員による情報漏洩

#### システム脅威
- **ゼロデイ脆弱性**: 未知の脆弱性を狙った攻撃
- **設定不備**: セキュリティ設定の不備
- **依存関係の脆弱性**: サードパーティライブラリの脆弱性

## 2. 認証・認可セキュリティ

### 2.1 認証強化策

#### 多層防御アプローチ
```
┌─────────────────┐
│  1. 入力検証    │ ← ユーザーコード・パスワード形式チェック
├─────────────────┤
│  2. レート制限  │ ← ブルートフォース攻撃対策
├─────────────────┤
│  3. アカウントロック│ ← 連続失敗時の一時停止
├─────────────────┤
│  4. パスワード検証│ ← ハッシュ値照合（bcrypt）
├─────────────────┤
│  5. セッション管理│ ← JWT + セッション検証
├─────────────────┤
│  6. 異常検知    │ ← 地理的・時間的異常の検出
└─────────────────┘
```

#### パスワードセキュリティ
```typescript
interface SecurityConfig {
  password: {
    minLength: 8;
    maxLength: 128;
    requireMixedCase: true;
    requireNumbers: true;
    requireSpecialChars: false; // 店舗環境考慮
    preventCommonPasswords: true;
    preventUserInfoInPassword: true;
    historyCount: 5; // パスワード履歴管理
    maxAge: 90; // 90日有効期限
    saltRounds: 12; // bcrypt強度
  };
  
  lockout: {
    maxAttempts: 5;
    lockDuration: 1800; // 30分
    progressiveDelay: true; // 徐々に遅延増加
  };
  
  session: {
    accessTokenExpiry: 3600; // 1時間
    refreshTokenExpiry: 2592000; // 30日
    maxConcurrentSessions: 3; // 同時セッション数
    idleTimeout: 1800; // 30分非活動でタイムアウト
  };
}
```

### 2.2 権限制御の実装

#### 最小権限原則の実装
```sql
-- 権限階層の実装
CREATE VIEW effective_permissions AS
SELECT DISTINCT
    u.id as user_id,
    p.name as permission_name,
    CASE 
        WHEN up.granted IS NOT NULL THEN up.granted
        ELSE true
    END as has_permission
FROM users u
JOIN role_permissions rp ON u.role = rp.role
JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN user_permissions up ON u.id = up.user_id AND p.id = up.permission_id
WHERE u.is_active = true
  AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP);
```

#### 店舗データ分離（RLS）
```sql
-- 行レベルセキュリティポリシー
CREATE POLICY order_access_policy ON orders
    FOR ALL
    TO authenticated_users
    USING (
        -- adminは全店舗アクセス可能
        current_setting('app.user_role') = 'admin'
        OR 
        -- その他は所属店舗のみ
        store_id = current_setting('app.user_store_id')::uuid
    );

-- 顧客データは全店舗共通（業務要件）
CREATE POLICY customer_access_policy ON customers
    FOR ALL
    TO authenticated_users
    USING (true);

-- 原価情報の制限
CREATE POLICY cost_info_policy ON products
    FOR SELECT
    TO authenticated_users
    USING (
        -- 原価参照権限がない場合は原価を NULL に
        CASE 
            WHEN has_permission(current_setting('app.user_id')::uuid, 'cost:read')
            THEN true
            ELSE cost_price IS NULL
        END
    );
```

## 3. データ保護

### 3.1 暗号化戦略

#### 保存時暗号化（Encryption at Rest）
```typescript
interface EncryptionConfig {
  database: {
    // PostgreSQL TDE (Transparent Data Encryption)
    enabled: true;
    algorithm: 'AES-256-GCM';
    keyRotation: 'quarterly';
  };
  
  sensitiveFields: {
    // フィールドレベル暗号化
    fields: ['phone', 'mobile', 'email', 'address'];
    algorithm: 'AES-256-CTR';
    keyDerivation: 'PBKDF2';
  };
  
  files: {
    // 顧客画像の暗号化
    customerImages: {
      enabled: true;
      algorithm: 'AES-256-GCM';
      compressionBeforeEncryption: true;
    };
  };
}

// フィールド暗号化実装例
class FieldEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;

  encrypt(plaintext: string, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      key, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 転送時暗号化（Encryption in Transit）
```nginx
# Nginx SSL設定
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    
    # 強固な暗号化設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

### 3.2 データベースセキュリティ

#### 接続セキュリティ
```typescript
// データベース接続設定
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  ssl: {
    require: true,
    rejectUnauthorized: true,
    ca: fs.readFileSync('./certs/ca-certificate.crt'),
    key: fs.readFileSync('./certs/client-key.key'),
    cert: fs.readFileSync('./certs/client-certificate.crt')
  },
  
  pool: {
    min: 0,
    max: 10,
    idle: 10000,
    acquire: 60000,
    evict: 1000
  },
  
  logging: (sql: string) => {
    // SQLログの記録（機密情報をマスキング）
    const maskedSql = maskSensitiveData(sql);
    logger.debug('Database Query', { sql: maskedSql });
  }
};

// SQL注入対策
class SecureQueryBuilder {
  static buildCustomerSearch(searchTerm: string, limit: number): QueryConfig {
    return {
      text: `
        SELECT id, customer_code, last_name, first_name, 
               last_name_kana, first_name_kana, phone, last_visit_date
        FROM customers 
        WHERE (
          last_name ILIKE $1 OR first_name ILIKE $1 OR
          last_name_kana ILIKE $1 OR first_name_kana ILIKE $1 OR
          phone = $2
        ) AND is_active = true
        ORDER BY last_visit_date DESC
        LIMIT $3
      `,
      values: [`%${searchTerm}%`, searchTerm, limit]
    };
  }

  static buildOrderHistory(customerId: string, storeId?: string): QueryConfig {
    const baseQuery = `
      SELECT o.*, oi.product_name, oi.quantity, oi.unit_price
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.customer_id = $1
    `;
    
    const values = [customerId];
    
    if (storeId) {
      return {
        text: `${baseQuery} AND o.store_id = $2 ORDER BY o.order_date DESC`,
        values: [...values, storeId]
      };
    }
    
    return {
      text: `${baseQuery} ORDER BY o.order_date DESC`,
      values
    };
  }
}
```

## 4. アプリケーションセキュリティ

### 4.1 入力検証・サニタイゼーション

```typescript
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';

class InputValidator {
  // 顧客情報の検証
  static validateCustomerData(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    // 必須フィールドの検証
    if (!data.last_name || !validator.isLength(data.last_name.trim(), { min: 1, max: 50 })) {
      errors.push({ field: 'last_name', message: '姓は1-50文字で入力してください' });
    }

    // 電話番号の検証
    if (data.phone && !validator.isMobilePhone(data.phone, 'ja-JP')) {
      errors.push({ field: 'phone', message: '有効な電話番号を入力してください' });
    }

    // メールアドレスの検証
    if (data.email && !validator.isEmail(data.email)) {
      errors.push({ field: 'email', message: '有効なメールアドレスを入力してください' });
    }

    // 生年月日の検証
    if (data.birth_date && !validator.isDate(data.birth_date)) {
      errors.push({ field: 'birth_date', message: '有効な日付を入力してください' });
    }

    // HTMLタグの除去
    ['last_name', 'first_name', 'notes'].forEach(field => {
      if (data[field]) {
        data[field] = DOMPurify.sanitize(data[field], { ALLOWED_TAGS: [] });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: data
    };
  }

  // 金額データの検証
  static validateCurrency(amount: any): ValidationResult {
    if (!validator.isCurrency(amount.toString(), { 
      symbol: '',
      decimal_separator: '.',
      thousands_separator: '',
      allow_negatives: false
    })) {
      return {
        isValid: false,
        errors: [{ field: 'amount', message: '有効な金額を入力してください' }]
      };
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 0 || numAmount > 9999999.99) {
      return {
        isValid: false,
        errors: [{ field: 'amount', message: '金額は0円以上999万円以下で入力してください' }]
      };
    }

    return { isValid: true, errors: [] };
  }

  // ファイルアップロードの検証
  static validateImageUpload(file: Express.Multer.File): ValidationResult {
    const errors: ValidationError[] = [];

    // ファイルサイズ制限（10MB）
    if (file.size > 10 * 1024 * 1024) {
      errors.push({ field: 'file', message: 'ファイルサイズは10MB以下にしてください' });
    }

    // MIMEタイプの検証
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push({ field: 'file', message: 'JPEG、PNG、GIF形式のファイルのみアップロード可能です' });
    }

    // ファイル拡張子の検証
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push({ field: 'file', message: '許可されていないファイル形式です' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// CSRFトークン実装
class CSRFProtection {
  static generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static validateToken(sessionToken: string, providedToken: string): boolean {
    if (!sessionToken || !providedToken) return false;
    
    return crypto.timingSafeEqual(
      Buffer.from(sessionToken),
      Buffer.from(providedToken)
    );
  }

  static middleware(req: Request, res: Response, next: NextFunction): void {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const sessionToken = req.session?.csrfToken;
      const providedToken = req.headers['x-csrf-token'] || req.body._csrf;

      if (!CSRFProtection.validateToken(sessionToken, providedToken)) {
        return res.status(403).json({
          success: false,
          error: { code: 'CSRF_TOKEN_INVALID', message: '不正なリクエストです' }
        });
      }
    }
    next();
  }
}
```

### 4.2 セッション・Cookie セキュリティ

```typescript
// Expressセッション設定
app.use(session({
  name: 'glasses_store_session',
  secret: process.env.SESSION_SECRET,
  
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS必須
    httpOnly: true, // XSS攻撃対策
    maxAge: 30 * 60 * 1000, // 30分
    sameSite: 'strict' // CSRF攻撃対策
  },
  
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 1800 // 30分
  }),
  
  resave: false,
  saveUninitialized: false,
  rolling: true // アクティビティでセッション延長
}));

// セキュアな Cookie 設定
class SecureCookieManager {
  static setAuthCookie(res: Response, token: string): void {
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1時間
      path: '/api',
      signed: true
    });
  }

  static clearAuthCookie(res: Response): void {
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api',
      signed: true
    });
  }
}
```

## 5. インフラストラクチャセキュリティ

### 5.1 ネットワークセキュリティ

```yaml
# Docker Compose セキュリティ設定
version: '3.8'

services:
  web:
    image: node:18-alpine
    environment:
      - NODE_ENV=production
    networks:
      - app_network
    volumes:
      - ./app:/app:ro
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - db_network
    restart: unless-stopped
    shm_size: 128mb
    command: >
      postgres
      -c ssl=on
      -c ssl_cert_file=/var/lib/postgresql/server.crt
      -c ssl_key_file=/var/lib/postgresql/server.key
      -c log_connections=on
      -c log_disconnections=on
      -c log_statement=all

networks:
  app_network:
    driver: bridge
    internal: true
  db_network:
    driver: bridge
    internal: true

volumes:
  postgres_data:
    driver: local
```

### 5.2 監視・アラート

```typescript
// セキュリティ監視システム
class SecurityMonitor {
  private readonly alertThresholds = {
    failed_login_attempts: 10, // 10分間で10回失敗
    unusual_access_pattern: 50, // 1時間で50回以上のAPI呼び出し
    privilege_escalation_attempts: 1, // 権限昇格の試行は即座にアラート
    data_export_volume: 1000, // 1時間で1000件以上のデータ取得
    off_hours_access: 1 // 営業時間外のアクセス
  };

  async monitorSecurityEvents(): Promise<void> {
    const timeWindow = new Date(Date.now() - 10 * 60 * 1000); // 10分前

    // 1. ログイン失敗の監視
    const failedLogins = await this.getFailedLogins(timeWindow);
    if (failedLogins.length > this.alertThresholds.failed_login_attempts) {
      await this.sendAlert('HIGH', 'Excessive failed login attempts detected', {
        count: failedLogins.length,
        timeWindow: '10 minutes',
        affectedAccounts: failedLogins.map(f => f.user_code)
      });
    }

    // 2. 異常なアクセスパターンの検出
    const apiCalls = await this.getAPICallVolume(new Date(Date.now() - 60 * 60 * 1000));
    const suspiciousUsers = apiCalls.filter(u => u.call_count > this.alertThresholds.unusual_access_pattern);
    
    for (const user of suspiciousUsers) {
      await this.sendAlert('MEDIUM', 'Unusual API access pattern detected', {
        user_id: user.user_id,
        call_count: user.call_count,
        timeWindow: '1 hour'
      });
    }

    // 3. 権限昇格の試行
    const privilegeAttempts = await this.getPrivilegeEscalationAttempts(timeWindow);
    for (const attempt of privilegeAttempts) {
      await this.sendAlert('CRITICAL', 'Privilege escalation attempt detected', attempt);
    }

    // 4. 大量データアクセス
    const dataExports = await this.getLargeDataExports(new Date(Date.now() - 60 * 60 * 1000));
    const suspiciousExports = dataExports.filter(e => e.record_count > this.alertThresholds.data_export_volume);
    
    for (const export_attempt of suspiciousExports) {
      await this.sendAlert('HIGH', 'Large data export detected', export_attempt);
    }
  }

  private async sendAlert(severity: string, message: string, details: any): Promise<void> {
    // 1. データベースに記録
    await this.logSecurityAlert(severity, message, details);

    // 2. 管理者にメール通知
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      await this.sendEmailAlert(severity, message, details);
    }

    // 3. Slack通知
    await this.sendSlackAlert(severity, message, details);

    // 4. 自動対応（必要に応じて）
    if (severity === 'CRITICAL') {
      await this.executeAutomaticResponse(details);
    }
  }

  private async executeAutomaticResponse(details: any): Promise<void> {
    // アカウントの一時停止
    if (details.user_id) {
      await this.temporarilyLockAccount(details.user_id);
    }

    // IPアドレスの一時ブロック
    if (details.ip_address) {
      await this.temporarilyBlockIP(details.ip_address);
    }
  }
}

// ログ分析システム
class LogAnalyzer {
  async analyzeSecurityLogs(): Promise<SecurityReport> {
    const timeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24時間前
      end: new Date()
    };

    return {
      login_analysis: await this.analyzeLoginPatterns(timeRange),
      access_analysis: await this.analyzeAccessPatterns(timeRange),
      error_analysis: await this.analyzeErrorPatterns(timeRange),
      performance_analysis: await this.analyzePerformanceMetrics(timeRange)
    };
  }

  private async analyzeLoginPatterns(timeRange: TimeRange): Promise<LoginAnalysis> {
    const loginAttempts = await this.getLoginAttempts(timeRange);
    
    return {
      total_attempts: loginAttempts.length,
      successful_logins: loginAttempts.filter(l => l.success).length,
      failed_logins: loginAttempts.filter(l => !l.success).length,
      unique_users: new Set(loginAttempts.map(l => l.user_code)).size,
      peak_hours: this.identifyPeakHours(loginAttempts),
      suspicious_patterns: this.identifySuspiciousPatterns(loginAttempts)
    };
  }
}
```

## 6. インシデント対応

### 6.1 インシデント分類

| レベル | 説明 | 対応時間 | 対応チーム |
|--------|------|----------|------------|
| **Critical** | サービス停止、データ漏洩、システム侵害 | 15分以内 | 全チーム |
| **High** | セキュリティ違反、大量の異常アクセス | 1時間以内 | セキュリティチーム |
| **Medium** | 認証エラー増加、パフォーマンス劣化 | 4時間以内 | 運用チーム |
| **Low** | 軽微な設定問題、警告レベルのイベント | 24時間以内 | 開発チーム |

### 6.2 対応プロセス

```typescript
class IncidentResponse {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. インシデントの初期対応
    await this.initialResponse(incident);

    // 2. 影響範囲の調査
    const impact = await this.assessImpact(incident);

    // 3. 封じ込め処理
    await this.containThreat(incident);

    // 4. 根本原因分析
    const rootCause = await this.analyzeRootCause(incident);

    // 5. 復旧処理
    await this.recoverSystem(incident);

    // 6. 事後対応
    await this.postIncidentActivities(incident, rootCause);
  }

  private async containThreat(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'brute_force_attack':
        await this.blockSuspiciousIPs(incident.details.ip_addresses);
        await this.lockAffectedAccounts(incident.details.user_codes);
        break;

      case 'data_breach':
        await this.isolateAffectedSystems();
        await this.revokeAllAccessTokens();
        await this.enableEmergencyMode();
        break;

      case 'privilege_escalation':
        await this.lockAccount(incident.details.user_id);
        await this.auditUserPermissions(incident.details.user_id);
        break;

      case 'malware_detection':
        await this.quarantineAffectedSystems();
        await this.scanAllSystems();
        break;
    }
  }
}
```

## 7. 定期的なセキュリティ対策

### 7.1 定期監査・テスト

```typescript
// 定期セキュリティタスク
class SecurityMaintenance {
  async performWeeklyTasks(): Promise<void> {
    // 1. アクセスログの分析
    await this.analyzeWeeklyAccessLogs();

    // 2. 異常パターンの検出
    await this.detectAnomalousPatterns();

    // 3. 権限の棚卸し
    await this.auditUserPermissions();

    // 4. パスワード有効期限のチェック
    await this.checkPasswordExpiry();
  }

  async performMonthlyTasks(): Promise<void> {
    // 1. セキュリティパッチの適用
    await this.applySecurityPatches();

    // 2. 脆弱性スキャン
    await this.performVulnerabilityScanning();

    // 3. バックアップの検証
    await this.verifyBackupIntegrity();

    // 4. アクセス制御の見直し
    await this.reviewAccessControls();
  }

  async performQuarterlyTasks(): Promise<void> {
    // 1. ペネトレーションテスト
    await this.conductPenetrationTest();

    // 2. 暗号化キーのローテーション
    await this.rotateEncryptionKeys();

    // 3. セキュリティポリシーの見直し
    await this.reviewSecurityPolicies();

    // 4. 災害復旧テスト
    await this.testDisasterRecovery();
  }
}
```

### 7.2 コンプライアンス

#### 個人情報保護法対応
```typescript
interface PrivacyCompliance {
  dataRetention: {
    customerData: '7年間'; // 商法要件
    auditLogs: '3年間';
    sessionLogs: '1年間';
    deletedDataRecovery: '30日間';
  };
  
  consentManagement: {
    explicitConsent: true;
    optOutMechanism: true;
    consentLogging: true;
    consentExpiry: '2年間';
  };
  
  dataSubjectRights: {
    rightToAccess: true;
    rightToRectification: true;
    rightToErasure: true;
    rightToPortability: true;
  };
}

class PrivacyManager {
  async handleDataSubjectRequest(request: DataSubjectRequest): Promise<void> {
    switch (request.type) {
      case 'access':
        await this.providePersonalData(request.customer_id);
        break;
      case 'rectification':
        await this.correctPersonalData(request.customer_id, request.corrections);
        break;
      case 'erasure':
        await this.deletePersonalData(request.customer_id);
        break;
      case 'portability':
        await this.exportPersonalData(request.customer_id);
        break;
    }
  }
}
```

以上で認証システム設計が完了しました。次のフェーズに進みますか？