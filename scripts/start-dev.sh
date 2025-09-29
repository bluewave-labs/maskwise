#!/bin/bash

# Maskwise Development Startup Script
set -e

echo "🚀 Starting Maskwise Development Environment"
echo "============================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🐳 Starting infrastructure services..."
docker-compose up -d postgres redis presidio-analyzer presidio-anonymizer tika tesseract

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "📊 Checking service health..."
docker-compose ps

echo "🗄️ Setting up database..."
cd packages/database
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
cd ../..

echo "✅ Setup complete! Now start the application services:"
echo ""
echo "🔧 Open 3 terminals and run these commands:"
echo ""
echo "Terminal 1 (API):"
echo "cd apps/api && JWT_SECRET=maskwise_jwt_secret_dev_only DATABASE_URL=postgresql://maskwise:maskwise_dev_password@localhost:5436/maskwise REDIS_URL=redis://localhost:6379 npm run dev"
echo ""
echo "Terminal 2 (Worker):"
echo "cd apps/worker && npm run dev"
echo ""
echo "Terminal 3 (Frontend):"
echo "cd apps/web && npx next dev -p 3005"
echo ""
echo "🌐 Then access the application at:"
echo "- Frontend: http://localhost:3005"
echo "- API: http://localhost:3001"
echo "- Admin: admin@maskwise.com / admin123"