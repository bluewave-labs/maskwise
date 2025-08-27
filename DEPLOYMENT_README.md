# Maskwise Deployment Guide

This document explains the different deployment options and how to configure Maskwise for your environment.

## Quick Setup Options

### 🐳 Option 1: Docker Compose (Recommended for Development)

**For development with all services in Docker containers:**

```bash
# Clone the repository
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise

# Start all services with Docker Compose
docker-compose up -d

# Run database migrations
docker-compose exec api npx prisma migrate deploy

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# Admin: admin@maskwise.com / admin123
```

### 🚀 Option 2: Production Deployment

**For production deployment on Linux servers:**

```bash
# Use the automated production deployment script
sudo ./deployment/deploy-production.sh
```

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed instructions.

### 🔧 Option 3: Local Development (Without Docker)

**For local development running services individually:**

1. **Start external services with Docker:**
   ```bash
   docker-compose up -d postgres redis presidio-analyzer presidio-anonymizer tika tesseract
   ```

2. **Update environment files to use localhost:**
   ```bash
   # Copy development environment
   cp .env.development .env
   
   # Update apps/api/.env to use localhost URLs:
   sed -i 's/postgres:5432/localhost:5436/g' apps/api/.env
   sed -i 's/redis:6379/localhost:6379/g' apps/api/.env
   sed -i 's/presidio-analyzer:3000/localhost:5003/g' apps/api/.env
   sed -i 's/presidio-anonymizer:3000/localhost:5004/g' apps/api/.env
   ```

3. **Start services individually:**
   ```bash
   # Terminal 1: API
   cd apps/api
   npm run dev

   # Terminal 2: Frontend
   cd apps/web
   npm run dev

   # Terminal 3: Worker
   cd apps/worker
   npm run dev
   ```

## Configuration Files Explained

### Environment File Priority

1. **`.env`** - Main environment file (copied from templates below)
2. **`.env.development`** - Development template (localhost URLs)
3. **`.env.production`** - Production template (container networking)
4. **`apps/api/.env`** - API-specific environment (auto-configured for Docker)

### Docker vs Localhost URLs

The key difference between Docker and local development is the service URLs:

| Service | Docker Compose | Local Development |
|---------|----------------|-------------------|
| Database | `postgres:5432` | `localhost:5436` |
| Redis | `redis:6379` | `localhost:6379` |
| Presidio Analyzer | `presidio-analyzer:3000` | `localhost:5003` |
| Presidio Anonymizer | `presidio-anonymizer:3000` | `localhost:5004` |
| Tika | `tika:9998` | `localhost:9998` |
| Tesseract | `tesseract:8884` | `localhost:8884` |

## Common Issues and Solutions

### Issue: Database Connection Error (P1001)

**Error:** `Can't reach database server at localhost:5436`

**Solution:** The container is using `localhost` instead of container names.

```bash
# For Docker Compose deployment, ensure you're using:
DATABASE_URL=postgresql://maskwise:maskwise_dev_password@postgres:5432/maskwise

# NOT:
DATABASE_URL=postgresql://maskwise:maskwise_dev_password@localhost:5436/maskwise
```

### Issue: Services Not Starting in Correct Order

**Solution:** Use health checks and depends_on in docker-compose.yml:

```yaml
api:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
```

### Issue: Port Conflicts

**Solution:** Check if ports are already in use:

```bash
# Check what's using the ports
sudo netstat -tulpn | grep -E "(3001|3000|5436|6379)"

# Stop conflicting services or change ports in docker-compose.yml
```

## Port Reference

| Service | Docker Port | Host Port | Purpose |
|---------|-------------|-----------|---------|
| Frontend | 3000 | 3000 | Next.js web app |
| API | 3001 | 3001 | NestJS backend |
| PostgreSQL | 5432 | 5436 | Database |
| Redis | 6379 | 6379 | Job queues |
| Presidio Analyzer | 3000 | 5003 | PII detection |
| Presidio Anonymizer | 3000 | 5004 | Data anonymization |
| Tika | 9998 | 9998 | Document processing |
| Tesseract | 3000 | 8884 | OCR service |

## Environment Variables Reference

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_DB=maskwise
POSTGRES_USER=maskwise
POSTGRES_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret_32_chars_minimum
JWT_REFRESH_SECRET=your_refresh_secret

# Admin Account
DEFAULT_ADMIN_EMAIL=admin@maskwise.com
DEFAULT_ADMIN_PASSWORD=secure_password

# Services (adjust for Docker vs local)
REDIS_URL=redis://host:port
PRESIDIO_ANALYZER_URL=http://host:port
PRESIDIO_ANONYMIZER_URL=http://host:port
TIKA_URL=http://host:port
TESSERACT_URL=http://host:port
```

## Getting Help

1. **Check Logs:**
   ```bash
   # Docker Compose logs
   docker-compose logs -f [service-name]
   
   # Individual service logs
   docker-compose logs api
   docker-compose logs postgres
   ```

2. **Health Check:**
   ```bash
   # Check all services
   docker-compose ps
   
   # Test API health
   curl http://localhost:3001/health
   ```

3. **Database Access:**
   ```bash
   # Access PostgreSQL directly
   docker-compose exec postgres psql -U maskwise -d maskwise
   ```

4. **Reset Everything:**
   ```bash
   # Complete reset (CAUTION: Deletes all data)
   docker-compose down -v
   docker-compose up -d
   ```

For more detailed troubleshooting, see the [Production Deployment Guide](./PRODUCTION_DEPLOYMENT.md).