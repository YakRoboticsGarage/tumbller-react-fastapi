# YakRover Application Deployment Guide

This guide covers deploying the YakRover frontend and backend as separate services. Both can run on the same server or on different servers.

## 0. Local Testing

Before deploying to production, test the Docker setup locally:

```bash
# 1. Create the shared network
docker network create yakrover_network

# 2. Build and run backend
cd backend-fastapi
cp .env.example .env   # Edit with your settings
./build_backend.sh
./start_backend.sh

# Test backend is running
curl http://localhost:8000/health

# 3. Build and run frontend (in another terminal)
cd frontend-react
DOMAIN=localhost ./build_frontend.sh
DOMAIN=localhost BACKEND_URL=http://yakrover_backend:8000 ./start_frontend.sh

# 4. Test frontend (Caddy will use HTTP for localhost)
curl http://localhost

# 5. Clean up when done
cd frontend-react && ./stop_frontend.sh --clean
cd ../backend-fastapi && ./stop_backend.sh --clean
docker network rm yakrover_network
```

**Stop script options:**
- `./stop_backend.sh` / `./stop_frontend.sh` - Stop containers only (keeps images, volumes)
- `./stop_backend.sh --clean` / `./stop_frontend.sh --clean` - Remove containers, images, and volumes

## I. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend       │────▶│  Backend        │────▶│  ESP32 Robots   │
│  (Caddy + React)│     │  (FastAPI)      │     │                 │
│  Port 80/443    │     │  Port 8000      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Key Components:**
- **Frontend**: React SPA served by Caddy with automatic HTTPS
- **Backend**: FastAPI with SQLite database
- **Shared Network**: Docker network `yakrover_network` for container communication

## II. Prerequisites

1. Server with **Docker** and **Docker Compose** installed
2. **DNS A records** pointing to your server IP:
   - `yakrover.com` → Server IP (or `.net` / `.org`)
   - `api.yakrover.com` → Server IP (if exposing API publicly)
3. **Firewall** allows TCP ports 80, 443, and 8000

## III. Backend Deployment

### Configuration

Create `backend-fastapi/.env`:

```bash
# Database (SQLite persisted to ./data/)
DATABASE_URL=sqlite+aiosqlite:///./data/robots.db

# x402 Payments
PAYMENT_ENABLED=true
PAYMENT_ADDRESS=0xYourWalletAddress
X402_NETWORK=base-sepolia    # or "base" for mainnet
SESSION_DURATION_MINUTES=10
SESSION_PRICE=$0.10

# Privy (for robot wallet management)
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret

# CORS (add frontend domains)
CORS_ORIGINS=["https://yakrover.com", "https://yakrover.net"]
```

### Deploy

```bash
cd backend-fastapi

# Build the image
./build_backend.sh

# Start the backend
./start_backend.sh

# View logs
docker compose logs -f

# Stop (keeps images)
./stop_backend.sh

# Stop and clean up everything
./stop_backend.sh --clean
```

The API will be available at `http://localhost:8000`.

## IV. Frontend Deployment

### Configuration

The frontend uses environment variables at both **build time** (Vite) and **runtime** (Caddy).

**Build-time variables** (set before `./build.sh`):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_ENABLE_AUTH` | `true` | Enable authentication |
| `VITE_AUTH_METHOD` | `privy` | Auth method (privy/logto) |
| `VITE_PRIVY_APP_ID` | - | Privy App ID |
| `VITE_X402_NETWORK` | `base-sepolia` | Payment network |

**Runtime variables** (set before `./start.sh`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN` | `yakrover.com` | Your domain |
| `BACKEND_URL` | `http://yakrover_backend:8000` | Backend URL for API proxy |
| `ADMIN_EMAIL` | `admin@yakrover.com` | Email for TLS certificates |

### Deploy (Same Server as Backend)

When frontend and backend are on the same server, they communicate via Docker network:

```bash
cd frontend-react

# Set build-time variables
export VITE_PRIVY_APP_ID=your-privy-app-id
export VITE_X402_NETWORK=base-sepolia

# Build the image
./build_frontend.sh

# Start with default settings (yakrover.com, backend via Docker network)
./start_frontend.sh

# Or specify a different domain
DOMAIN=yakrover.net ./start_frontend.sh
```

### Deploy (Separate Server from Backend)

When frontend is on a different server, configure the external backend URL:

```bash
cd frontend-react

# Build-time: point to external API
export VITE_API_URL=https://api.yakrover.com
export VITE_PRIVY_APP_ID=your-privy-app-id
./build_frontend.sh

# Runtime: proxy to external API
export DOMAIN=yakrover.com
export BACKEND_URL=https://api.yakrover.com
./start_frontend.sh
```

## V. Domain Configuration Examples

### Production (yakrover.com)

```bash
# Backend
cd backend-fastapi && ./start_backend.sh

# Frontend
cd frontend-react
export DOMAIN=yakrover.com
export VITE_PRIVY_APP_ID=prod-app-id
./build_frontend.sh && ./start_frontend.sh
```

### Staging (yakrover.net)

```bash
# Backend
cd backend-fastapi && ./start_backend.sh

# Frontend
cd frontend-react
export DOMAIN=yakrover.net
export VITE_PRIVY_APP_ID=staging-app-id
export VITE_X402_NETWORK=base-sepolia
./build_frontend.sh && ./start_frontend.sh
```

### Development (yakrover.org)

```bash
# Backend
cd backend-fastapi && ./start_backend.sh

# Frontend
cd frontend-react
export DOMAIN=yakrover.org
export VITE_PRIVY_APP_ID=dev-app-id
export VITE_X402_NETWORK=base-sepolia
./build_frontend.sh && ./start_frontend.sh
```

## VI. Exposing Backend API Publicly (Optional)

To make the API accessible at `https://api.yakrover.com`:

1. **Add DNS Record**: Create an A record for `api.yakrover.com` pointing to your server

2. **Create API Caddyfile** (`backend-fastapi/Caddyfile.api`):
   ```caddy
   api.yakrover.com {
       email admin@yakrover.com
       reverse_proxy localhost:8000
   }
   ```

3. **Run Caddy as API gateway**:
   ```bash
   docker run -d --name caddy_api \
     -p 8443:443 \
     -v $(pwd)/Caddyfile.api:/etc/caddy/Caddyfile \
     -v caddy_api_data:/data \
     --network yakrover_network \
     caddy:2-alpine
   ```

## VII. Management Commands

```bash
# View running containers
docker ps

# View logs (run from respective directory)
docker compose logs -f            # All logs
docker compose logs -f backend    # Backend logs only
docker compose logs -f frontend   # Frontend logs only

# Restart services
docker compose restart

# Update and redeploy (backend)
cd backend-fastapi
git pull
./build_backend.sh
./stop_backend.sh && ./start_backend.sh

# Update and redeploy (frontend)
cd frontend-react
git pull
./build_frontend.sh
./stop_frontend.sh && ./start_frontend.sh

# Stop containers (keep images)
./stop_backend.sh
./stop_frontend.sh

# Full cleanup (remove containers, images, volumes)
./stop_backend.sh --clean
./stop_frontend.sh --clean
docker system prune -f
```

## VIII. Troubleshooting

### Container can't reach backend

Ensure both containers are on the same network:
```bash
docker network inspect yakrover_network
```

### TLS certificate issues

Check Caddy logs:
```bash
docker compose logs frontend | grep -i certificate
```

Ensure ports 80 and 443 are accessible from the internet.

### Database migration errors

```bash
docker compose exec backend uv run alembic upgrade head
```

## IX. File Reference

| File | Purpose |
|------|---------|
| `backend-fastapi/Dockerfile` | Backend Docker image |
| `backend-fastapi/docker-compose.yml` | Backend orchestration |
| `backend-fastapi/build_backend.sh` | Build backend image |
| `backend-fastapi/start_backend.sh` | Start backend |
| `backend-fastapi/stop_backend.sh` | Stop backend |
| `frontend-react/Dockerfile.standalone` | Frontend Docker image |
| `frontend-react/docker-compose.yml` | Frontend orchestration |
| `frontend-react/Caddyfile.standalone` | Caddy configuration |
| `frontend-react/build_frontend.sh` | Build frontend image |
| `frontend-react/start_frontend.sh` | Start frontend |
| `frontend-react/stop_frontend.sh` | Stop frontend |
