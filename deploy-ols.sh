#!/bin/bash

# OpenLiteSpeed deployment script

set -e

echo "🚀 Starting OpenLiteSpeed deployment..."

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

# Start backend with Docker
echo -e "${YELLOW}🐳 Starting backend services...${NC}"
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}📂 Frontend built successfully!${NC}"
echo -e "${GREEN}✅ Backend deployment completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo -e "1. Copy ${GREEN}frontend/dist${NC} contents to your OpenLiteSpeed document root"
echo -e "2. Copy ${GREEN}.htaccess${NC} to your document root"
echo -e "3. Configure virtual host using ${GREEN}vhost.conf${NC} as reference"
echo -e "4. Set up API proxy: /api/ → http://127.0.0.1:5000/api/"
echo ""
echo -e "${YELLOW}📊 Check backend status: ${NC}docker-compose -f docker-compose.prod.yml ps"
echo -e "${YELLOW}📝 View backend logs: ${NC}docker-compose -f docker-compose.prod.yml logs -f"