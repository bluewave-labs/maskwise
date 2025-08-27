# Maskwise Production Deployment Guide

This guide provides comprehensive instructions for deploying Maskwise on a production Linux server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Deployment](#manual-deployment)
- [Configuration](#configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [System Administration](#system-administration)
- [Troubleshooting](#troubleshooting)
- [Backup and Recovery](#backup-and-recovery)
- [Security Considerations](#security-considerations)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 22.04 LTS (recommended) or CentOS 8+
- **RAM**: Minimum 8GB, Recommended 16GB+
- **CPU**: Minimum 4 cores, Recommended 8+ cores
- **Disk Space**: Minimum 50GB free space
- **Network**: Stable internet connection for Docker image downloads

### Required Software

- **Docker**: Version 24.0+ ([Installation Guide](https://docs.docker.com/engine/install/))
- **Docker Compose**: Version 2.0+ ([Installation Guide](https://docs.docker.com/compose/install/))
- **Git**: For repository cloning
- **curl**: For health checks

### Installation Commands

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y docker.io docker-compose git curl

# Enable and start Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group (logout/login required)
sudo usermod -aG docker $USER
```

## Quick Start

### Automated Deployment

Use the automated deployment script for the easiest setup:

```bash
# Clone the repository
git clone https://github.com/bluewave-labs/maskwise.git
cd maskwise

# Run the deployment script as root
sudo ./deployment/deploy-production.sh
```

The script will:
1. Check system dependencies
2. Create necessary users and directories
3. Set up the environment configuration
4. Install systemd service
5. Build and start all services
6. Configure basic firewall rules

### Post-Deployment Steps

1. **Change Default Passwords**: Update admin credentials immediately
2. **Configure SSL**: Set up HTTPS certificates (optional)
3. **Set up Monitoring**: Configure log monitoring and alerts
4. **Create Backups**: Set up automated backup procedures

## Manual Deployment

### Step 1: System Preparation

```bash
# Create system user
sudo groupadd -r maskwise
sudo useradd -r -g maskwise -d /opt/maskwise -s /bin/bash maskwise
sudo usermod -aG docker maskwise

# Create directories
sudo mkdir -p /opt/maskwise/{uploads,storage,nginx/ssl}
sudo chown -R maskwise:maskwise /opt/maskwise
```

### Step 2: Repository Setup

```bash
# Clone repository
sudo -u maskwise git clone https://github.com/bluewave-labs/maskwise.git /opt/maskwise
cd /opt/maskwise

# Checkout latest stable version
sudo -u maskwise git checkout main
```

### Step 3: Environment Configuration

```bash
# Copy production environment template
sudo -u maskwise cp .env.production .env

# Edit configuration (see Configuration section below)
sudo -u maskwise nano .env
```

### Step 4: Service Installation

```bash
# Install systemd service
sudo cp deployment/systemd/maskwise.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable maskwise
```

### Step 5: Build and Start

```bash
# Build application images
sudo -u maskwise docker-compose -f docker-compose.production.yml build --no-cache

# Start services
sudo -u maskwise docker-compose -f docker-compose.production.yml up -d

# Run database migrations
sudo -u maskwise docker-compose -f docker-compose.production.yml exec -T api npx prisma migrate deploy
```

## Configuration

### Environment Variables

Edit `/opt/maskwise/.env` with your production values:

```env
# Database Configuration
POSTGRES_DB=maskwise
POSTGRES_USER=maskwise
POSTGRES_PASSWORD=CHANGE_THIS_TO_SECURE_PASSWORD

# Security (Generate with: openssl rand -hex 32)
JWT_SECRET=CHANGE_THIS_TO_SECURE_JWT_SECRET_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_THIS_TO_SECURE_REFRESH_SECRET_MIN_32_CHARS

# Admin Account
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD

# Application URLs
NEXT_PUBLIC_API_URL=http://your-server-ip/api
CORS_ORIGINS=http://your-server-ip,http://your-domain.com
```

### Security Best Practices

1. **Strong Passwords**: Use complex passwords with special characters
2. **JWT Secrets**: Generate cryptographically secure random strings
3. **File Permissions**: Restrict .env file access (`chmod 600 .env`)
4. **Regular Updates**: Keep system and Docker images updated

## SSL/TLS Setup

### Option 1: Let's Encrypt (Automated)

Create a script to set up SSL certificates:

```bash
#!/bin/bash
# /opt/maskwise/setup-ssl.sh

DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"

# Install certbot
sudo apt install -y certbot

# Get certificates
sudo certbot certonly --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d $DOMAIN

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/maskwise/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/maskwise/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/chain.pem /opt/maskwise/nginx/ssl/
sudo chown -R maskwise:maskwise /opt/maskwise/nginx/ssl/

# Enable SSL in nginx config
# Edit nginx/conf.d/maskwise.conf and uncomment HTTPS server block

# Restart services
sudo systemctl restart maskwise
```

### Option 2: Custom Certificates

```bash
# Copy your certificates to:
/opt/maskwise/nginx/ssl/fullchain.pem    # Certificate + intermediate chain
/opt/maskwise/nginx/ssl/privkey.pem     # Private key
/opt/maskwise/nginx/ssl/chain.pem       # Intermediate chain

# Set proper permissions
sudo chown -R maskwise:maskwise /opt/maskwise/nginx/ssl/
sudo chmod 644 /opt/maskwise/nginx/ssl/*.pem
sudo chmod 600 /opt/maskwise/nginx/ssl/privkey.pem
```

### Enable HTTPS

Edit `/opt/maskwise/nginx/conf.d/maskwise.conf` and uncomment the HTTPS server block.

## System Administration

### Service Management

```bash
# Start Maskwise
sudo systemctl start maskwise

# Stop Maskwise
sudo systemctl stop maskwise

# Restart Maskwise
sudo systemctl restart maskwise

# Check status
sudo systemctl status maskwise

# View logs
sudo journalctl -u maskwise -f
```

### Container Management

```bash
# Change to Maskwise directory
cd /opt/maskwise

# View container status
sudo -u maskwise docker-compose -f docker-compose.production.yml ps

# View logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs -f

# Restart specific service
sudo -u maskwise docker-compose -f docker-compose.production.yml restart api

# Update images
sudo -u maskwise docker-compose -f docker-compose.production.yml pull
sudo -u maskwise docker-compose -f docker-compose.production.yml up -d
```

### Database Management

```bash
# Access PostgreSQL
sudo -u maskwise docker-compose -f docker-compose.production.yml exec postgres psql -U maskwise -d maskwise

# Run migrations
sudo -u maskwise docker-compose -f docker-compose.production.yml exec api npx prisma migrate deploy

# Create database backup
sudo -u maskwise docker-compose -f docker-compose.production.yml exec postgres pg_dump -U maskwise maskwise > backup.sql
```

### Health Monitoring

```bash
# Check application health
curl http://localhost/api/health

# Check container health
sudo -u maskwise docker-compose -f docker-compose.production.yml ps

# Monitor resource usage
docker stats
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

```bash
# Check if PostgreSQL is running
sudo -u maskwise docker-compose -f docker-compose.production.yml ps postgres

# Check database logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs postgres

# Test connection from API container
sudo -u maskwise docker-compose -f docker-compose.production.yml exec api sh -c "apt-get update && apt-get install -y postgresql-client && pg_isready -h postgres -U maskwise"
```

#### 2. API Container Fails to Start

```bash
# Check API logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs api

# Common fixes:
# - Verify environment variables in .env
# - Ensure database is ready before API starts
# - Check JWT secrets are properly set
```

#### 3. Nginx Configuration Errors

```bash
# Test nginx configuration
sudo -u maskwise docker-compose -f docker-compose.production.yml exec nginx nginx -t

# Reload nginx configuration
sudo -u maskwise docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
```

#### 4. File Upload Issues

```bash
# Check directory permissions
ls -la /opt/maskwise/uploads /opt/maskwise/storage

# Fix permissions if needed
sudo chown -R maskwise:maskwise /opt/maskwise/uploads /opt/maskwise/storage
```

### Log Analysis

```bash
# System logs
sudo journalctl -u maskwise -f

# Application logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs -f

# Nginx access logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs nginx | grep -E "(GET|POST|PUT|DELETE)"

# Filter error logs
sudo -u maskwise docker-compose -f docker-compose.production.yml logs api | grep -i error
```

## Backup and Recovery

### Database Backup

Create automated backup script:

```bash
#!/bin/bash
# /opt/maskwise/backup-database.sh

BACKUP_DIR="/opt/maskwise/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="maskwise_backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
cd /opt/maskwise
sudo -u maskwise docker-compose -f docker-compose.production.yml exec -T postgres \
  pg_dump -U maskwise maskwise > $BACKUP_DIR/$BACKUP_FILE

# Compress backup
gzip $BACKUP_DIR/$BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.gz" -type f -mtime +30 -delete

echo "Backup created: $BACKUP_DIR/$BACKUP_FILE.gz"
```

### File System Backup

```bash
#!/bin/bash
# /opt/maskwise/backup-files.sh

BACKUP_DIR="/backups/maskwise"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup uploads and storage
tar -czf $BACKUP_DIR/maskwise_files_$DATE.tar.gz \
  -C /opt/maskwise uploads storage

# Backup configuration
tar -czf $BACKUP_DIR/maskwise_config_$DATE.tar.gz \
  -C /opt/maskwise .env nginx/

echo "File backup created: $BACKUP_DIR/maskwise_files_$DATE.tar.gz"
```

### Recovery Process

```bash
# Stop services
sudo systemctl stop maskwise

# Restore database
cd /opt/maskwise
gunzip < /path/to/backup.sql.gz | sudo -u maskwise docker-compose -f docker-compose.production.yml exec -T postgres psql -U maskwise -d maskwise

# Restore files
sudo tar -xzf /path/to/maskwise_files_backup.tar.gz -C /opt/maskwise

# Fix permissions
sudo chown -R maskwise:maskwise /opt/maskwise

# Start services
sudo systemctl start maskwise
```

## Security Considerations

### Server Hardening

1. **Keep System Updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Configure Firewall**:
   ```bash
   sudo ufw allow 22/tcp    # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

3. **Disable Unused Services**:
   ```bash
   sudo systemctl disable --now apache2   # If not needed
   sudo systemctl disable --now nginx     # If using containerized nginx
   ```

4. **Set up Fail2Ban**:
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

### Application Security

1. **Change Default Credentials**: Immediately after deployment
2. **Regular Security Updates**: Keep Docker images updated
3. **Monitor Access Logs**: Review nginx and application logs regularly
4. **Restrict Network Access**: Use firewall rules to limit access
5. **Use HTTPS**: Always enable SSL/TLS in production

### Monitoring and Alerting

Set up monitoring for:
- System resources (CPU, memory, disk)
- Container health status
- Application response times
- Error rates in logs
- Database performance

## Performance Optimization

### Docker Configuration

```bash
# Add to /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

### System Limits

```bash
# Add to /etc/security/limits.conf
maskwise soft nofile 65536
maskwise hard nofile 65536

# Add to /etc/sysctl.conf
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
```

## Support and Documentation

- **GitHub Repository**: https://github.com/bluewave-labs/maskwise
- **Issues and Bug Reports**: https://github.com/bluewave-labs/maskwise/issues
- **API Documentation**: http://your-server/api/docs (when running)

For additional support, please create an issue on the GitHub repository with:
- System information (OS, Docker version, etc.)
- Error logs and symptoms
- Steps to reproduce the issue
- Configuration details (without sensitive information)