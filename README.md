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
- Frontend: http://localhost:4200
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

