# Problems Solved

> **Purpose**: Document solutions to problems encountered during development.
> **Before debugging**: Search this file - the problem may have been solved before.

---

## Index by Category

- [x402 Payment Integration](#x402-payment-integration)
- [CORS & Middleware](#cors--middleware)
- [Database & Migrations](#database--migrations)
- [Privy Wallet Integration](#privy-wallet-integration)
- [Authentication & Security](#authentication--security)
- [API & Routing](#api--routing)
- [Async & Concurrency](#async--concurrency)
- [Testing](#testing)
- [Performance](#performance)
- [Deployment](#deployment)
- [Dependencies](#dependencies)

---

## x402 Payment Integration

### x402 402 Response Missing CORS Headers

**Date**: 2024-12-28

**Symptoms**:
```
Frontend error: "Failed to fetch"
Browser console: CORS policy blocked - no 'Access-Control-Allow-Origin' header
Backend logs show 402 responses being sent correctly
```

**Root Cause**:
FastAPI middleware runs in LIFO (Last In, First Out) order. When middleware is added:
1. CORS middleware added first
2. x402 middleware added second

Request flow: `Request → x402 → CORS → Handler`
Response flow: `Handler → CORS → x402 → Response`

When x402 returns a 402 response directly (before reaching the handler), it bypasses CORS on the response path. The 402 response never passes through CORS middleware, so it has no CORS headers.

**Solution**:
Wrap x402 middleware to manually add CORS headers to 402 responses:

```python
# app/main.py
async def x402_with_cors_support(request: Request, call_next) -> Response:
    origin = request.headers.get("origin", "")

    # Skip x402 for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)

    response = await x402_middleware(request, call_next)

    # Add CORS headers to 402 responses (x402 bypasses CORS middleware)
    if response.status_code == 402 and origin in settings.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"

    return response

app.middleware("http")(x402_with_cors_support)
```

**Prevention**:
- When adding middleware that returns responses directly (like x402), consider CORS implications
- Test API responses with browser fetch, not just curl (curl doesn't enforce CORS)
- Wrap payment/auth middleware to add CORS headers to error responses

**Related Files**: `app/main.py`

---

### x402 OPTIONS Preflight Returning 402

**Date**: 2024-12-28

**Symptoms**:
```
Browser console: OPTIONS request returns 402 Payment Required
CORS preflight fails before actual request
```

**Root Cause**:
x402 middleware intercepted OPTIONS requests and returned 402 because no payment header was present.

**Solution**:
Skip x402 middleware for OPTIONS requests:

```python
async def x402_with_cors_support(request: Request, call_next) -> Response:
    # Skip x402 for OPTIONS requests (CORS preflight)
    if request.method == "OPTIONS":
        return await call_next(request)
    return await x402_middleware(request, call_next)
```

**Prevention**:
- Always skip payment/auth middleware for OPTIONS requests
- CORS preflight should never require authentication or payment

**Related Files**: `app/main.py`

---

## CORS & Middleware

### CORS Not Exposing Custom Headers

**Date**: 2024-12-28

**Symptoms**:
```
Frontend JavaScript cannot read custom headers from response
response.headers.get('X-Custom-Header') returns null
Headers visible in browser Network tab but not accessible to JS
```

**Root Cause**:
CORS `Access-Control-Expose-Headers` not configured to expose custom headers. By default, only simple response headers are accessible to frontend JavaScript.

**Solution**:
Add custom headers to `expose_headers` in CORS config:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["PAYMENT-REQUIRED", "X-PAYMENT-RESPONSE"],  # Add custom headers here
)
```

**Prevention**:
- Always add custom response headers to `expose_headers`
- Document which headers are used by frontend

**Related Files**: `app/main.py`

---

## Database & Migrations

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
[Error message or unexpected behavior]
```

**Root Cause**:
[Why the problem occurred]

**Solution**:
```python
# Code or commands that fixed it
```

**Prevention**:
- [How to avoid this in the future]

**Related Files**: `path/to/file.py`

---

## Privy Wallet Integration

### Privy API USDC Transfer Returns 400 Bad Request

**Date**: 2025-12-29

**Symptoms**:
```
httpx.HTTPStatusError: Client error '400 Bad Request' for url 'https://api.privy.io/v1/wallets/{id}/rpc'
POST /api/v1/robots/{id}/payout HTTP/1.1" 500 Internal Server Error
Frontend shows CORS error (because 500 response lacks CORS headers)
```

**Root Cause**:
Privy API expects chain specification using `caip2` format at the top level of the JSON request, not `chainId` inside the transaction object. The `chainId` field inside transaction params is ignored/invalid.

**Solution**:
```python
# app/services/privy.py - send_usdc() method

# ❌ Before (wrong)
response = await client.post(
    f"/wallets/{wallet_id}/rpc",
    json={
        "method": "eth_sendTransaction",
        "params": {
            "transaction": {
                "to": usdc_address,
                "data": data_hex,
                "value": "0x0",
                "chainId": chain_id,  # WRONG - Privy ignores this
            }
        },
    },
)

# ✅ After (correct)
response = await client.post(
    f"/wallets/{wallet_id}/rpc",
    json={
        "method": "eth_sendTransaction",
        "caip2": f"eip155:{chain_id}",  # CORRECT - at top level, CAIP-2 format
        "params": {
            "transaction": {
                "to": usdc_address,
                "data": data_hex,
                "value": 0,  # Also use integer, not hex string
            }
        },
    },
)
```

**Prevention**:
- Always check Privy API docs for exact request format
- CAIP-2 format is `eip155:{chain_id}` (e.g., `eip155:84532` for Base Sepolia)
- Test ERC20 transfers with small amounts first

**Related Files**: `app/services/privy.py`

---

### ERC20 USDC Transfer Encoding

**Date**: 2025-12-29

**Symptoms**:
```
Need to transfer USDC (ERC20 token) from Privy wallet to owner wallet
Direct ETH transfer works but USDC requires contract interaction
```

**Root Cause**:
USDC is an ERC20 token requiring encoded contract calls, not simple value transfers. The `transfer(address,uint256)` function must be ABI-encoded.

**Solution**:
```python
# app/services/privy.py

async def send_usdc(
    self,
    wallet_id: str,
    to_address: str,
    amount: int,  # USDC smallest units (6 decimals)
    chain_id: int = 84532,
) -> str:
    # USDC contract addresses per chain
    usdc_contracts = {
        84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # Base Sepolia
        8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",   # Base Mainnet
    }
    usdc_address = usdc_contracts.get(chain_id)

    # Encode ERC20 transfer(address,uint256) call
    # Function selector: 0xa9059cbb (keccak256("transfer(address,uint256)")[:4])
    to_padded = to_address.lower().replace("0x", "").zfill(64)  # Pad address to 32 bytes
    amount_padded = hex(amount)[2:].zfill(64)  # Pad amount to 32 bytes
    data_hex = f"0xa9059cbb{to_padded}{amount_padded}"

    # Send to USDC contract with encoded data
    response = await client.post(
        f"/wallets/{wallet_id}/rpc",
        json={
            "method": "eth_sendTransaction",
            "caip2": f"eip155:{chain_id}",
            "params": {
                "transaction": {
                    "to": usdc_address,  # Contract address, not recipient
                    "data": data_hex,     # Encoded transfer call
                    "value": 0,           # No ETH value for ERC20 transfer
                }
            },
        },
    )
```

**Prevention**:
- ERC20 transfers always go to the contract address, not the recipient
- The recipient is encoded in the `data` field
- Function selector `0xa9059cbb` = `transfer(address,uint256)`
- Function selector `0x70a08231` = `balanceOf(address)` for reading balance

**Related Files**: `app/services/privy.py`

---

### Privy API Transaction Hash Response Format

**Date**: 2025-12-29

**Symptoms**:
```
Transaction succeeds but tx_hash is empty string
Different response structures depending on transaction type
```

**Root Cause**:
Privy API returns transaction hash in different response fields depending on the request type and API version.

**Solution**:
```python
# app/services/privy.py

# Try multiple possible paths in the response
tx_hash = (
    data.get("data", {}).get("transaction_hash")
    or data.get("data", {}).get("transactionHash")
    or data.get("data", {}).get("hash")
    or data.get("transaction_hash")
    or data.get("transactionHash")
    or data.get("hash")
    or ""
)
return tx_hash
```

**Prevention**:
- Always check multiple possible response paths for Privy API
- Log full response during development to identify correct path
- The nested `data.transaction_hash` pattern is common

**Related Files**: `app/services/privy.py`

---

## Authentication & Security

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
[Error message]
```

**Root Cause**:
[Explanation]

**Solution**:
```python
```

**Prevention**:
- 

---

## API & Routing

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Async & Concurrency

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Testing

### Tests Failing with 402 When Payment Enabled

**Date**: 2025-12-29

**Symptoms**:
```
FAILED tests/test_session.py::test_purchase_access_success - assert 402 == 200
FAILED tests/test_motor_control.py::test_motor_forward_with_valid_session - assert 402 == 200
# 18 tests failing with 402 Payment Required
```

**Root Cause**:
Tests used the real app from `app.main:app` which includes x402 middleware when `PAYMENT_ENABLED=true` in `.env`. The x402 middleware intercepts `/api/v1/access/purchase` and returns 402 before reaching the endpoint.

**Solution**:
Create a test-specific app in `conftest.py` that excludes x402 middleware:

```python
# tests/conftest.py
def create_test_app() -> FastAPI:
    """Create a test app without x402 middleware but with payment_enabled=True."""
    settings = get_settings()
    app = FastAPI(title="Tumbller Robot Control API (Test)")

    app.add_middleware(CORSMiddleware, ...)
    # No x402 middleware - we test the endpoints directly

    app.include_router(access.router, prefix="/api/v1/access")
    app.include_router(robot.router, prefix="/api/v1/robot")
    return app

@pytest.fixture
def client():
    test_app = create_test_app()
    return TestClient(test_app)
```

**Prevention**:
- When testing endpoints behind payment/auth middleware, create a test app that bypasses the middleware
- Test middleware behavior separately if needed
- Don't rely on `.env` defaults matching test expectations

**Related Files**: `tests/conftest.py`

---

### datetime.utcnow() Deprecation Warnings

**Date**: 2025-12-29

**Symptoms**:
```
DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal
  in a future version. Use timezone-aware objects to represent datetimes in UTC:
  datetime.datetime.now(datetime.UTC).
# 61 warnings in test output
```

**Root Cause**:
Python 3.12+ deprecates `datetime.utcnow()` in favor of timezone-aware datetimes.

**Solution**:
```python
# Before
from datetime import datetime
now = datetime.utcnow()

# After
from datetime import UTC, datetime
now = datetime.now(UTC)
```

**Prevention**:
- Always use timezone-aware datetimes: `datetime.now(UTC)`
- Configure linter to catch `utcnow()` usage

**Related Files**: `app/services/session.py` 

---

## Performance

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```python
```

**Prevention**:
- 

---

## Deployment

### Alembic Migration Creates Tables in Wrong Database

**Date**: 2025-12-31

**Symptoms**:
```
sqlite3.OperationalError: no such table: robots
# Alembic reports "Will assume non-transactional DDL" but app can't find tables
```

**Root Cause**:
Database path mismatch between Alembic and app:
- `alembic.ini`: `sqlalchemy.url = sqlite+aiosqlite:///./robots.db`
- `.env`: `DATABASE_URL=sqlite+aiosqlite:///./data/robots.db`

Alembic created tables in `./robots.db` but app looked in `./data/robots.db`.

**Solution**:
1. Update `alembic.ini` to match `.env`:
```ini
sqlalchemy.url = sqlite+aiosqlite:///./data/robots.db
```

2. Update `alembic/env.py` to prefer environment variable:
```python
import os

# Override sqlalchemy.url from environment variable if set
if os.environ.get("DATABASE_URL"):
    config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
```

**Prevention**:
- Always use environment variable for database URL in Alembic
- Keep `alembic.ini` path as fallback only
- Test migrations in Docker before deploying

**Related Files**: `alembic.ini`, `alembic/env.py`

---

### Docker Container Can't Write Logs

**Date**: 2025-12-31

**Symptoms**:
```
Logs folder exists but is empty after container runs
```

**Root Cause**:
Container was running old image before logging was added. Need to rebuild.

**Solution**:
```bash
./stop_backend.sh --clean  # Remove old image
./build_backend.sh         # Rebuild with logging
./start_backend.sh
```

**Prevention**:
- Always rebuild after adding new features
- Use `--clean` flag to ensure fresh image

**Related Files**: `Dockerfile`, `app/core/logging.py`

---

## Dependencies

### [Problem Title]

**Date**: YYYY-MM-DD

**Symptoms**:
```
```

**Root Cause**:


**Solution**:
```bash
```

**Prevention**:
- 

---

## Common FastAPI Issues (Reference)

Quick reference for common issues:

### Async Session Not Working
```python
# ❌ Wrong
def get_user(db: Session):
    return db.query(User).first()

# ✅ Correct
async def get_user(db: AsyncSession):
    result = await db.execute(select(User))
    return result.scalar_one_or_none()
```

### Pydantic V2 Migration Issues
```python
# ❌ Old (Pydantic v1)
class Config:
    orm_mode = True

# ✅ New (Pydantic v2)
model_config = ConfigDict(from_attributes=True)
```

### Circular Import
```python
# ❌ Causes circular import
from app.models.user import User  # at top of file

# ✅ Use TYPE_CHECKING
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.models.user import User
```

---

## How to Add Entries

When you solve a problem:

1. **Identify category** (or create new one)
2. **Copy the error message** exactly
3. **Document root cause** - why it happened
4. **Show the fix** - actual code, not description
5. **Add prevention** - how to avoid next time
6. **Link related files** - where the fix was applied

**Good entry** = Someone else can fix the same issue in 2 minutes

**Bad entry** = "Fixed the database thing"
