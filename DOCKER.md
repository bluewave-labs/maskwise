# Docker Deployment Guide

MaskWise provides multiple Docker deployment options to suit different use cases.

## Quick Start

### Production Deployment (Recommended)
Uses pre-built images from GitHub Container Registry:

```bash
# Clone the repository
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise

# Start with production images
docker-compose -f docker-compose.production.yml up -d
```

### Development/Local Build
Builds images locally from source:

```bash
# Start with local builds
docker-compose up -d
```

## Docker Compose Files

| File | Purpose | Build Method | Use Case |
|------|---------|--------------|----------|
| `docker-compose.yml` | Development | Local build | Development, customization |
| `docker-compose.local-build.yml` | Local build | Local build | Testing local changes |
| `docker-compose.production.yml` | Production | Pre-built images | Production deployment |

## Image Tags

### Available Tags
- `latest` - Latest stable release (recommended)
- `main` - Latest from main branch
- `dev` - Latest from dev branch
- `v1.2.0` - Specific version releases

### Images Published
- `ghcr.io/bluewave-labs/maskwise-api:latest`
- `ghcr.io/bluewave-labs/maskwise-worker:latest`
- `ghcr.io/bluewave-labs/maskwise-web:latest`

## Multi-Platform Support

All images support both Intel and ARM architectures:
- `linux/amd64` (Intel/AMD processors)
- `linux/arm64` (Apple Silicon, ARM servers)

## Troubleshooting

### Images Not Found
If you get image pull errors:

1. **Use development compose** (builds locally):
   ```bash
   docker-compose up -d
   ```

2. **Check available tags**:
   ```bash
   docker pull ghcr.io/bluewave-labs/maskwise-api:latest
   ```

3. **Build locally** by uncommenting build sections in production compose

### Switching Between Methods

**From pre-built to local build:**
```bash
# Edit docker-compose.production.yml
# Comment image lines, uncomment build sections
docker-compose -f docker-compose.production.yml up -d --build
```

## Environment Configuration

Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your settings
```

Required variables for production:
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `DEFAULT_ADMIN_PASSWORD`

## Health Checks

All services include health checks. Monitor with:
```bash
docker-compose -f docker-compose.production.yml ps
```

## Updating Images

Pull latest images:
```bash
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

## Support

If you encounter issues:
1. Check the [GitHub Issues](https://github.com/bluewave-labs/maskwise/issues)
2. Verify your Docker and Docker Compose versions
3. Try local build method as fallback