# Maskwise Easy Deployment Commands

.PHONY: help install dev start stop restart build clean logs status test k8s-deploy k8s-delete k8s-status

# Default target
help:
	@echo "🚀 Maskwise - Easy Deployment Commands"
	@echo "====================================="
	@echo ""
	@echo "Setup:"
	@echo "  make install     Install dependencies"
	@echo "  make setup       First-time setup (install + start)"
	@echo ""
	@echo "Development:"
	@echo "  make dev         Start development servers (local)"
	@echo "  make start       Start all services (Docker)"
	@echo "  make stop        Stop all services"
	@echo "  make restart     Restart all services"
	@echo ""
	@echo "Production:"
	@echo "  make prod        Start production deployment (Docker)"
	@echo "  make prod-stop   Stop production deployment (Docker)"
	@echo ""
	@echo "Kubernetes:"
	@echo "  make k8s-deploy  Deploy to Kubernetes with Helm"
	@echo "  make k8s-delete  Delete Kubernetes deployment"
	@echo "  make k8s-status  Show Kubernetes deployment status"
	@echo "  make k8s-logs    Show Kubernetes logs"
	@echo "  make k8s-port    Port forward for local access"
	@echo ""
	@echo "Maintenance:"
	@echo "  make build       Build all Docker images"
	@echo "  make clean       Clean up containers and volumes"
	@echo "  make logs        Show service logs"
	@echo "  make status      Show service status"
	@echo "  make test        Run integration tests"
	@echo ""
	@echo "Database:"
	@echo "  make db-reset    Reset database"
	@echo "  make db-backup   Backup database"

# Setup and installation
install:
	@echo "📦 Installing dependencies..."
	npm install

setup: install start
	@echo "🎉 Setup complete! Access the app at:"
	@echo "   Frontend: http://localhost:3000"
	@echo "   API: http://localhost:3001"

# Development
dev:
	@echo "🛠️ Starting development servers..."
	npm run dev

# Docker Compose commands
start:
	@echo "🐳 Starting Maskwise services..."
	@./scripts/deploy.sh

stop:
	@echo "🛑 Stopping services..."
	docker-compose down

restart: stop start

# Production deployment
prod:
	@echo "🚀 Starting production deployment..."
	@if [ ! -f .env ]; then echo "❌ .env file not found. Copy .env.example to .env and configure it."; exit 1; fi
	docker-compose -f docker-compose.production.yml up -d

prod-stop:
	@echo "🛑 Stopping production deployment..."
	docker-compose -f docker-compose.production.yml down

# Build and maintenance
build:
	@echo "🔨 Building Docker images..."
	docker-compose build

clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose down -v --remove-orphans
	docker system prune -f

logs:
	@echo "📋 Showing service logs..."
	docker-compose logs -f

status:
	@echo "📊 Service status:"
	docker-compose ps

# Testing
test:
	@echo "🧪 Running integration tests..."
	node tests/test-user-workflow-integration.js

# Database operations
db-reset:
	@echo "🗄️ Resetting database..."
	docker-compose down postgres
	docker volume rm maskwise_postgres_data 2>/dev/null || true
	docker-compose up -d postgres

db-backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U maskwise maskwise > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

# Quick deployment options
quick-start: install start

# Kubernetes commands
k8s-deploy:
	@echo "🚀 Deploying to Kubernetes..."
	@./k8s/deploy.sh

k8s-delete:
	@echo "🗑️ Deleting Kubernetes deployment..."
	helm uninstall maskwise -n maskwise || true
	kubectl delete namespace maskwise || true

k8s-status:
	@echo "📊 Kubernetes deployment status:"
	kubectl get pods -n maskwise
	kubectl get services -n maskwise
	kubectl get ingress -n maskwise

k8s-logs:
	@echo "📋 Showing Kubernetes logs:"
	kubectl logs -n maskwise -l app.kubernetes.io/component=api --tail=50

k8s-port:
	@echo "🔌 Port forwarding (web: 3000, api: 3001)..."
	kubectl port-forward -n maskwise service/maskwise-web 3000:3000 &
	kubectl port-forward -n maskwise service/maskwise-api 3001:3001 &
	@echo "✅ Port forwarding active. Press Ctrl+C to stop."

# Health check
health:
	@echo "🏥 Checking service health..."
	@curl -s http://localhost:3001/health || echo "❌ API not responding"
	@curl -s http://localhost:3000 || echo "❌ Frontend not responding"