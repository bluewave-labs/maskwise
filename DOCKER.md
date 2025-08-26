# Maskwise Docker Deployment Guide

## Docker Images Available

Pre-built Docker images are available on GitHub Container Registry:

- **API**: `ghcr.io/bluewave-labs/maskwise-api:v1.1.1`
- **Worker**: `ghcr.io/bluewave-labs/maskwise-worker:v1.1.1`  
- **Web**: `ghcr.io/bluewave-labs/maskwise-web:v1.1.1`

## Quick Production Deployment

### 1. Clone Repository
```bash
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise
```

### 2. Configure Environment
```bash
cp .env.production.example .env
# Edit .env with your production values
nano .env
```

**Required Environment Variables:**
- `POSTGRES_PASSWORD` - Secure database password
- `JWT_SECRET` - Secure JWT secret (minimum 32 characters)
- `JWT_REFRESH_SECRET` - Secure refresh token secret
- `NEXT_PUBLIC_API_URL` - Frontend API URL (for external access)

### 3. Deploy with Docker Compose
```bash
# Using pre-built images (recommended)
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### 4. Initialize Database
```bash
# Run database migrations and seed
docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy
docker-compose -f docker-compose.production.yml exec api npx prisma db seed
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Admin Login**: admin@maskwise.com / admin123

## Development Deployment

For development with live code changes:

```bash
# Use development docker-compose (builds from source)
docker-compose up -d postgres redis presidio-analyzer presidio-anonymizer tika tesseract

# Then run app services locally (see README.md)
```

## Service Architecture

### Infrastructure Services
- **PostgreSQL** (port 5432) - Main database
- **Redis** (port 6379) - Job queues and caching
- **Presidio Analyzer** (port 5003) - PII detection
- **Presidio Anonymizer** (port 5004) - Data anonymization
- **Apache Tika** (port 9998) - Document text extraction
- **Tesseract** (port 8884) - OCR for images

### Application Services
- **API** (port 3001) - NestJS backend
- **Worker** (no external port) - Background job processing
- **Web** (port 3000) - Next.js frontend

## Image Details

### Multi-Stage Builds
All images use optimized multi-stage builds:
- **Builder stage**: Installs dependencies and builds application
- **Production stage**: Minimal runtime with only necessary files

### Security Features
- ✅ Non-root user execution
- ✅ Alpine Linux base (small attack surface)
- ✅ dumb-init for proper signal handling
- ✅ Health checks for all services
- ✅ Resource limits and reservations

### Image Sizes (Approximate)
- **maskwise-api**: ~200MB
- **maskwise-worker**: ~180MB
- **maskwise-web**: ~150MB

## Building Custom Images

If you need to build images locally:

```bash
# Build all services
./build-docker-images.sh

# Or build individually
docker build -f apps/api/Dockerfile -t maskwise-api:custom .
docker build -f apps/worker/Dockerfile -t maskwise-worker:custom .
docker build -f apps/web/Dockerfile -t maskwise-web:custom .
```

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose -f docker-compose.production.yml ps

# View health check logs
docker inspect --format='{{json .State.Health}}' maskwise-api | jq
```

## Scaling

Scale worker services for high throughput:

```bash
# Scale workers to 3 instances
docker-compose -f docker-compose.production.yml up -d --scale worker=3
```

## Monitoring & Logs

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100
```

### Resource Usage
```bash
# View resource usage
docker stats

# View container resource limits
docker-compose -f docker-compose.production.yml config
```

## Troubleshooting

### Common Issues

**1. Services not starting:**
```bash
# Check service dependencies
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs
```

**2. Database connection issues:**
```bash
# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres

# Test database connection
docker-compose -f docker-compose.production.yml exec postgres psql -U maskwise -d maskwise
```

**3. Image pull issues:**
```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Pull images manually
docker pull ghcr.io/bluewave-labs/maskwise-api:v1.1.1
```

### Recovery Commands
```bash
# Restart all services
docker-compose -f docker-compose.production.yml restart

# Reset database (WARNING: deletes all data)
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d

# Update to latest images
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## Security Considerations

### Production Checklist
- [ ] Change default admin password
- [ ] Use strong, unique secrets for JWT tokens
- [ ] Configure HTTPS with reverse proxy
- [ ] Restrict database access
- [ ] Enable container resource limits
- [ ] Regular security updates
- [ ] Backup database regularly

### Network Security
```bash
# Use with reverse proxy (nginx profile)
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

## Backup & Recovery

### Database Backup
```bash
# Create backup
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U maskwise maskwise > backup.sql

# Restore from backup
docker-compose -f docker-compose.production.yml exec -T postgres psql -U maskwise maskwise < backup.sql
```

### Volume Backup
```bash
# Backup uploaded files
docker cp maskwise-api:/app/uploads ./uploads-backup

# Backup storage
docker cp maskwise-api:/app/storage ./storage-backup
```