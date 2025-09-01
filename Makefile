# 眼鏡店顧客管理システム - Makefile
# Docker 環境での開発・運用を支援するコマンド集

.PHONY: help build up down logs clean restart test lint format backup restore

# デフォルトターゲット
.DEFAULT_GOAL := help

# 環境変数の読み込み
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# カラー定義
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# =================================================================
# ヘルプ
# =================================================================
help: ## このヘルプメッセージを表示
	@echo "$(BLUE)眼鏡店顧客管理システム - 開発用コマンド$(NC)"
	@echo ""
	@echo "$(YELLOW)基本コマンド:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)使用例:$(NC)"
	@echo "  $(GREEN)make dev$(NC)          # 開発環境を起動"
	@echo "  $(GREEN)make logs$(NC)         # 全サービスのログを表示"
	@echo "  $(GREEN)make test$(NC)         # テストを実行"
	@echo "  $(GREEN)make clean$(NC)        # 全コンテナとボリュームを削除"

# =================================================================
# 開発環境管理
# =================================================================
dev: ## 開発環境を起動（初回セットアップ含む）
	@echo "$(BLUE)開発環境を起動しています...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW).envファイルが見つかりません。テンプレートをコピーします...$(NC)"; \
		cp .env.docker .env; \
	fi
	@docker-compose up -d --build
	@echo "$(GREEN)開発環境が起動しました！$(NC)"
	@echo "$(YELLOW)アクセス先:$(NC)"
	@echo "  フロントエンド: http://localhost:$(FRONTEND_PORT:-3000)"
	@echo "  API: http://localhost:$(BACKEND_PORT:-3001)/api"
	@echo "  Nginx: http://localhost:$(NGINX_PORT:-80)"

build: ## 全コンテナをビルド
	@echo "$(BLUE)コンテナをビルドしています...$(NC)"
	@docker-compose build --no-cache

up: ## サービスを起動
	@echo "$(BLUE)サービスを起動しています...$(NC)"
	@docker-compose up -d

down: ## サービスを停止
	@echo "$(YELLOW)サービスを停止しています...$(NC)"
	@docker-compose down

restart: ## サービスを再起動
	@echo "$(BLUE)サービスを再起動しています...$(NC)"
	@docker-compose restart

stop: ## サービスを停止（ボリュームは保持）
	@echo "$(YELLOW)サービスを停止しています...$(NC)"
	@docker-compose stop

# =================================================================
# ログ・監視
# =================================================================
logs: ## 全サービスのログを表示
	@docker-compose logs -f

logs-backend: ## バックエンドのログのみ表示
	@docker-compose logs -f backend

logs-frontend: ## フロントエンドのログのみ表示
	@docker-compose logs -f frontend

logs-db: ## データベースのログのみ表示
	@docker-compose logs -f postgres

status: ## サービス状態を確認
	@echo "$(BLUE)サービス状態:$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)リソース使用量:$(NC)"
	@docker stats --no-stream

health: ## ヘルスチェックを実行
	@echo "$(BLUE)ヘルスチェックを実行中...$(NC)"
	@curl -f http://localhost:$(NGINX_PORT:-80)/health || echo "$(RED)Nginx: Unhealthy$(NC)"
	@curl -f http://localhost:$(BACKEND_PORT:-3001)/health || echo "$(RED)Backend: Unhealthy$(NC)"
	@curl -f http://localhost:$(FRONTEND_PORT:-3000)/ > /dev/null 2>&1 && echo "$(GREEN)Frontend: Healthy$(NC)" || echo "$(RED)Frontend: Unhealthy$(NC)"

# =================================================================
# データベース管理
# =================================================================
db-connect: ## データベースに接続
	@docker-compose exec postgres psql -U $(POSTGRES_USER:-glasses_user) -d $(POSTGRES_DB:-glasses_store_db)

db-migrate: ## データベースマイグレーションを実行
	@echo "$(BLUE)データベースマイグレーションを実行中...$(NC)"
	@docker-compose exec backend npm run migrate

db-seed: ## 初期データを投入
	@echo "$(BLUE)初期データを投入中...$(NC)"
	@docker-compose exec backend npm run seed

db-reset: ## データベースをリセット（危険：全データ削除）
	@echo "$(RED)警告: 全データが削除されます！$(NC)"
	@read -p "本当に実行しますか？ [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down postgres; \
		docker volume rm $$(docker-compose config --services | grep postgres | head -1)_data 2>/dev/null || true; \
		docker-compose up -d postgres; \
		echo "$(GREEN)データベースをリセットしました$(NC)"; \
	else \
		echo "$(YELLOW)キャンセルしました$(NC)"; \
	fi

# =================================================================
# テスト・品質管理
# =================================================================
test: ## 全テストを実行
	@echo "$(BLUE)テストを実行中...$(NC)"
	@docker-compose run --rm backend npm test
	@docker-compose run --rm frontend npm test -- --coverage --ci

test-backend: ## バックエンドテストのみ実行
	@docker-compose run --rm backend npm test

test-frontend: ## フロントエンドテストのみ実行
	@docker-compose run --rm frontend npm test -- --coverage --ci

lint: ## コードの静的解析を実行
	@echo "$(BLUE)静的解析を実行中...$(NC)"
	@docker-compose run --rm backend npm run lint
	@docker-compose run --rm frontend npm run lint

format: ## コードフォーマットを実行
	@echo "$(BLUE)コードフォーマットを実行中...$(NC)"
	@docker-compose run --rm backend npm run format
	@docker-compose run --rm frontend npm run format

audit: ## セキュリティ監査を実行
	@echo "$(BLUE)セキュリティ監査を実行中...$(NC)"
	@docker-compose run --rm backend npm audit
	@docker-compose run --rm frontend npm audit

# =================================================================
# バックアップ・復元
# =================================================================
backup: ## データベースバックアップを作成
	@echo "$(BLUE)データベースバックアップを作成中...$(NC)"
	@mkdir -p ./backups
	@docker-compose exec postgres pg_dump -U $(POSTGRES_USER:-glasses_user) $(POSTGRES_DB:-glasses_store_db) | gzip > ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "$(GREEN)バックアップが完了しました: ./backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz$(NC)"

restore: ## データベースバックアップから復元
	@echo "$(BLUE)利用可能なバックアップファイル:$(NC)"
	@ls -la ./backups/*.sql.gz 2>/dev/null || echo "$(RED)バックアップファイルが見つかりません$(NC)"
	@echo ""
	@read -p "復元するファイル名を入力してください: " filename; \
	if [ -f "./backups/$$filename" ]; then \
		echo "$(YELLOW)警告: 現在のデータが削除されます！$(NC)"; \
		read -p "本当に実行しますか？ [y/N]: " confirm; \
		if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
			zcat ./backups/$$filename | docker-compose exec -T postgres psql -U $(POSTGRES_USER:-glasses_user) $(POSTGRES_DB:-glasses_store_db); \
			echo "$(GREEN)復元が完了しました$(NC)"; \
		fi; \
	else \
		echo "$(RED)ファイルが見つかりません: $$filename$(NC)"; \
	fi

# =================================================================
# 環境管理
# =================================================================
env: ## 環境変数を表示
	@echo "$(BLUE)現在の環境変数:$(NC)"
	@docker-compose config

env-template: ## 環境変数テンプレートを生成
	@echo "$(BLUE)環境変数テンプレートを生成中...$(NC)"
	@bash scripts/generate-env.sh

setup: ## 初回セットアップを実行
	@echo "$(BLUE)初回セットアップを開始します...$(NC)"
	@if [ ! -f .env ]; then cp .env.docker .env; fi
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
	@if [ ! -f frontend/.env.local ]; then cp frontend/.env.example frontend/.env.local; fi
	@mkdir -p data/postgresql data/redis logs/nginx logs/app uploads/customers backups certs
	@chmod 755 data/postgresql data/redis uploads/customers
	@echo "$(GREEN)セットアップが完了しました！$(NC)"
	@echo "$(YELLOW)次のコマンドで開発環境を起動してください:$(NC)"
	@echo "  make dev"

clean: ## 全コンテナ・ボリューム・イメージを削除
	@echo "$(RED)警告: 全てのコンテナ、ボリューム、イメージが削除されます！$(NC)"
	@read -p "本当に実行しますか？ [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v --rmi all; \
		docker system prune -f; \
		echo "$(GREEN)クリーンアップが完了しました$(NC)"; \
	else \
		echo "$(YELLOW)キャンセルしました$(NC)"; \
	fi

# =================================================================
# 本番環境用
# =================================================================
prod-build: ## 本番環境用ビルド
	@echo "$(BLUE)本番環境用ビルドを実行中...$(NC)"
	@NODE_ENV=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

prod-deploy: ## 本番環境にデプロイ
	@echo "$(BLUE)本番環境にデプロイ中...$(NC)"
	@NODE_ENV=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# =================================================================
# トラブルシューティング
# =================================================================
debug-backend: ## バックエンドコンテナにシェルで接続
	@docker-compose exec backend sh

debug-frontend: ## フロントエンドコンテナにシェルで接続
	@docker-compose exec frontend sh

debug-db: ## データベースコンテナにシェルで接続
	@docker-compose exec postgres sh

debug-nginx: ## Nginxコンテナにシェルで接続
	@docker-compose exec nginx sh

ps: ## コンテナ一覧を表示
	@docker-compose ps

images: ## イメージ一覧を表示
	@docker-compose images

ports: ## ポート使用状況を確認
	@echo "$(BLUE)ポート使用状況:$(NC)"
	@netstat -tlnp | grep -E ':(80|443|3000|3001|5432|6379) '

docker-info: ## Docker環境情報を表示
	@echo "$(BLUE)Docker環境情報:$(NC)"
	@docker version
	@docker-compose version
	@echo ""
	@echo "$(BLUE)システム情報:$(NC)"
	@docker system df