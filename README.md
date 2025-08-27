# MaskWise - Enterprise PII Anonymization Platform

Maskwise is a single-tenant data privacy platform built to detect, redact, mask, and anonymize sensitive information across unstructured text, images, and structured data within LLM training datasets. It automatically identifies and classifies personally identifiable information (PII), payment data, health records, and other regulated content. The system supports 50+ document and file formats, applies anonymization while preserving original structure and formatting, and generates full compliance audit trails for traceability and verification.

## Overview

  - Microsoft Presidio Integration with 15+ compliance entity types (SSN, Credit Cards, HIPAA, GDPR etc)
  - RBAC with comprehensive audit trails
  - Full Office Suite Support (Word, Excel, PowerPoint, PDF) with format preservation
  - Batch Processing for enterprise-scale volumes
  - OCR Integration for scanned documents
  - Policy-driven Processing with customizable business rules
  - Format-preserving Anonymization maintaining document usability
  - Multiple Strategies (`redact`, `mask`, `replace`, `encrypt`)
  - Original + Anonymized Downloads for audit workflows
  - On-premise & Docker Installation
  - RESTful API for existing system integration
  - Single Sign-On Ready (Active Directory, SAML, OIDC)

You can deploy Maskwise in 24 hours an reduce PII exposure risk by 95%. Maskwise can process thousands of documents per hour.

## 🚀 Quick Deploy with Docker (Recommended)

**Deploy Maskwise in under 5 minutes using pre-built images:**

```bash
# 1. Clone repository
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise

# 2. Configure environment (required)
cp .env.production.example .env
# Edit .env: Set POSTGRES_PASSWORD and JWT_SECRET

# 3. Deploy all services 
docker-compose -f docker-compose.production.yml up -d

# 4. Initialize database (one-time setup)
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
docker-compose -f docker-compose.production.yml exec api npx prisma db seed

# 5. Access Maskwise
# Frontend: http://localhost:3000
# Login: admin@maskwise.com / admin123
```

**✅ Ready-to-use Docker images available:**
- `ghcr.io/bluewave-labs/maskwise-api:latest`
- `ghcr.io/bluewave-labs/maskwise-worker:latest` 
- `ghcr.io/bluewave-labs/maskwise-web:latest`

## Maskwise use cases for AI and LLMs

### 1. Safe training data curation  
LLM training datasets often contain sensitive information like PII or confidential business data. Maskwise detects and anonymizes this content before ingestion, preventing models from memorizing or leaking private details.  

### 2. Fine-tuning on proprietary data  
When fine-tuning LLMs with internal corpora such as customer conversations or documents, regulated data may slip through. Maskwise redacts or masks sensitive fields while preserving structure, enabling safe and compliant fine-tuning.  

### 3. Prompt and response anonymization  
Prompts and outputs collected for evaluation or reinforcement learning can include sensitive content. Maskwise anonymizes these logs before they’re stored or shared, reducing exposure and ensuring privacy.  

### 4. Synthetic dataset generation  
To expand training data safely, Maskwise anonymizes real records and replaces them with synthetic placeholders. This preserves realism for model training while protecting user privacy.  

## Architecture

This is a monorepo containing:

- **apps/web** - Next.js frontend with shadcn/ui
- **apps/api** - NestJS backend API
- **apps/worker** - Background job processor
- **packages/shared** - Shared utilities and helpers
- **packages/types** - TypeScript type definitions
- **packages/database** - Database schemas and migrations

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + shadcn/ui + TailwindCSS
- **Backend**: NestJS + TypeScript + PostgreSQL + Redis
- **Processing**: Microsoft Presidio + Apache Tika + Tesseract OCR
- **Deployment**: Docker Compose

## Screenshots

### Main dashboard

<img width="1387" height="790" alt="image" src="https://github.com/user-attachments/assets/29982118-74f9-4934-b90e-c755a0953f50" />

### Project view

<img width="1389" height="789" alt="image" src="https://github.com/user-attachments/assets/9e0e5d71-7f9f-4c67-89f5-733d66c6058b" />

### Datasets view

<img width="1391" height="785" alt="image" src="https://github.com/user-attachments/assets/c7bfa5c2-5cf2-4765-9cc6-a0190f7b7bd1" />

### Jobs overview

<img width="1390" height="786" alt="image" src="https://github.com/user-attachments/assets/debb8d53-0d9e-41f1-81cf-423eaaaa3fa4" />

### Anonymization workflow

<img width="1387" height="784" alt="image" src="https://github.com/user-attachments/assets/505d1aee-cb96-4a1c-805d-706c1ee91f2a" />

### Policies 

<img width="1383" height="791" alt="image" src="https://github.com/user-attachments/assets/e7fbf7aa-abaa-41eb-8806-6262108b7500" />


### Settings 

<img width="1389" height="778" alt="image" src="https://github.com/user-attachments/assets/228ce6d8-7dbc-49ef-bd2b-d8f0b2c818c8" />


## Quick Start

### Option 1: Docker Images (Recommended)

**🚀 Zero-build deployment with pre-built images from GitHub Container Registry:**

**Prerequisites:**
- Docker and Docker Compose installed
- 4GB+ RAM available

**Quick Deploy:**
```bash
# Clone and configure
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise
cp .env.production.example .env
# Edit .env: Set POSTGRES_PASSWORD, JWT_SECRET

# Deploy all services instantly
docker-compose -f docker-compose.production.yml up -d

# One-time database setup
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
docker-compose -f docker-compose.production.yml exec api npx prisma db seed
```

**Access Application:**
- **🌐 Web UI**: http://localhost:3000
- **🔗 API**: http://localhost:3001  
- **👤 Admin Login**: admin@maskwise.com / admin123

**Service Status Check:**
```bash
# Verify all services are healthy
docker-compose -f docker-compose.production.yml ps
```

**✅ Pre-built Docker Images (No Build Required):**
- `ghcr.io/bluewave-labs/maskwise-api:latest` - Backend API service
- `ghcr.io/bluewave-labs/maskwise-worker:latest` - Background job processor  
- `ghcr.io/bluewave-labs/maskwise-web:latest` - Frontend web application

**Features:**
- Multi-platform support (linux/amd64, linux/arm64)
- Security-optimized Alpine Linux base
- Automated health checks and restart policies
- Production-ready with resource limits

See [DOCKER.md](DOCKER.md) for complete Docker deployment guide.

### Option 2: Development Setup

**For development with live code changes:**

**Prerequisites:**
- **Docker** and **Docker Compose** installed and running
- **Node.js 18+** and **npm** installed
- **PostgreSQL client** (optional, for direct database access)

### Quick Setup Script (Alternative)
```bash
# Automated setup of infrastructure and database
./start-dev.sh
```
Then follow the terminal instructions to start the three application services.

### Installation Steps (Manual)

1. **Clone and Install Dependencies**
   ```bash
   git clone https://github.com/your-org/maskwise.git
   cd maskwise
   npm install
   ```

2. **Start Infrastructure Services**
   ```bash
   # Start PostgreSQL, Redis, Presidio, Tika, and Tesseract
   docker-compose up -d postgres redis presidio-analyzer presidio-anonymizer tika tesseract
   
   # Wait for services to be healthy (about 30-60 seconds)
   docker-compose ps
   ```

3. **Set Up Database**
   ```bash
   # Navigate to database package
   cd packages/database
   
   # Generate Prisma client
   npx prisma generate
   
   # Run migrations
   npx prisma migrate deploy
   
   # Seed database with admin user and policies
   npx prisma db seed
   
   # Return to project root
   cd ../..
   ```

4. **Start Application Services**
   
   Open 3 separate terminals and run:
   
   **Terminal 1 - API Server:**
   ```bash
   cd apps/api
   JWT_SECRET=maskwise_jwt_secret_dev_only \
   DATABASE_URL=postgresql://maskwise:maskwise_dev_password@localhost:5436/maskwise \
   REDIS_URL=redis://localhost:6379 \
   npm run dev
   ```
   
   **Terminal 2 - Worker Service:**
   ```bash
   cd apps/worker
   npm run dev
   ```
   
   **Terminal 3 - Web Frontend:**
   ```bash
   cd apps/web
   npx next dev -p 3005
   ```

5. **Access the Application**
   - **Frontend**: http://localhost:3005
   - **API**: http://localhost:3001
   - **Default Admin**: admin@maskwise.com / admin123

### Verification
```bash
# Check Docker services are healthy
docker-compose ps

# Test API is responding
curl http://localhost:3001/health

# All services should show as running/healthy
```

### Troubleshooting
- **Port conflicts**: Change ports in the commands above if needed
- **Docker issues**: Run `docker-compose down` and restart
- **Database connection**: Ensure PostgreSQL container is healthy before starting API
- **Missing dependencies**: Run `npm install` in individual app directories if needed

## Production Deployment

### 🏭 Production Docker Deployment (Recommended)

**Deploy Maskwise to production using battle-tested Docker images:**

```bash
# 1. Setup production environment
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise
cp .env.production.example .env

# 2. Configure secure production values
# Edit .env with:
# - Strong POSTGRES_PASSWORD (use a password manager)
# - Secure JWT_SECRET (32+ random characters)  
# - External database URLs if using managed services
# - Custom ports if needed

# 3. Deploy instantly with pre-built images
docker-compose -f docker-compose.production.yml up -d

# 4. Initialize database (first-time only)
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
docker-compose -f docker-compose.production.yml exec api npx prisma db seed

# 5. Verify deployment
docker-compose -f docker-compose.production.yml ps
curl -f http://localhost:3001/health
```

**🛡️ Production Features:**
- ✅ **Zero build time** - pre-built images ready to deploy
- ✅ **Multi-platform** - works on amd64/arm64 (Apple Silicon, AWS Graviton)
- ✅ **Security hardened** - Alpine Linux with non-root users
- ✅ **Auto-healing** - health checks with automatic restart
- ✅ **Resource optimized** - memory limits and CPU controls
- ✅ **High availability** - separate API, Worker, and Web services

### Option 2: Build from Source
1. **Copy environment template**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Deploy**
   ```bash
   make prod
   ```

### Option 3: Kubernetes with Helm (Enterprise)
1. **Prerequisites**
   - Kubernetes cluster (1.19+)
   - Helm 3.0+
   - kubectl configured

2. **Configure values**
   ```bash
   # Edit production values
   cp k8s/values-production.yaml k8s/values-production-custom.yaml
   # Update image registry, domains, secrets, etc.
   ```

3. **Deploy**
   ```bash
   # One-command deployment
   make k8s-deploy
   
   # Or manual
   ./k8s/deploy.sh
   ```

4. **Access**
   ```bash
   # Port forward for local access
   make k8s-port
   
   # Or configure ingress for external access
   # Update ingress.hosts in values file
   ```

### Kubernetes Features
- **Auto-scaling**: HPA based on CPU/memory
- **High Availability**: Multi-replica deployments
- **Rolling Updates**: Zero-downtime deployments  
- **Monitoring**: Prometheus integration ready
- **Security**: Pod security contexts, network policies
- **Storage**: Persistent volumes for data

## Development

### Starting Development Environment
Follow the installation steps above to run in development mode.

### Building and Testing
```bash
# Build individual packages
cd apps/api && npm run build
cd apps/web && npm run build
cd apps/worker && npm run build

# Run linting
cd apps/api && npm run lint
cd apps/web && npm run lint

# Type checking
cd apps/api && npm run type-check
cd apps/web && npm run type-check

# Run tests
cd apps/api && npm test
```

### Database Operations
```bash
cd packages/database

# Reset database (careful!)
npx prisma migrate reset

# Apply new migrations
npx prisma migrate dev

# View data in browser
npx prisma studio
```

