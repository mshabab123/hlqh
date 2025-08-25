# VPS Deployment Guide with OpenLiteSpeed

## Prerequisites

1. VPS server with OpenLiteSpeed installed
2. Domain name pointing to your VPS IP
3. SSH access to your VPS
4. OpenLiteSpeed Admin Console access

## Deployment Options

### Option 1: Docker Backend + OpenLiteSpeed Frontend (Recommended)

1. **Install Docker on your VPS:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo apt install docker-compose
   ```

2. **Clone your repository:**
   ```bash
   git clone <your-repo-url>
   cd hlqh
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your production values
   ```

4. **Build frontend and start backend:**
   ```bash
   cd frontend
   npm ci && npm run build
   cd ..
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Configure OpenLiteSpeed Virtual Host:**
   - Access OpenLiteSpeed Admin Console (https://your-ip:7080)
   - Create new Virtual Host using the configuration in `vhost.conf`
   - Set Document Root to `/path/to/hlqh/frontend/dist`
   - Copy `.htaccess` to your document root

### Option 2: Simple PM2 Deployment

1. **Install Node.js and PM2 on your VPS:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and deploy:**
   ```bash
   git clone <your-repo-url>
   cd hlqh
   cp .env.example .env
   nano .env  # Edit with your production values
   ./deploy-simple.sh
   ```

3. **Configure OpenLiteSpeed:**
   - Build frontend: `cd frontend && npm run build`
   - Copy `frontend/dist` contents to your OpenLiteSpeed document root
   - Copy `.htaccess` to document root
   - Configure virtual host to proxy `/api/` to `http://127.0.0.1:5000/api/`

## SSL Certificate Setup

For production, you'll need SSL certificates. Use Let's Encrypt:

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

Configure SSL in OpenLiteSpeed Admin Console:
- Go to Listeners → SSL
- Set certificate path and key path
- Enable Force SSL Redirect

## Database Setup

If using external PostgreSQL, create the database and run migrations:

```bash
cd backend
npm run migrate
```

## Monitoring

- **Docker logs:** `docker-compose -f docker-compose.prod.yml logs -f`
- **PM2 logs:** `pm2 logs hlqh-backend`
- **Status:** `pm2 status`

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secure random string for JWT tokens
- `NODE_ENV`: Set to 'production'
- `ALLOWED_ORIGINS`: Your domain URLs for CORS

## Security Notes

1. Use strong passwords for database
2. Generate secure JWT secret (32+ characters)
3. Keep your VPS updated
4. Use firewall (ufw) to limit access
5. Enable SSL/HTTPS in production