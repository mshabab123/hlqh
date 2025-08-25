#!/bin/bash

# Production deployment script for VPS

set -e

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found. Please create it first.${NC}"
    exit 1
fi

# Build frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
cd frontend
npm ci
npm run build
cd ..

# Build and start with Docker Compose
echo -e "${YELLOW}🐳 Building Docker containers...${NC}"
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌐 Your app is now running on your VPS${NC}"
    echo -e "${YELLOW}📊 Check status: docker-compose -f docker-compose.prod.yml ps${NC}"
    echo -e "${YELLOW}📝 View logs: docker-compose -f docker-compose.prod.yml logs -f${NC}"
else
    echo -e "${RED}❌ Deployment failed. Check logs:${NC}"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi