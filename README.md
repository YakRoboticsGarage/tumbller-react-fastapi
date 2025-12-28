# Tumbller Robot Control

A full-stack web application for controlling Tumbller robots with x402 cryptocurrency payment integration.

## Overview

Control ESP32-based Tumbller robots through a web interface with session-based access and USDC payments on Base network.

**Features:**
- Motor controls (forward, back, left, right) via ESP32S3
- Live camera streaming via ESP-CAM
- x402 payment integration (USDC on Base Sepolia/Mainnet)
- Wallet connection (Coinbase Wallet, MetaMask)
- Session-based access control with countdown timer
- Multi-robot support

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  FastAPI Backend│────▶│  ESP32 Robots   │
│  (Vite + Chakra)│     │  (x402 + Proxy) │     │  (Motor + Cam)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └─────────────▶│ x402 Facilitator│
                        │ (Coinbase)      │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ with pnpm
- Python 3.11+ with uv
- Wallet with USDC on Base Sepolia (for testing)

### 1. Backend Setup

```bash
cd backend-fastapi

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env:
#   PAYMENT_ENABLED=true
#   PAYMENT_ADDRESS=0xYourWalletAddress
#   X402_NETWORK=base-sepolia

# Start server
uv run uvicorn app.main:app --reload
```

Backend runs at http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend-react

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env:
#   VITE_API_URL=http://localhost:8000
#   VITE_X402_NETWORK=base-sepolia

# Start dev server
pnpm dev
```

Frontend runs at http://localhost:5173

## Configuration

### Network Selection

Both frontend and backend must use the same network:

| Network | Frontend `.env` | Backend `.env` |
|---------|-----------------|----------------|
| Testnet | `VITE_X402_NETWORK=base-sepolia` | `X402_NETWORK=base-sepolia` |
| Mainnet | `VITE_X402_NETWORK=base` | `X402_NETWORK=base` |

### Payment Settings (Backend)

```bash
# backend-fastapi/.env
PAYMENT_ENABLED=true              # Enable x402 payments
PAYMENT_ADDRESS=0x...             # Your wallet to receive payments
X402_NETWORK=base-sepolia         # or "base" for mainnet
SESSION_DURATION_MINUTES=10       # Access duration per payment
SESSION_PRICE=$0.10               # Price in USDC
```

### Free Access Mode

For development without payments:

```bash
# backend-fastapi/.env
PAYMENT_ENABLED=false
```

## Usage

1. **Connect Wallet** - Click "Connect Wallet" (Coinbase Wallet prioritized)
2. **Add Robot** - Enter robot name and ESP32 IP addresses
3. **Get Access** - Pay with USDC to start a session
4. **Control Robot** - Use motor controls and camera stream

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite 6
- Chakra UI v2
- ethers.js v6
- @x402/fetch, @x402/evm

**Backend:**
- Python 3.11+
- FastAPI
- x402-python
- httpx (async HTTP)

## Project Structure

```
├── frontend-react/          # React SPA
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── providers/       # Context providers (Wallet, Session)
│   │   ├── services/        # API clients
│   │   └── stores/          # Zustand stores
│   └── docs/                # Frontend documentation
│
├── backend-fastapi/         # FastAPI backend
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── core/            # Config, middleware
│   │   └── services/        # Business logic
│   └── docs/                # Backend documentation
│
└── README.md                # This file
```

## Documentation

| Document | Description |
|----------|-------------|
| [Frontend README](frontend-react/README.md) | Frontend setup and usage |
| [Frontend DEVELOPMENT.md](frontend-react/DEVELOPMENT.md) | Frontend dev guide |
| [Backend DEVELOPMENT.md](backend-fastapi/docs/DEVELOPMENT.md) | Backend dev guide |
| [ESP32 API Reference](frontend-react/docs/ESP32_API_Reference.md) | Robot endpoints |

## Commands

```bash
# Frontend (in frontend-react/)
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm check                  # Lint + typecheck + test

# Backend (in backend-fastapi/)
uv run uvicorn app.main:app --reload    # Start dev server
uv run pytest                            # Run tests
uv run ruff check . --fix               # Lint
```

## License

Apache 2.0

## Credits

- **Developer**: Anuraj R.
- **AI Assistant**: Claude Opus 4.5 via Claude Code
- **Robot Firmware**: [YakRoboticsGarage](https://github.com/YakRoboticsGarage)
- **Payment Protocol**: [x402](https://www.x402.org/) by Coinbase
