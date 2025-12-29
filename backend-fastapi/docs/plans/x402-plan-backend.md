# x402 Backend Implementation Plan (FastAPI)

**Created:** December 27, 2024
**Framework:** FastAPI (Python)
**Purpose:** Backend server with optional x402 payment for time-based robot access

---

## Overview

Create a FastAPI backend that:
1. Provides time-based robot access (pay once, control for X minutes)
2. Proxies requests to robot controllers (motor + camera)
3. Manages access sessions with expiry
4. Binds one wallet to one robot at a time
5. Supports toggling payment on/off for testing

---

## Payment Model

**Simple Time-Based Access:**
- User pays once → Gets access to a specific robot for X minutes
- Price: $0.10 for 10 minutes of access
- Session stored server-side with expiry timestamp
- One wallet can only control one robot at a time
- One robot can only be controlled by one wallet at a time
- Payment can be disabled via `PAYMENT_ENABLED=false` for testing

---

## Robot Access Model

**Connection Methods:**
- Robots can be accessed via mDNS name (e.g., `finland-tumbller-01`) or direct IP
- Camera is accessed via `{robot-name}-cam.local` for mDNS or same IP for direct connection
- Robot status checked via `/info` endpoint returning `{mdns_name, ip}`

**Session Binding:**
- When purchasing access, wallet is bound to a specific robot
- All motor/camera commands use the session-bound robot (no robot_host param needed)
- Robot is locked until session expires or wallet releases it

---

## Project Structure

```
backend-fastapi/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry
│   ├── api/                    # API route handlers
│   │   ├── __init__.py
│   │   ├── deps.py             # Shared dependencies (session validation)
│   │   └── v1/                 # Version 1 endpoints
│   │       ├── __init__.py
│   │       ├── access.py       # Session purchase & status
│   │       └── robot.py        # Robot control (motor + camera)
│   ├── core/                   # Core configuration
│   │   ├── __init__.py
│   │   └── config.py           # Settings & environment
│   ├── db/                     # Database layer (placeholder)
│   │   └── __init__.py
│   ├── models/                 # ORM models (placeholder)
│   │   └── __init__.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   └── session.py          # Session/robot response schemas
│   └── services/               # Business logic layer
│       ├── __init__.py
│       ├── robot.py            # Robot communication (motor + camera)
│       └── session.py          # Session management with robot locking
├── tests/                      # Test suite
│   └── __init__.py
├── docs/                       # Documentation
│   └── CLAUDE.md
├── pyproject.toml              # Dependencies (uv)
├── .env.example
└── .gitignore
```

---

## Implementation

### Step 1: Dependencies

**pyproject.toml:**
```toml
[project]
name = "tumbller-backend"
version = "1.0.0"
description = "Time-based robot access with x402 payments"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "uvicorn[standard]>=0.27.0",
    "x402>=0.1.0",
    "httpx>=0.26.0",
    "python-dotenv>=1.0.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.2.0",
]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

### Step 2: Configuration

**.env.example:**
```env
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]

# x402 Payments
# Set to true to enable payment gateway, false for free access (testing)
PAYMENT_ENABLED=false
PAYMENT_ADDRESS=0x...your_wallet_address
X402_NETWORK=base-sepolia

# Session
SESSION_DURATION_MINUTES=10
SESSION_PRICE=$0.10
```

**app/core/config.py:**
```python
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # x402 Payments
    payment_enabled: bool = False  # Toggle to enable/disable payment gateway
    payment_address: str = ""
    x402_network: str = "base-sepolia"

    # Session config
    session_duration_minutes: int = 10
    session_price: str = "$0.10"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

### Step 3: Schemas

**app/schemas/session.py:**
```python
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """Response when session is created/checked."""

    active: bool
    robot_host: Optional[str] = None  # mDNS name or IP
    expires_at: Optional[datetime] = None
    remaining_seconds: Optional[int] = None


class PurchaseRequest(BaseModel):
    """Request to purchase access to a robot."""

    robot_host: str  # mDNS name or IP


class PurchaseResponse(BaseModel):
    """Response after purchasing access."""

    status: str
    message: str
    session: SessionResponse
    payment_tx: Optional[str] = None


class CommandResponse(BaseModel):
    """Response for motor commands."""

    status: str
    command: str


class RobotStatusResponse(BaseModel):
    """Response for robot status check."""

    robot_host: str
    motor_online: bool
    motor_ip: Optional[str] = None
    motor_mdns: Optional[str] = None
    camera_online: bool
    camera_ip: Optional[str] = None
    camera_mdns: Optional[str] = None
    available: bool  # Whether the robot is available for a new session
    locked_by: Optional[str] = None  # Masked wallet address
```

---

### Step 4: Session Service

**app/services/session.py:**
```python
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import get_settings


@dataclass
class SessionData:
    """Internal session data storage."""

    wallet_address: str
    robot_host: str  # The robot this wallet is bound to (mDNS name or IP)
    created_at: datetime
    expires_at: datetime
    payment_tx: Optional[str] = None


# In-memory session store (use Redis for production)
_sessions: dict[str, SessionData] = {}
_robot_locks: dict[str, str] = {}  # robot_host -> wallet_address


def create_session(
    wallet_address: str,
    robot_host: str,
    payment_tx: Optional[str] = None,
) -> SessionData:
    """Create new access session binding wallet to a specific robot."""
    settings = get_settings()
    now = datetime.utcnow()
    expires_at = now + timedelta(minutes=settings.session_duration_minutes)
    wallet_lower = wallet_address.lower()
    robot_lower = robot_host.lower()

    # Release any previous robot lock for this wallet
    old_session = _sessions.get(wallet_lower)
    if old_session and old_session.robot_host in _robot_locks:
        if _robot_locks[old_session.robot_host] == wallet_lower:
            del _robot_locks[old_session.robot_host]

    session = SessionData(
        wallet_address=wallet_lower,
        robot_host=robot_lower,
        created_at=now,
        expires_at=expires_at,
        payment_tx=payment_tx,
    )

    _sessions[wallet_lower] = session
    _robot_locks[robot_lower] = wallet_lower
    return session


def get_session(wallet_address: str) -> Optional[SessionData]:
    """Get active session for wallet address."""
    wallet_lower = wallet_address.lower()
    session = _sessions.get(wallet_lower)

    if session is None:
        return None

    if datetime.utcnow() > session.expires_at:
        _cleanup_session(wallet_lower)
        return None

    return session


def is_robot_available(robot_host: str) -> bool:
    """Check if a robot is available (not locked by another wallet)."""
    robot_lower = robot_host.lower()
    if robot_lower not in _robot_locks:
        return True

    lock_holder = _robot_locks[robot_lower]
    if get_session(lock_holder) is None:
        return True

    return False


def get_session_robot(wallet_address: str) -> Optional[str]:
    """Get the robot host bound to this wallet's session."""
    session = get_session(wallet_address)
    if session is None:
        return None
    return session.robot_host
```

---

### Step 5: Robot Service

**app/services/robot.py:**
```python
import re
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class RobotInfo:
    """Robot information from /info endpoint."""
    mdns_name: str
    ip: str


def _is_ip_address(host: str) -> bool:
    """Check if the host is an IP address."""
    ip_pattern = r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$"
    return bool(re.match(ip_pattern, host))


class RobotService:
    """Service for communicating with robot controllers (motor + camera).

    Robots can be accessed via:
    - mDNS name: e.g., "finland-tumbller-01" -> http://finland-tumbller-01.local
    - Direct IP: e.g., "192.168.1.100" -> http://192.168.1.100

    Camera naming convention:
    - mDNS: robot name + "-cam" -> http://finland-tumbller-01-cam.local
    - IP: same IP as motor (camera is on same device)
    """

    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout

    def _get_robot_url(self, robot_host: str) -> str:
        """Get base URL for robot motor controller."""
        if _is_ip_address(robot_host):
            return f"http://{robot_host}"
        else:
            return f"http://{robot_host}.local"

    def _get_camera_url(self, robot_host: str) -> str:
        """Get base URL for robot camera."""
        if _is_ip_address(robot_host):
            return f"http://{robot_host}"
        else:
            return f"http://{robot_host}-cam.local"

    async def get_robot_info(self, robot_host: str) -> Optional[RobotInfo]:
        """Get robot info from /info endpoint."""
        url = f"{self._get_robot_url(robot_host)}/info"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return RobotInfo(
                        mdns_name=data.get("mdns_name", robot_host),
                        ip=data.get("ip", "unknown"),
                    )
                return None
            except (httpx.RequestError, ValueError):
                return None

    async def send_motor_command(self, robot_host: str, command: str) -> bool:
        """Send command to robot motor controller."""
        url = f"{self._get_robot_url(robot_host)}/motor/{command}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                return response.status_code == 200
            except httpx.RequestError:
                return False

    async def get_camera_frame(self, robot_host: str) -> Optional[bytes]:
        """Get single frame from robot camera."""
        url = f"{self._get_camera_url(robot_host)}/getImage"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    return response.content
                return None
            except httpx.RequestError:
                return None

    async def check_status(self, robot_host: str) -> dict:
        """Check overall robot status (motor + camera)."""
        motor_info = await self.get_robot_info(robot_host)
        camera_info = await self.get_camera_info(robot_host)

        return {
            "robot_host": robot_host,
            "motor_online": motor_info is not None,
            "motor_ip": motor_info.ip if motor_info else None,
            "motor_mdns": motor_info.mdns_name if motor_info else None,
            "camera_online": camera_info is not None,
            "camera_ip": camera_info.ip if camera_info else None,
            "camera_mdns": camera_info.mdns_name if camera_info else None,
        }


robot_service = RobotService()
```

---

### Step 6: Shared Dependencies

**app/api/deps.py:**
```python
from typing import Optional

from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.services.session import has_valid_session


def require_session(
    x_wallet_address: Optional[str] = Header(None, description="Wallet address"),
) -> str:
    """Dependency to verify wallet has active session.

    When payment is disabled, allows any wallet address through.
    When payment is enabled, requires a valid session.
    """
    settings = get_settings()

    if not x_wallet_address:
        raise HTTPException(
            status_code=401,
            detail="Wallet address required. Include X-Wallet-Address header.",
        )

    if not settings.payment_enabled:
        return x_wallet_address

    if not has_valid_session(x_wallet_address):
        raise HTTPException(
            status_code=403,
            detail="No active session. Purchase access first.",
        )

    return x_wallet_address
```

---

### Step 7: Access Router

**app/api/v1/access.py:**
```python
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.config import get_settings
from app.schemas.session import PurchaseRequest, PurchaseResponse, SessionResponse
from app.services.robot import robot_service
from app.services.session import (
    create_session,
    get_remaining_seconds,
    get_session,
    is_robot_available,
)

router = APIRouter()


@router.post("/purchase", response_model=PurchaseResponse)
async def purchase_access(
    request: Request,
    body: PurchaseRequest,
    x_wallet_address: str = Header(..., description="Wallet address"),
):
    """
    Purchase robot access session.

    Binds the wallet to a specific robot for the session duration.
    Only one wallet can control a robot at a time.
    """
    settings = get_settings()
    robot_host = body.robot_host

    # Check if robot is online
    motor_online = await robot_service.check_motor_online(robot_host)
    if not motor_online:
        raise HTTPException(
            status_code=503,
            detail=f"Robot '{robot_host}' is offline.",
        )

    # Check if robot is available
    if not is_robot_available(robot_host):
        raise HTTPException(
            status_code=409,
            detail=f"Robot '{robot_host}' is currently in use.",
        )

    payment_tx = getattr(request.state, "x402_tx_hash", None)
    session = create_session(x_wallet_address, robot_host, payment_tx)

    return PurchaseResponse(
        status="success",
        message=f"Access granted to '{robot_host}' for {settings.session_duration_minutes} minutes",
        session=SessionResponse(
            active=True,
            robot_host=session.robot_host,
            expires_at=session.expires_at,
            remaining_seconds=get_remaining_seconds(x_wallet_address),
        ),
        payment_tx=payment_tx,
    )


@router.get("/status", response_model=SessionResponse)
async def check_access(
    x_wallet_address: Optional[str] = Header(None),
):
    """Check if wallet has active access session."""
    if not x_wallet_address:
        return SessionResponse(active=False)

    session = get_session(x_wallet_address)
    if session is None:
        return SessionResponse(active=False)

    return SessionResponse(
        active=True,
        robot_host=session.robot_host,
        expires_at=session.expires_at,
        remaining_seconds=get_remaining_seconds(x_wallet_address),
    )


@router.get("/config")
async def get_payment_config():
    """Get payment configuration."""
    settings = get_settings()
    return {
        "payment_enabled": settings.payment_enabled,
        "session_duration_minutes": settings.session_duration_minutes,
        "session_price": settings.session_price if settings.payment_enabled else None,
    }
```

---

### Step 8: Robot Router

**app/api/v1/robot.py:**
```python
from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.deps import require_session
from app.schemas.session import CommandResponse, RobotStatusResponse
from app.services.robot import robot_service
from app.services.session import get_robot_lock_holder, get_session_robot, is_robot_available

router = APIRouter()


# Motor commands use robot bound to session (no robot_host param needed)

@router.get("/motor/forward", response_model=CommandResponse)
async def motor_forward(wallet_address: str = Depends(require_session)):
    """Move robot forward. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")

    success = await robot_service.send_motor_command(robot_host, "forward")
    if not success:
        raise HTTPException(status_code=503, detail="Robot motor offline")

    return CommandResponse(status="ok", command="forward")


@router.get("/motor/back", response_model=CommandResponse)
async def motor_back(wallet_address: str = Depends(require_session)):
    """Move robot backward."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")

    success = await robot_service.send_motor_command(robot_host, "back")
    if not success:
        raise HTTPException(status_code=503, detail="Robot motor offline")

    return CommandResponse(status="ok", command="back")


# Similar for /motor/left, /motor/right, /motor/stop


@router.get("/camera/frame")
async def get_camera_frame(wallet_address: str = Depends(require_session)):
    """Get camera frame from robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")

    frame = await robot_service.get_camera_frame(robot_host)
    if frame is None:
        raise HTTPException(status_code=503, detail="Robot camera offline")

    return Response(content=frame, media_type="image/jpeg")


@router.get("/status", response_model=RobotStatusResponse)
async def get_robot_status(
    robot_host: str = Query(..., description="mDNS name or IP address"),
):
    """Check robot status. No session required."""
    status = await robot_service.check_status(robot_host)

    available = is_robot_available(robot_host)
    locked_by = None
    if not available:
        holder = get_robot_lock_holder(robot_host)
        if holder:
            locked_by = f"{holder[:6]}...{holder[-4:]}"

    return RobotStatusResponse(
        robot_host=robot_host,
        motor_online=status["motor_online"],
        motor_ip=status["motor_ip"],
        motor_mdns=status["motor_mdns"],
        camera_online=status["camera_online"],
        camera_ip=status["camera_ip"],
        camera_mdns=status["camera_mdns"],
        available=available,
        locked_by=locked_by,
    )
```

---

### Step 9: Main Application

**app/main.py:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import access, robot
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Tumbller Robot Control API",
        description="Time-based robot access with optional x402 payments",
        version="1.0.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if settings.payment_enabled and settings.payment_address:
        try:
            from x402.fastapi.middleware import require_payment

            app.middleware("http")(
                require_payment(
                    path="/api/v1/access/purchase",
                    price=settings.session_price,
                    pay_to_address=settings.payment_address,
                    network=settings.x402_network,
                )
            )
            print(f"x402 payments ENABLED: {settings.session_price}")
        except ImportError:
            print("WARNING: x402 package not installed.")
    else:
        print("Payment gateway DISABLED. Free access mode.")

    app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
    app.include_router(robot.router, prefix="/api/v1/robot", tags=["Robot"])

    @app.get("/health")
    async def health():
        return {"status": "healthy", "payment_enabled": settings.payment_enabled}

    return app


app = create_app()
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | None | Health check |
| POST | `/api/v1/access/purchase` | x402 (when enabled) | Purchase session for a robot |
| GET | `/api/v1/access/status` | Header | Check session status |
| GET | `/api/v1/access/config` | None | Get payment configuration |
| GET | `/api/v1/robot/motor/{cmd}` | Session | Motor commands (no robot_host needed) |
| GET | `/api/v1/robot/camera/frame` | Session | Get camera frame |
| GET | `/api/v1/robot/status?robot_host=x` | None | Robot status + availability |

---

## Flow

### Purchase Flow
```
1. Frontend: GET /api/v1/robot/status?robot_host=finland-tumbller-01
   → Check if robot is online and available

2. Frontend: POST /api/v1/access/purchase
   Body: {"robot_host": "finland-tumbller-01"}
   Header: X-Wallet-Address: 0x123...
   → (If payment enabled) x402 middleware returns 402
   → Frontend pays, retries with payment header
   → Session created, wallet bound to robot

3. Frontend: GET /api/v1/robot/motor/forward
   Header: X-Wallet-Address: 0x123...
   → Robot moves forward (uses session-bound robot)
```

### Control Flow (after session)
```
GET /api/v1/robot/motor/forward   → Move forward
GET /api/v1/robot/motor/back      → Move backward
GET /api/v1/robot/motor/left      → Turn left
GET /api/v1/robot/motor/right     → Turn right
GET /api/v1/robot/motor/stop      → Stop
GET /api/v1/robot/camera/frame    → Get camera image
```

---

## Running the Server

```bash
# Setup
cd backend-fastapi
uv sync

# Configure
cp .env.example .env
# Edit .env - set PAYMENT_ENABLED=false for testing

# Run
uv run uvicorn app.main:app --reload --port 8000

# Test
curl http://localhost:8000/health
curl "http://localhost:8000/api/v1/robot/status?robot_host=finland-tumbller-01"
curl -X POST http://localhost:8000/api/v1/access/purchase \
  -H "Content-Type: application/json" \
  -H "X-Wallet-Address: 0x123" \
  -d '{"robot_host": "finland-tumbller-01"}'
curl http://localhost:8000/api/v1/robot/motor/forward \
  -H "X-Wallet-Address: 0x123"
```

---

## Resources

- [x402 PyPI](https://pypi.org/project/x402/)
- [FastAPI x402 Integration](https://blockeden.xyz/docs/x402/x402-fastapi/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
