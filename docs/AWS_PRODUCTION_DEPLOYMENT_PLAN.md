# 眼鏡店管理システム AWS本番環境デプロイ計画書

**作成日**: 2025年9月18日  
**対象システム**: 眼鏡店チェーン向け顧客・在庫・受注管理システム  
**現在の状況**: ローカルDocker環境完全動作中  

---

## 📋 インフラチームへの要請事項まとめ

### 🏗 **システム概要**
- **アプリケーション**: 眼鏡店チェーン向け顧客・在庫・受注管理システム
- **アーキテクチャ**: Docker Compose ベース（6コンテナ構成）
- **現在の状態**: ローカル開発環境完全動作中
- **技術スタック**: React（Frontend）、Node.js/TypeScript（Backend）、PostgreSQL、Redis、Nginx

### 🎯 **移行目標**
- **開発環境**: ローカルPC Docker環境（現状維持）
- **本番環境**: AWS上でのマネージドサービス構成
- **要件**: 高可用性、セキュリティ、運用効率、コスト最適化

---

## 🎯 推奨AWS インフラ設計案

### **1. コンテナ・アプリケーション層**
```
┌─ Application Load Balancer (ALB) ─┐
│  - HTTPS/TLS終端                   │
│  - WAF統合                         │
│  - Certificate Manager統合         │
└────────────────────────────────────┘
          │
┌─ Amazon ECS Fargate Cluster ──────┐
│  Frontend: React App (Port 3000)   │
│  Backend: Node.js API (Port 3001)  │
│  - Auto Scaling設定               │
│  - Health Check統合               │
│  - CloudWatch Logs統合            │
└────────────────────────────────────┘
```

**重要注意**: pgAdminは本番環境には不要（開発環境のみ）

### **2. データベース・キャッシュ層**
```
┌─ Amazon RDS PostgreSQL 15 ────────┐
│  - Multi-AZ配置（可用性）          │
│  - Read Replica（パフォーマンス）   │
│  - 自動バックアップ（Point-in-Time） │
│  - Encryption at rest             │
└────────────────────────────────────┘

┌─ Amazon ElastiCache Redis ────────┐
│  - Cluster Mode有効               │
│  - Multi-AZ配置                   │
│  - 自動フェイルオーバー            │
└────────────────────────────────────┘
```

### **3. ストレージ・CDN層**
```
┌─ Amazon S3 ───────────────────────┐
│  - 顧客画像・ファイルアップロード   │
│  - Versioning有効                 │
│  - Server-Side Encryption        │
└────────────────────────────────────┘

┌─ Amazon CloudFront ──────────────┐
│  - グローバルCDN（静的ファイル）    │
│  - Origin Shield設定             │
│  - Cache最適化                   │
└────────────────────────────────────┘
```

---

## 🔒 セキュリティ要件

### **1. ネットワークセキュリティ**
```yaml
VPC設定:
  - Private Subnet: ECS、RDS、ElastiCache配置
  - Public Subnet: ALB、NAT Gateway配置
  - Internet Gateway: パブリックアクセス制御
  - NAT Gateway: プライベートサブネットのアウトバウンド

Security Groups:
  ALB-SG:
    - インバウンド: 443/80 from 0.0.0.0/0
    - アウトバウンド: 3000/3001 to ECS-SG
  
  ECS-SG:
    - インバウンド: 3000/3001 from ALB-SG
    - アウトバウンド: 5432 to RDS-SG, 6379 to Redis-SG
  
  RDS-SG:
    - インバウンド: 5432 from ECS-SG のみ
  
  Redis-SG:
    - インバウンド: 6379 from ECS-SG のみ
```

### **2. データ保護**
```yaml
暗号化要件:
  RDS:
    - Encryption at rest (KMS)
    - Encryption in transit (SSL/TLS)
    - Backup encryption
  
  S3:
    - Server-Side Encryption (SSE-S3/KMS)
    - Bucket versioning
    - MFA Delete protection
  
  Application:
    - JWT token encryption
    - Password hashing (bcrypt)
    - API通信 HTTPS強制
```

### **3. アクセス制御**
```yaml
IAM設定:
  ECS Task Role:
    - S3 read/write permissions
    - CloudWatch logs write
    - Parameter Store read
  
  Parameter Store:
    - データベース認証情報
    - API secrets
    - 暗号化（KMS）

WAF Rules:
  - SQL injection protection
  - Cross-site scripting (XSS) protection
  - Rate limiting (DDoS protection)
  - IP whitelist for admin functions
```

---

## 📊 運用・監視要件

### **1. 監視・アラート**
```yaml
CloudWatch監視項目:
  Application Metrics:
    - ECS CPU/Memory使用率 (>80%)
    - Application response time (>2秒)
    - Error rate (>5%)
    - Active user sessions

  Database Metrics:
    - RDS CPU/Memory (>80%)
    - Connection count (>80% of max)
    - Slow query detection
    - Storage usage (>85%)

  Infrastructure Metrics:
    - ALB target health
    - NAT Gateway bandwidth
    - S3 request errors
    - CloudFront cache hit rate

SNS通知:
  - 緊急アラート: 管理者メール + Slack
  - 警告レベル: 管理者メールのみ
  - 営業時間外エスカレーション対応
```

### **2. ログ管理**
```yaml
CloudWatch Logs:
  - ECS Application logs
  - ALB access logs
  - VPC Flow logs
  - CloudTrail API logs

ログ保存期間:
  - Application logs: 30日
  - Access logs: 90日
  - Security logs: 1年
  - Audit logs: 7年（法要件対応）

Log Insights設定:
  - Error pattern detection
  - Performance bottleneck analysis
  - Security incident tracking
```

### **3. バックアップ・災害復旧**
```yaml
RDS Backup:
  - 自動バックアップ: 7日間保持
  - 手動スナップショット: 月次（長期保存）
  - Point-in-Time Recovery: 有効
  - Cross-Region backup: 有効

Application Backup:
  - ECS設定: Terraform state
  - S3 Cross-Region Replication
  - Configuration backup in Git
  - Secrets backup in Parameter Store

災害復旧:
  - RTO: 2時間以内
  - RPO: 24時間以内
  - Multi-AZ配置での自動フェイルオーバー
  - Disaster Recovery runbook作成
```

---

## 🚀 CI/CDパイプライン要件

### **GitHub Actions推奨設定**
```yaml
Pipeline設計:
  Development Branch:
    - ローカルDocker環境での開発
    - Pull Request時の自動テスト
    - Staging環境への自動デプロイ
    - Integration test実行

  Production Branch (main):
    - 本番環境への手動承認デプロイ
    - Blue/Green deployment
    - Smoke test実行
    - Rollback機能

ECR Integration:
  - Docker images自動ビルド
  - Vulnerability scanning
  - Image signing
  - Multi-architecture support

Deploy Strategy:
  - Zero-downtime deployment
  - Health check integration
  - Automatic rollback on failure
```

### **必要なGitHub Secrets**
```yaml
AWS認証:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_REGION

環境変数:
  - RDS_HOSTNAME
  - RDS_PASSWORD
  - JWT_SECRET
  - REDIS_ENDPOINT
```

---

## 💰 コスト見積もり（月額概算）

### **推定月額料金**
```
Application Layer:
  - ECS Fargate (2 vCPU, 4GB): $50-70
  - ALB: $25
  - WAF: $10

Database Layer:
  - RDS PostgreSQL (db.t3.medium): $70-90
  - RDS Read Replica: $70-90
  - ElastiCache Redis (cache.t3.micro): $15

Storage & Network:
  - S3 storage (100GB): $5
  - CloudFront: $10
  - Data transfer: $20
  - NAT Gateway: $32

Monitoring & Security:
  - CloudWatch: $10
  - Parameter Store: $5
  - KMS: $5

Total: $327-372/月 (約50,000円/月)
```

### **コスト最適化案**
```
フェーズ1（最小構成）:
  - Single-AZ RDS: $35-45
  - Read Replica削除: -$70
  - 小さなECSインスタンス: $30-40
  
  削減後合計: $242-287/月 (約38,000円/月)

段階的スケールアップ:
  - トラフィック増加に応じてRead Replica追加
  - Multi-AZ対応は本運用開始後
```

---

## 📋 移行計画

### **フェーズ1: インフラ構築（1-2週間）**
1. **VPC・ネットワーク構築**
   - VPC、Subnet、Security Groups作成
   - NAT Gateway、Internet Gateway設定
   - Route Table設定

2. **データベース・キャッシュ構築**
   - RDS PostgreSQL インスタンス作成
   - ElastiCache Redis クラスター作成
   - Parameter Store設定

3. **ECS・ALB設定**
   - ECS Cluster作成
   - Application Load Balancer設定
   - Target Groups設定

### **フェーズ2: アプリケーションデプロイ（1週間）**
1. **ECR設定**
   - ECR リポジトリ作成
   - Docker image push
   - CI/CD pipeline設定

2. **ECS Service起動**
   - Task Definition作成
   - Service起動・Auto Scaling設定
   - Health Check設定

3. **SSL・DNS設定**
   - Certificate Manager証明書発行
   - Route 53 DNS設定
   - CloudFront設定

### **フェーズ3: 運用開始（1週間）**
1. **監視・アラート設定**
   - CloudWatch Dashboard作成
   - SNS Topic・Subscription設定
   - Log Insights queries設定

2. **バックアップ・セキュリティ設定**
   - RDS バックアップ設定
   - WAF ルール設定
   - IAM Role最適化

3. **負荷テスト・運用テスト**
   - Load testing実行
   - Disaster recovery test
   - 運用手順書作成

---

## ⚠️ 重要な考慮点

### **現在のDocker設定で注意が必要な点**
```yaml
環境変数の本番対応:
  - JWT_SECRET: 本番用の強力なキー生成必要
  - POSTGRES_PASSWORD: 本番用の複雑なパスワード
  - CORS_ORIGIN: 本番ドメインでの設定
  - ファイルアップロード: S3への変更必要

Health Check:
  - 現在: curl localhost:3001/health
  - 要確認: /health エンドポイントの実装確認
  - 必要: ELB health check用エンドポイント

Dockerfile最適化:
  - Multi-stage build確認
  - Production target設定
  - 不要なdevDependencies除外
  - Security vulnerability scanning
```

### **アプリケーション側の修正が必要な項目**
```yaml
必須修正:
  - S3 SDK integration（ファイルアップロード）
  - Database connection pooling
  - Redis session store設定
  - Environment-specific configuration

推奨修正:
  - Graceful shutdown handling
  - Request timeout設定
  - Memory leak prevention
  - Error handling improvement
```

---

## 📞 インフラチームとの調整事項

### **即座に確認が必要な項目**
1. **ドメイン名・SSL証明書の取得・管理方針**
   - 独自ドメインの使用可否
   - SSL証明書の管理主体
   - DNS の管理権限

2. **データ移行計画**
   - 既存データの有無・移行方法
   - 移行中のダウンタイム許容時間
   - データバックアップ方針

3. **セキュリティ・コンプライアンス要件**
   - 個人情報保護法対応
   - 業界固有の規制要件
   - セキュリティ監査要件

4. **運用体制**
   - 24時間監視の必要性
   - エスカレーション手順
   - SLA要件

### **技術的検討事項**
1. **リージョン選択**
   - ap-northeast-1 (東京) 推奨
   - Multi-Region対応の必要性

2. **Auto Scaling設定**
   - 最小・最大インスタンス数
   - スケーリング条件
   - コスト制御

3. **バックアップ戦略**
   - Recovery Point Objective (RPO)
   - Recovery Time Objective (RTO)
   - Cross-region backup要件

---

## 📋 チェックリスト

### **デプロイ前確認事項**
- [ ] ドメイン・SSL証明書取得完了
- [ ] IAM Role・Policy設定完了
- [ ] Security Groups設定完了
- [ ] RDS・ElastiCache構築完了
- [ ] ECR リポジトリ作成完了
- [ ] Parameter Store設定完了
- [ ] CloudWatch監視設定完了

### **アプリケーション準備事項**
- [ ] S3 integration実装完了
- [ ] Health check endpoint実装完了
- [ ] Production Dockerfile最適化完了
- [ ] 環境変数設定完了
- [ ] Error handling強化完了
- [ ] Load testing実行完了

### **運用準備事項**
- [ ] 監視Dashboard作成完了
- [ ] アラート設定完了
- [ ] 運用手順書作成完了
- [ ] 緊急時対応手順作成完了
- [ ] バックアップ・復旧テスト完了

---

## 📄 関連ドキュメント

### **参照すべき既存ドキュメント**
- `docker-compose.yml` - 現在のコンテナ構成
- `.env.example` - 環境変数設定例
- `CLAUDE.md` - システム実装詳細・進捗状況

### **作成予定ドキュメント**
- `AWS_INFRASTRUCTURE.md` - Terraformテンプレート
- `DEPLOYMENT_GUIDE.md` - デプロイ手順詳細
- `OPERATION_RUNBOOK.md` - 運用手順書
- `DISASTER_RECOVERY.md` - 災害復旧手順

---

**最終更新**: 2025年9月18日  
**次回レビュー予定**: インフラチーム検討後