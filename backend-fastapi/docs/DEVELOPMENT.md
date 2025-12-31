# YakRover Robot Control API - Development Guide

**Version**: 1.4.0
**Last Updated**: December 31, 2025

---

## Quick Links

- **Problems & Solutions**: See [agent-history/problems-solved.md](agent-history/problems-solved.md)
- **Session Context**: See [agent-history/session-context.md](agent-history/session-context.md)
- **Prompts Library**: See [agent-history/prompts.md](agent-history/prompts.md)

---

## What Is This Project?

FastAPI backend for Tumbller robot control with x402 payment integration.

- **Purpose**: Time-based robot access with cryptocurrency payments and Privy wallet management
- **Key Features**:
  - Session management for robot access control
  - x402 payment protocol integration (USDC on Base Sepolia)
  - Privy server wallet management for robots
  - Dual wallet support (user-provided + Privy-created)
  - USDC earnings collection and ETH gas funding
  - Robot proxy for motor commands and camera streaming
  - Wallet-based authentication via headers
- **Integrations**: x402 facilitator, Privy API, ESP32 robots, React frontend

---

## Tech Stack

```
Python 3.11+
FastAPI
SQLAlchemy 2.0 (async ORM)
Alembic (migrations)
Pydantic v2 (validation)
x402 (payment protocol)
Privy API (server wallets)
httpx (async HTTP client)
aiosqlite (async SQLite)
uv (package manager)
pytest (testing)
```

---

## Project Status

✅ **v1.4.0 Complete** (December 31, 2025)
- Docker deployment with standalone Dockerfile and docker-compose
- Build/start/stop scripts for independent backend deployment
- Daily rotating log files to `/app/logs/`
- Alembic reads DATABASE_URL from environment
- Fixed CORS preflight handling in x402 middleware
- Renamed to YakRover

✅ **v1.3.0 Complete** (December 29, 2025)
- Complete Privy wallet integration for robots
- Dual wallet support (user-provided + Privy-created)
- USDC earnings collection via Privy server wallets
- ETH gas funding info endpoint with price API
- Wallet balance endpoint (ETH + USDC)
- Wallet switching functionality
- SQLAlchemy async database layer with Alembic migrations

✅ **v1.2.0 Complete** (December 29, 2025)
- Simplified ENS module with web3.py (replaced pycryptodome)
- Updated tests to work with payment enabled by default
- Fixed datetime.utcnow() deprecation warnings

✅ **v1.1.0 Complete** (December 28, 2025)
- ENS name resolution for payment addresses
- Network configuration (base-sepolia/base)

✅ **v1.0.1 Complete** (December 28, 2024)
- Fixed x402 middleware CORS issues
- Added CORS headers to 402 responses
- Fixed OPTIONS preflight handling for x402 routes

✅ **v1.0.0 Complete** (December 28, 2024)
- Session management (create, check, expire)
- x402 payment integration with Coinbase facilitator
- Robot proxy endpoints (motor commands, camera frames)
- Robot status checking (motor and camera health)

---

## For New Contributors

1. Read [docs/dev/quick-start.md](docs/dev/quick-start.md) - 5 min setup
2. Review [docs/dev/architecture.md](docs/dev/architecture.md) - understand structure
3. Check [docs/dev/problems-solved.md](docs/dev/problems-solved.md) - learn from past issues

---

## For Continuing Work

**Current Session Context**: [agent-history/session-2025-12-31.md](agent-history/session-2025-12-31.md)

**Common Tasks**:
- Add endpoint → [docs/dev/common-tasks.md](docs/dev/common-tasks.md)
- Add model → [docs/dev/common-tasks.md](docs/dev/common-tasks.md)
- Fix bug → [docs/dev/debugging.md](docs/dev/debugging.md)
- Database migration → [docs/dev/migrations.md](docs/dev/migrations.md)

---

## Documentation Index

### User Documentation
- `README.md` - Installation and usage
- `docs/API_Reference.md` - API endpoints documentation
- `docs/deployment.md` - Deployment guide

### Developer Documentation
- `docs/dev/quick-start.md` - Setup and first run
- `docs/dev/architecture.md` - System design and patterns
- `docs/dev/debugging.md` - Troubleshooting guide
- `docs/dev/common-tasks.md` - How-to guides
- `docs/dev/migrations.md` - Database migration guide
- `docs/dev/testing.md` - Testing guide

### Agent History (AI Session Continuity)
- `docs/agent-history/session-2025-12-31.md` - Current session context (Docker deployment)
- `docs/agent-history/problems-solved.md` - Issues and solutions
- `docs/agent-history/prompts.md` - AI prompts that worked
- `docs/changelog.md` - Version history

### AI Context
- `CLAUDE.md` - Instructions for AI assistants

---

## Commands Reference

```bash
# Development
uv run uvicorn app.main:app --reload          # Start dev server
uv run pytest                                  # Run tests
uv run pytest -v --cov=app                    # Tests with coverage
uv run ruff check . --fix                     # Lint and auto-fix
uv run ruff format .                          # Format code

# Database
uv run alembic upgrade head                   # Apply migrations
uv run alembic revision --autogenerate -m ""  # Generate migration
uv run alembic downgrade -1                   # Rollback

# Type checking
uv run mypy app/                              # Type check
```

---

## Version History

See [docs/changelog.md](docs/changelog.md) for detailed history.

### v0.1.0 ([Date])
- Initial project setup

---

## Credits

**Developer**: [Your Name]
**AI Assistant**: Claude via Claude Code
