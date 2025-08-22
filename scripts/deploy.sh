#!/bin/bash

# Maskwise Easy Deployment Script
set -e

echo "🚀 Maskwise Easy Deployment"
echo "=========================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install it and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads storage data/init

# Start services
echo "🐳 Starting Maskwise services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
echo "This may take a few minutes on first run..."

# Check service health
services=("postgres" "redis" "presidio-analyzer" "presidio-anonymizer" "tika")
for service in "${services[@]}"; do
    echo "Checking $service..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose ps $service | grep -q "healthy"; then
            echo "✅ $service is ready"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        echo "❌ $service failed to start properly"
        echo "🔍 Checking logs:"
        docker-compose logs $service
        exit 1
    fi
done

echo "🎉 Maskwise is ready!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   API: http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/docs"
echo ""
echo "👤 Default admin credentials:"
echo "   Email: admin@maskwise.com"
echo "   Password: admin123"
echo ""
echo "🛠️ Useful commands:"
echo "   View logs: npm run docker:logs"
echo "   Stop services: npm run docker:down"
echo "   Restart: ./scripts/deploy.sh"