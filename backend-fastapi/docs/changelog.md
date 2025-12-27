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

### Removed
-

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

[Unreleased]: https://github.com/[username]/[repo]/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/[username]/[repo]/releases/tag/v0.1.0
