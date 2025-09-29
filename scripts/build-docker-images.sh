#!/bin/bash

# Build Docker Images for Maskwise v1.1.1
set -e

VERSION="v1.1.1"
REGISTRY="ghcr.io/bluewave-labs"
SERVICES=("api" "worker" "web")

echo "🐳 Building Maskwise Docker Images for $VERSION"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Login to GitHub Container Registry
echo "🔐 Logging in to GitHub Container Registry..."
echo "$GITHUB_TOKEN" | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin || {
    echo "❌ Failed to login to GHCR. Please set GITHUB_TOKEN and GITHUB_USERNAME environment variables."
    echo "   GITHUB_TOKEN should have packages:write permissions"
    exit 1
}

# Build each service
for service in "${SERVICES[@]}"; do
    echo ""
    echo "🔨 Building maskwise-$service:$VERSION..."
    
    # Build the image
    docker build \
        -f ./apps/$service/Dockerfile \
        -t $REGISTRY/maskwise-$service:$VERSION \
        -t $REGISTRY/maskwise-$service:latest \
        .
    
    echo "✅ Built maskwise-$service:$VERSION"
done

# Push all images
echo ""
echo "📤 Pushing images to GitHub Container Registry..."

for service in "${SERVICES[@]}"; do
    echo "Pushing maskwise-$service..."
    docker push $REGISTRY/maskwise-$service:$VERSION
    docker push $REGISTRY/maskwise-$service:latest
    echo "✅ Pushed maskwise-$service"
done

echo ""
echo "🎉 All images built and pushed successfully!"
echo ""
echo "📋 Published Images:"
for service in "${SERVICES[@]}"; do
    echo "  - $REGISTRY/maskwise-$service:$VERSION"
    echo "  - $REGISTRY/maskwise-$service:latest"
done
echo ""
echo "🚀 Use these images in your docker-compose.yml:"
echo "  api:"
echo "    image: $REGISTRY/maskwise-api:$VERSION"
echo "  worker:"
echo "    image: $REGISTRY/maskwise-worker:$VERSION"  
echo "  web:"
echo "    image: $REGISTRY/maskwise-web:$VERSION"