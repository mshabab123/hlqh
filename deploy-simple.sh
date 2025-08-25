#!/bin/bash

# Simple deployment script without Docker

set -e

echo "🚀 Starting simple deployment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci --only=production
cd ..

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Stop existing process
pm2 stop hlqh-backend 2>/dev/null || true
pm2 delete hlqh-backend 2>/dev/null || true

# Start the application
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
pm2 startup

echo "✅ Deployment completed!"
echo "📊 Status: pm2 status"
echo "📝 Logs: pm2 logs hlqh-backend"