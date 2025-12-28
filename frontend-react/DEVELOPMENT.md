# Tumbller Robot Control - Development Guide

**Version**: 1.2.1
**Last Updated**: December 28, 2024

---

## Quick Links

- **Getting Started**: See [docs/dev/quick-start.md](docs/dev/quick-start.md)
- **Architecture**: See [docs/dev/architecture.md](docs/dev/architecture.md)
- **Problems & Solutions**: See [docs/agent-history/problems-solved.md](docs/agent-history/problems-solved.md)
- **API Reference**: See [docs/ESP32_API_Reference.md](docs/ESP32_API_Reference.md)
- **Debugging**: See [docs/dev/debugging.md](docs/dev/debugging.md)
- **Changelog**: See [docs/dev/changelog.md](docs/dev/changelog.md)

---

## What Is This Project?

A React web application for controlling Tumbller robots with x402 payment integration:
- **Motors**: ESP32S3 (forward/back/left/right controls) via FastAPI backend
- **Camera**: ESP-CAM (live video stream) via backend proxy
- **Wallet**: MetaMask/Coinbase Wallet integration for Base Sepolia
- **Payments**: x402 protocol for session-based access control
- **Features**: Multi-robot support, session management, payment verification

---

## Tech Stack

```
React 18 + TypeScript
Vite 6
Chakra UI v2 (orange/yellow/brown theme)
Zustand (robot state) + Context (wallet/session)
ethers.js v6 (wallet integration)
React Hook Form + Zod (forms)
```

---

## Project Status

✅ **v1.2.1 Complete** (December 28, 2024)
- Fixed x402 payment flow using official `@x402/fetch` packages
- Fixed CORS issues with 402 responses
- Fixed transaction hash display (extracted from `X-PAYMENT-RESPONSE` header)
- Added ethers.js → x402 signer adapter for browser wallets

✅ **v1.2.0 Complete** (December 28, 2024)
- x402 payment integration with Base Sepolia
- Wallet connection (MetaMask, Coinbase Wallet)
- Session-based robot access control
- Backend API integration (FastAPI)
- Session countdown timer with progress bar
- Transaction hash display with explorer link

✅ **v1.1.0 Complete** (December 26, 2024)
- Optional Logto authentication

✅ **v1.0.0 Complete** (December 26, 2024)
- Multi-robot management
- Manual connection workflow
- Motor controls
- Camera display
- Custom theme

---

## For New Contributors

1. Read [docs/dev/quick-start.md](docs/dev/quick-start.md) - 5 min setup
2. Review [docs/dev/architecture.md](docs/dev/architecture.md) - understand structure
3. Check [docs/agent-history/problems-solved.md](docs/agent-history/problems-solved.md) - learn from issues

---

## For Continuing Work

**Before debugging**: Check [docs/agent-history/problems-solved.md](docs/agent-history/problems-solved.md)

**Common Tasks**:
- Add feature → [docs/dev/common-tasks.md](docs/dev/common-tasks.md)
- Fix bug → [docs/dev/debugging.md](docs/dev/debugging.md)
- Update theme → [docs/theme-customization.md](docs/theme-customization.md)

---

## Running the Application

### Prerequisites
- Node.js 18+
- pnpm
- FastAPI backend running (see `backend-fastapi/`)

### Development
```bash
# Install dependencies
pnpm install

# Create .env from example
cp .env.example .env

# Configure backend URL
# VITE_API_URL=http://localhost:8000

# Start dev server
pnpm dev
```

### With Backend
```bash
# Terminal 1: Start backend
cd ../backend-fastapi
uv run uvicorn app.main:app --reload

# Terminal 2: Start frontend
pnpm dev
```

---

## Documentation Index

### User Documentation
- `README.md` - User guide and installation
- `docs/ESP32_API_Reference.md` - Robot API endpoints
- `docs/Theme_Guide.md` - Visual design guide

### Developer Documentation
- `docs/dev/quick-start.md` - Setup and first run
- `docs/dev/architecture.md` - System design
- `docs/dev/changelog.md` - Version history and changes
- `docs/dev/debugging.md` - Troubleshooting guide
- `docs/dev/common-tasks.md` - How-to guides
- `docs/dev/future-improvements.md` - Roadmap

### Agent History (for AI assistants)
- `docs/agent-history/problems-solved.md` - Issues and solutions reference

### AI Context
- `CLAUDE.md` - Instructions for AI assistants
- `Project_Prompt.md` - Original requirements

---

## Key Architecture Decisions (v1.2.0)

### State Management
- **Wallet state**: React Context (`WalletProvider`)
- **Session state**: React Context (`SessionProvider`)
- **Robot configs**: Zustand with localStorage persistence

### Why Context for Wallet/Session?
- State needs to be shared across many components
- Hooks like `useSession()` must update all consumers when state changes
- Zustand would work but Context is simpler for this use case

### Why Zustand for Robots?
- Robot configs need localStorage persistence
- Less frequently updated than session state
- Map data structure for efficient lookups

### Backend Communication
- All robot commands go through FastAPI backend
- Backend handles ESP32 communication
- Session validation on every command
- x402 payment verification via facilitator

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.1 | 2024-12-28 | x402 payment fixes, official client packages |
| 1.2.0 | 2024-12-28 | x402 payments, wallet integration, backend API |
| 1.1.0 | 2024-12-26 | Optional Logto authentication |
| 1.0.0 | 2024-12-26 | Initial release with core features |

See [docs/dev/changelog.md](docs/dev/changelog.md) for detailed changes.

---

## Credits

**Developer**: Anuraj R.
**AI Assistant**: Claude Opus 4.5 via Claude Code
**Robot Firmware**: [YakRoboticsGarage](https://github.com/YakRoboticsGarage)
