# Multi-stage build for production
FROM node:18-alpine AS frontend-build

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Backend stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY backend/ ./backend/
COPY ecosystem.config.js ./

# Copy built frontend files
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001
USER nodeuser

EXPOSE 5000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]