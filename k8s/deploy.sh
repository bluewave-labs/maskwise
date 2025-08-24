#!/bin/bash

# Maskwise Kubernetes Deployment Script
set -e

NAMESPACE=${NAMESPACE:-maskwise}
RELEASE_NAME=${RELEASE_NAME:-maskwise}
ENVIRONMENT=${ENVIRONMENT:-production}

echo "🚀 Maskwise Kubernetes Deployment"
echo "=================================="
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo "Environment: $ENVIRONMENT"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if kubectl is available
if ! command -v kubectl > /dev/null 2>&1; then
    echo "❌ kubectl is not installed or not in PATH"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if helm is available
if ! command -v helm > /dev/null 2>&1; then
    echo "❌ Helm is not installed or not in PATH"
    echo "Please install Helm: https://helm.sh/docs/intro/install/"
    exit 1
fi

# Check kubectl connection
if ! kubectl cluster-info > /dev/null 2>&1; then
    echo "❌ Cannot connect to Kubernetes cluster"
    echo "Please configure kubectl to connect to your cluster"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Create namespace if it doesn't exist
echo "📁 Creating namespace if needed..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Add required Helm repositories
echo "📦 Adding Helm repositories..."
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Build and push Docker images (if needed)
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🐳 Building Docker images..."
    
    # Build API
    docker build -f apps/api/Dockerfile -t maskwise/api:latest .
    
    # Build Worker  
    docker build -f apps/worker/Dockerfile -t maskwise/worker:latest .
    
    # Build Web
    docker build -f apps/web/Dockerfile -t maskwise/web:latest .
    
    echo "✅ Docker images built successfully"
    echo ""
    echo "📤 Push images to your registry:"
    echo "   docker tag maskwise/api:latest your-registry/maskwise/api:latest"
    echo "   docker push your-registry/maskwise/api:latest"
    echo "   docker tag maskwise/worker:latest your-registry/maskwise/worker:latest"
    echo "   docker push your-registry/maskwise/worker:latest"
    echo "   docker tag maskwise/web:latest your-registry/maskwise/web:latest"
    echo "   docker push your-registry/maskwise/web:latest"
    echo ""
fi

# Deploy with Helm
echo "🎯 Deploying Maskwise..."

VALUES_FILE="k8s/values-${ENVIRONMENT}.yaml"
if [[ ! -f "$VALUES_FILE" ]]; then
    VALUES_FILE="k8s/helm/maskwise/values.yaml"
fi

helm upgrade --install $RELEASE_NAME k8s/helm/maskwise \
    --namespace $NAMESPACE \
    --values $VALUES_FILE \
    --timeout 10m \
    --wait

echo "✅ Deployment completed successfully!"

# Get deployment status
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

echo ""
echo "🌐 Service Information:"
kubectl get services -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

echo ""
echo "📋 Ingress Information:"
kubectl get ingress -n $NAMESPACE -l app.kubernetes.io/instance=$RELEASE_NAME

echo ""
echo "🎉 Maskwise is deployed!"
echo ""
echo "👤 Default admin credentials:"
echo "   Email: admin@maskwise.com"
echo "   Password: admin123"
echo ""
echo "📖 Useful commands:"
echo "   View pods: kubectl get pods -n $NAMESPACE"
echo "   View logs: kubectl logs -n $NAMESPACE -l app.kubernetes.io/component=api"
echo "   Port forward: kubectl port-forward -n $NAMESPACE service/${RELEASE_NAME}-web 3000:3000"
echo "   Delete: helm uninstall $RELEASE_NAME -n $NAMESPACE"