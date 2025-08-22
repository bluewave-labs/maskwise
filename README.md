# Maskwise

On-premise PII detection and anonymization platform built on Microsoft Presidio.

## Overview

Maskwise is a single-tenant platform designed to detect, redact, mask, and anonymize sensitive data across text, images, and structured data in training datasets for LLM systems.

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

## Quick Start

### Option 1: Super Easy (Recommended)
```bash
# One-command setup and start
make setup
```

### Option 2: Manual Steps
```bash
# 1. Install dependencies
npm install

# 2. Start all services
./scripts/deploy.sh
# OR
npm run docker:up
```

### Option 3: Development Mode
```bash
# Start development servers (requires Docker services running)
make dev
```

**Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:3001  
- API Docs: http://localhost:3001/api/docs
- Default admin: admin@maskwise.com / admin123

## Production Deployment

### Option 1: Docker Compose (Simple)
1. **Copy environment template**
   ```bash
   cp .env.example .env
   # Edit .env with your production values
   ```

2. **Deploy**
   ```bash
   make prod
   ```

### Option 2: Kubernetes with Helm (Enterprise)
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

```bash
# Start development servers
npm run dev

# Build all packages
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Features

- 🔐 Role-based authentication (extensible for SSO)
- 📁 Multiple data source support (file upload, S3, Azure Blob, BigQuery)
- 🔍 PII detection using Microsoft Presidio
- 🎭 Data anonymization and masking
- 📊 Results dashboard with detailed reporting
- 📋 Policy engine with YAML versioning
- 🏪 Policy template marketplace
- 🔍 Evidence manifest generation
- 📈 Audit logging and compliance tracking

## Supported File Types

- **Structured**: CSV, JSONL, Parquet, TXT
- **Semi-structured**: PDF, DOCX (with OCR support)

## License

Private - All rights reserved