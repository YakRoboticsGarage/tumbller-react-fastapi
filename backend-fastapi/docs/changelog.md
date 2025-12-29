# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

---

## [1.3.0] - 2025-12-29

### Added
- **Privy Server Wallet Integration**:
  - Complete Privy API client (`app/services/privy.py`) for server-managed wallets
  - Create wallets via Privy API with `create_wallet()`
  - Send ETH transactions with `send_transaction()`
  - Send USDC (ERC20) transfers with `send_usdc()` using encoded contract calls
  - Get ETH and USDC balances via public RPC

- **Robot Wallet Management**:
  - Dual wallet support: user-provided OR Privy-created wallets
  - Wallet switching between wallet types without losing either
  - Soft delete for robots (preserves wallet data)
  - Owner wallet field for payout destinations

- **New API Endpoints**:
  - `POST /api/v1/robots` - Register robot (auto-creates Privy wallet if no address)
  - `GET /api/v1/robots` - List all robots
  - `GET /api/v1/robots/{id}` - Get robot details
  - `PATCH /api/v1/robots/{id}` - Update robot
  - `DELETE /api/v1/robots/{id}` - Soft delete robot
  - `POST /api/v1/robots/{id}/payout` - Transfer USDC earnings to owner
  - `POST /api/v1/robots/{id}/switch-wallet` - Switch between wallet types
  - `GET /api/v1/robots/{id}/balance` - Get ETH and USDC balances
  - `GET /api/v1/robots/gas-funding-info` - Get ETH price for gas funding

- **Database Layer**:
  - SQLAlchemy 2.0 async ORM with `aiosqlite`
  - Alembic migrations setup
  - Robot model with wallet fields

- **ETH Price API**:
  - CoinGecko integration for ETH/USD price
  - `calculate_eth_for_usd()` for gas funding calculations

### Technical Details
- USDC transfers use ERC20 `transfer(address,uint256)` encoding
- Privy API uses CAIP-2 format (`eip155:{chain_id}`) for chain specification
- USDC contract addresses: Base Sepolia `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- Transaction hash extraction handles multiple Privy response formats

---

## [1.2.0] - 2025-12-29

### Changed
- **ENS Module Simplification**: Replaced custom keccak256/JSON-RPC implementation with web3.py
  - Reduced `app/core/ens.py` from ~200 lines to ~40 lines
  - Replaced `pycryptodome` dependency with `web3>=7.0.0`
  - Uses web3.py's built-in ENS support for name resolution

- **Test Suite Updated for Payment Enabled by Default**:
  - Tests now expect `payment_enabled=True` (matching production `.env`)
  - Created `create_test_app()` in conftest.py that bypasses x402 middleware
  - Updated assertions in test_health.py, test_session.py, test_motor_control.py

### Fixed
- **datetime.utcnow() Deprecation Warnings**: Replaced with `datetime.now(UTC)` in `app/services/session.py`
  - Reduced test warnings from 61 to 1 (remaining warning is from external `websockets` library)

### Technical Details
- Test mock robot IP changed from 192.168.8.201 to 192.168.1.100
- Linting auto-fixed: import ordering, `Optional[X]` → `X | None` syntax

---

## [1.1.0] - 2025-12-28

### Added
- **ENS (Ethereum Name Service) Support**:
  - Resolve ENS names in `PAYMENT_ADDRESS` env var (e.g., "vitalik.eth")
  - ENS resolution module (`app/core/ens.py`) with keccak256 hashing
  - Automatic ENS name resolution for payment addresses
  - Added `pycryptodome` dependency for cryptographic operations

- **Network Configuration**:
  - `X402_NETWORK` environment variable for testnet/mainnet switching
  - Support for "base-sepolia" (testnet, default) and "base" (mainnet)
  - Consistent network configuration across frontend and backend

### Changed
- **CORS Configuration**: Enhanced 402 response handling for x402 payment flow
  - Allow `X-PAYMENT-RESPONSE` header in CORS
  - Properly handle OPTIONS requests for payment endpoints
  - Extract transaction hash from header for payment verification

### Technical Details
- ENS resolution uses Ethereum public resolver contract
- Network configuration validated at startup
- CORS allows x402-specific headers for proper payment flow

---

## [1.0.1] - 2025-12-28

### Added
- **Frontend Integration Support**:
  - React 18 frontend with x402 payment integration
  - Enhanced CORS configuration for frontend communication
  - Payment transaction hash extraction from headers

### Fixed
- x402 CORS issues with 402 responses
- Payment header exposure for frontend access

---

## [0.1.0] - 2024-12-27

### Added
- **Session Management**: Wallet-based session system with robot binding
  - `POST /api/v1/access/purchase` - Purchase access to a robot
  - `GET /api/v1/access/status` - Check session status
  - `GET /api/v1/access/config` - Get payment configuration
  - One wallet can control only one robot at a time
  - Robot locking prevents concurrent access by different wallets

- **Robot Control Endpoints**:
  - `GET /api/v1/robot/status` - Check robot online status (motor + camera)
  - `GET /api/v1/robot/motor/forward` - Move robot forward
  - `GET /api/v1/robot/motor/back` - Move robot backward
  - `GET /api/v1/robot/motor/left` - Turn robot left
  - `GET /api/v1/robot/motor/right` - Turn robot right
  - `GET /api/v1/robot/motor/stop` - Stop robot
  - `GET /api/v1/robot/camera/frame` - Get camera JPEG frame

- **Health Check**: `GET /health` endpoint with payment status

- **Payment Toggle**: `PAYMENT_ENABLED` environment variable
  - When disabled: Free access mode for development/testing
  - When enabled: x402 payment integration (not yet implemented)

- **Robot Service**: HTTP client for robot communication
  - Supports mDNS names (e.g., `finland-tumbller-01`) and IP addresses
  - Camera accessed via `{robot-name}-cam.local`
  - `/info` endpoint for robot discovery

- **Test Suite**: 26 tests covering all endpoints
  - Health and config tests
  - Robot status tests
  - Session purchase and locking tests
  - Motor control tests
  - Fixtures with mocked robot service

### Technical Details
- Python 3.11+
- FastAPI with async support
- Pydantic v2 for validation
- In-memory session storage (upgrade to Redis planned)
- uv for package management
- pytest for testing

### Known Issues
- Camera tests deferred (hardware offline)
- `/motor/back` should be renamed to `/motor/backward`
- `datetime.utcnow()` deprecation warnings

---

## Version Guidelines

### Version Numbers

- **MAJOR** (1.0.0): Breaking API changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Entry Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

### Writing Good Entries

```markdown
# Good
- Add user authentication with JWT tokens (#123)
- Fix N+1 query in /api/v1/orders endpoint
- Change password hashing from bcrypt to argon2

# Bad
- Fixed stuff
- Updated code
- Changes
```

---

## Links

[Unreleased]: https://github.com/[username]/[repo]/compare/backend-fastapi-v1.1.0...HEAD
[1.1.0]: https://github.com/[username]/[repo]/compare/backend-fastapi-v1.0.1...backend-fastapi-v1.1.0
[1.0.1]: https://github.com/[username]/[repo]/compare/backend-fastapi-v0.1.0...backend-fastapi-v1.0.1
[0.1.0]: https://github.com/[username]/[repo]/releases/tag/backend-fastapi-v0.1.0
