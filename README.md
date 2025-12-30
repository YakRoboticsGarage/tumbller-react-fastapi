# Tumbller Robot Control

A full-stack web application for controlling Tumbller robots with x402 cryptocurrency payment integration and Privy wallet management.

## Overview

Control ESP32-based Tumbller robots through a web interface with session-based access and USDC payments on Base network. Supports both user-provided wallets and Privy-managed embedded wallets for seamless robot earnings collection.

**Features:**
- Motor controls (forward, back, left, right) via ESP32S3
- Live camera streaming via ESP-CAM
- x402 payment integration (USDC on Base Sepolia/Mainnet)
- **Privy wallet authentication** - login with MetaMask, Coinbase Wallet, WalletConnect
- Session-based access control with countdown timer and transaction tracking
- Multi-robot support with persistent storage
- **Privy wallet integration** for robot earnings management
- **Dual wallet support** - switch between user-provided and Privy-created wallets
- **USDC earnings collection** - transfer robot earnings to owner wallet
- **ENS/Base name resolution** for owner wallet addresses
- **Yak Robotics branding** - logo throughout the UI

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Frontend │────▶│  FastAPI Backend│────▶│  ESP32 Robots   │
│  (Vite + Chakra)│     │  (SQLAlchemy)   │     │  (Motor + Cam)  │
│                 │     │                 │     │                 │
│  • Privy Auth   │     │  • Robot CRUD   │     │  • HTTP REST    │
│  • Zustand      │     │  • x402 Proxy   │     │  • MJPEG Stream │
│  • React Query  │     │  • Privy API    │     │                 │
│  • ethers.js    │     │  • Sessions     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ├───────────────────────┼──────────────────┐
         │                       │                  │
         ▼                       ▼                  ▼
┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
│   Privy SDK     │     │ x402 Facilitator│ │   Privy API     │
│ (Wallet Login)  │     │ (Coinbase)      │ │ (Robot Wallets) │
└─────────────────┘     └─────────────────┘ └─────────────────┘
         │                       │                  │
         └───────────────────────┴──────────────────┘
                                 │
                                 ▼
                        ┌───────────────────────────────────┐
                        │        Base Network (L2)          │
                        │   USDC Payments + Robot Wallets   │
                        └───────────────────────────────────┘
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
#   VITE_ENABLE_AUTH=true
#   VITE_AUTH_METHOD=privy
#   VITE_PRIVY_APP_ID=your-privy-app-id

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

### Privy Wallet Settings (Backend)

For Privy-managed robot wallets:

```bash
# backend-fastapi/.env
PRIVY_APP_ID=your-app-id          # From Privy dashboard
PRIVY_APP_SECRET=your-app-secret  # From Privy dashboard
```

### Free Access Mode

For development without payments:

```bash
# backend-fastapi/.env
PAYMENT_ENABLED=false
```

## Usage

1. **Login with Wallet** - Connect via Privy (MetaMask, Coinbase Wallet, or WalletConnect)
2. **Add Robot** - Enter robot name, ESP32 IP addresses, and optionally a wallet address
3. **Get Access** - Pay with USDC to start a session (transaction hash shown in UI)
4. **Control Robot** - Use motor controls and camera stream during active session
5. **Collect Earnings** - Transfer USDC from robot wallet to your owner wallet

### Wallet Management

Robots can receive payments to either:
- **User-provided wallet** - Your existing wallet address
- **Privy wallet** - Auto-created embedded wallet managed by Privy

You can switch between wallet types in the Robot Details panel. Privy wallets require ETH for gas fees to transfer USDC earnings.

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite 6
- Chakra UI v2
- Zustand (state management)
- React Query (server state)
- ethers.js v6
- Privy SDK (wallet authentication)
- @x402/fetch, @x402/evm
- Vitest + React Testing Library

**Backend:**
- Python 3.11+
- FastAPI
- SQLAlchemy 2.0 + Alembic (database)
- x402-python
- httpx (async HTTP)
- Privy Server SDK (wallet management)
- pytest (testing)

## Project Structure

```
├── frontend-react/          # React SPA
│   ├── src/
│   │   ├── assets/          # Static assets (logo, images)
│   │   ├── components/      # UI components
│   │   ├── config/          # App configuration (Privy, chains)
│   │   ├── hooks/           # Custom React hooks (auth, wallet, session)
│   │   ├── pages/           # Route pages (RobotControl, WalletLogin)
│   │   ├── providers/       # Context providers (Auth, Wallet, Session)
│   │   ├── services/        # API clients
│   │   ├── stores/          # Zustand stores
│   │   └── test/            # Test utilities and mocks
│   └── docs/                # Frontend documentation
│
├── backend-fastapi/         # FastAPI backend
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── core/            # Config, middleware
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic (Privy, robot wallet)
│   ├── alembic/             # Database migrations
│   ├── tests/               # pytest test suite
│   └── docs/                # Backend documentation
│
├── .github/workflows/       # GitHub Actions CI
│   ├── backend-tests.yml    # Backend pytest workflow
│   └── frontend-tests.yml   # Frontend vitest workflow
│
└── README.md                # This file
```

## Documentation

| Document | Description |
|----------|-------------|
| [Frontend README](frontend-react/README.md) | Frontend setup and usage |
| [Privy Authentication Guide](frontend-react/docs/Privy_Authentication_Guide.md) | Wallet auth setup |
| [Frontend DEVELOPMENT.md](frontend-react/DEVELOPMENT.md) | Frontend dev guide |
| [Backend DEVELOPMENT.md](backend-fastapi/docs/DEVELOPMENT.md) | Backend dev guide |
| [ESP32 API Reference](frontend-react/docs/ESP32_API_Reference.md) | Robot endpoints |

## Commands

```bash
# Frontend (in frontend-react/)
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm test                   # Run tests with Vitest
pnpm check                  # Lint + typecheck + test

# Backend (in backend-fastapi/)
uv run uvicorn app.main:app --reload    # Start dev server
uv run pytest                            # Run tests
uv run ruff check . --fix               # Lint
uv run alembic upgrade head             # Apply database migrations
```

## CI/CD

GitHub Actions automatically runs on push/PR:
- **Backend tests** - pytest with SQLite in-memory database
- **Frontend tests** - Vitest with React Testing Library

[![Backend Tests](https://github.com/YakRoboticsGarage/tumbller-react-fastapi/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/YakRoboticsGarage/tumbller-react-fastapi/actions/workflows/backend-tests.yml)
[![Frontend Tests](https://github.com/YakRoboticsGarage/tumbller-react-fastapi/actions/workflows/frontend-tests.yml/badge.svg)](https://github.com/YakRoboticsGarage/tumbller-react-fastapi/actions/workflows/frontend-tests.yml)

## License

Apache 2.0

## Credits

- **Developer**: Anuraj R.
- **AI Assistant**: Claude Opus 4.5 via Claude Code
- **Robot Firmware**: [YakRoboticsGarage](https://github.com/YakRoboticsGarage)
- **Payment Protocol**: [x402](https://www.x402.org/) by Coinbase
