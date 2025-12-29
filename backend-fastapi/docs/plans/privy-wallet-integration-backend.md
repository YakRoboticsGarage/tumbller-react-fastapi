# Backend Plan: Privy Wallet Integration for Robot Wallets

> **Purpose**: Add database-backed robot wallet management using Privy server wallets.
> **Status**: DRAFT - Pending approval

---

## Overview

Replace hardcoded payment addresses with per-robot wallet management:
1. Store robot configurations (including wallet addresses) in SQLite (migrateable to PostgreSQL)
2. Integrate Privy server wallets API to create wallets for robots
3. Add endpoint to send wallet address to robot hardware via HTTP POST
4. Modify x402 payment flow to use robot-specific wallet addresses
5. Add `owner_wallet` field for robot owners to collect earnings
6. Add endpoint to transfer robot earnings to owner wallet
7. Check robot's `/info` endpoint to get mDNS name and detect if robot already exists in database

---

## Current State

- Payment address is hardcoded in `.env` (`PAYMENT_ADDRESS`)
- No database - all state is in-memory (session.py uses Python dicts)
- Robot info (host, IP) comes from frontend per-request
- x402 middleware uses single `payment_address` from settings

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Request                          │
│  POST /api/v1/robots  { name, motor_ip, camera_ip, wallet?,     │
│                         owner_wallet? }                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Robot Registration API                        │
│  1. GET http://{motor_ip}/info → get robot's mDNS name          │
│  2. Check database for existing robot with same mDNS name       │
│     → If found, return existing robot (reuse wallet)            │
│  3. If user provided wallet → use it (user_provided)            │
│  4. Else → call Privy API to create one (privy_created)         │
│  5. Store robot in SQLite database                              │
│  6. POST wallet address to robot: http://{motor_ip}/wallet      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLite Database                             │
│  robots table:                                                   │
│    - id (UUID, PK)                                              │
│    - name (str, unique)                                         │
│    - motor_ip (str)                                             │
│    - camera_ip (str)                                            │
│    - motor_mdns (str, unique, nullable) -- from /info endpoint  │
│    - camera_mdns (str, nullable)                                │
│    - wallet_address (str)                                       │
│    - wallet_source (enum: 'user_provided' | 'privy_created')   │
│    - privy_wallet_id (str, nullable) -- for Privy-created      │
│    - owner_wallet (str, nullable) -- owner's wallet for payouts│
│    - created_at (datetime)                                      │
│    - updated_at (datetime)                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Owner Payout Flow                             │
│  POST /api/v1/robots/{id}/payout                                │
│  1. Get robot's Privy wallet balance                            │
│  2. Transfer funds to owner_wallet via Privy RPC                │
│  3. Return transaction hash                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    x402 Payment Flow                             │
│  1. GET /api/v1/access/purchase?robot_host=...                  │
│  2. Look up robot by host → get wallet_address                  │
│  3. x402 middleware uses robot's wallet as pay_to_address       │
│  4. Payment goes to robot-specific wallet                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Database Setup

#### 1.1 Add SQLAlchemy + Alembic Dependencies

**File**: `pyproject.toml`

```toml
[project.dependencies]
# ... existing
sqlalchemy = ">=2.0.0"
alembic = ">=1.13.0"
aiosqlite = ">=0.19.0"  # Async SQLite driver
```

#### 1.2 Create Database Configuration

**File**: `app/core/database.py` (NEW)

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# SQLite for now, Postgres later
# SQLite: sqlite+aiosqlite:///./robots.db
# Postgres: postgresql+asyncpg://user:pass@host/db
DATABASE_URL = settings.database_url

engine = create_async_engine(DATABASE_URL, echo=settings.debug)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with async_session_maker() as session:
        yield session
```

#### 1.3 Add Database URL to Settings

**File**: `app/core/config.py` (MODIFY)

```python
class Settings(BaseSettings):
    # ... existing fields

    # Database
    database_url: str = "sqlite+aiosqlite:///./robots.db"

    # Privy API
    privy_app_id: str = ""
    privy_app_secret: str = ""
```

#### 1.4 Create Robot Model

**File**: `app/models/robot.py` (NEW)

```python
from datetime import UTC, datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import DateTime, Enum as SQLEnum, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WalletSource(str, Enum):
    USER_PROVIDED = "user_provided"
    PRIVY_CREATED = "privy_created"


class Robot(Base):
    __tablename__ = "robots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    motor_ip: Mapped[str] = mapped_column(String(45))  # IPv6 max length
    camera_ip: Mapped[str] = mapped_column(String(45))
    motor_mdns: Mapped[str | None] = mapped_column(String(253), nullable=True)
    camera_mdns: Mapped[str | None] = mapped_column(String(253), nullable=True)
    wallet_address: Mapped[str] = mapped_column(String(42), index=True)  # 0x + 40 hex chars
    wallet_source: Mapped[WalletSource] = mapped_column(SQLEnum(WalletSource))
    privy_wallet_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Owner wallet: can be address (42 chars), ENS name, or Base name (up to 253 chars)
    owner_wallet: Mapped[str | None] = mapped_column(String(253), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC)
    )
```

#### 1.5 Initialize Alembic

```bash
cd backend-fastapi
uv run alembic init alembic
```

**File**: `alembic/env.py` (MODIFY)

```python
from app.core.database import Base
from app.models.robot import Robot  # Import all models

target_metadata = Base.metadata
```

**File**: `alembic.ini` (MODIFY)

```ini
sqlalchemy.url = sqlite+aiosqlite:///./robots.db
```

Generate initial migration:
```bash
uv run alembic revision --autogenerate -m "Create robots table"
uv run alembic upgrade head
```

---

### Phase 2: Privy Integration

#### 2.1 Create Privy Service

**File**: `app/services/privy.py` (NEW)

```python
import base64
from dataclasses import dataclass

import httpx

from app.core.config import get_settings


@dataclass
class PrivyWallet:
    id: str
    address: str
    chain_type: str


class PrivyService:
    """Service for Privy server wallet API."""

    BASE_URL = "https://api.privy.io/v1"

    def __init__(self) -> None:
        settings = get_settings()
        self.app_id = settings.privy_app_id
        self.app_secret = settings.privy_app_secret
        self._client: httpx.AsyncClient | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.app_id and self.app_secret)

    def _get_headers(self) -> dict[str, str]:
        credentials = base64.b64encode(
            f"{self.app_id}:{self.app_secret}".encode()
        ).decode()
        return {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
            "privy-app-id": self.app_id,
        }

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers=self._get_headers(),
                timeout=30.0,
            )
        return self._client

    async def create_wallet(self, chain_type: str = "ethereum") -> PrivyWallet:
        """Create a new server wallet via Privy API."""
        if not self.is_configured:
            raise ValueError("Privy API credentials not configured")

        client = await self._get_client()
        response = await client.post(
            "/wallets",
            json={"chain_type": chain_type}
        )
        response.raise_for_status()

        data = response.json()
        return PrivyWallet(
            id=data["id"],
            address=data["address"],
            chain_type=data["chain_type"],
        )

    async def get_wallet(self, wallet_id: str) -> PrivyWallet | None:
        """Get wallet by Privy wallet ID."""
        if not self.is_configured:
            return None

        client = await self._get_client()
        response = await client.get(f"/wallets/{wallet_id}")

        if response.status_code == 404:
            return None
        response.raise_for_status()

        data = response.json()
        return PrivyWallet(
            id=data["id"],
            address=data["address"],
            chain_type=data["chain_type"],
        )

    async def send_transaction(
        self,
        wallet_id: str,
        to_address: str,
        amount_wei: str,
        chain_id: int = 84532,  # Base Sepolia
    ) -> str:
        """Send ETH/native token from Privy wallet to destination.

        Returns transaction hash.
        """
        if not self.is_configured:
            raise ValueError("Privy API credentials not configured")

        client = await self._get_client()
        response = await client.post(
            f"/wallets/{wallet_id}/rpc",
            json={
                "method": "eth_sendTransaction",
                "params": {
                    "transaction": {
                        "to": to_address,
                        "value": amount_wei,
                        "chainId": chain_id,
                    }
                }
            }
        )
        response.raise_for_status()
        data = response.json()
        return data.get("hash", data.get("transactionHash"))

    async def get_balance(self, wallet_address: str, chain_id: int = 84532) -> int:
        """Get balance of wallet in wei (via public RPC, not Privy)."""
        # Use public RPC for balance check
        import httpx
        rpc_urls = {
            84532: "https://sepolia.base.org",  # Base Sepolia
            8453: "https://mainnet.base.org",   # Base Mainnet
        }
        rpc_url = rpc_urls.get(chain_id, rpc_urls[84532])

        async with httpx.AsyncClient() as client:
            response = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "eth_getBalance",
                    "params": [wallet_address, "latest"],
                    "id": 1,
                }
            )
            data = response.json()
            return int(data["result"], 16)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
privy_service = PrivyService()
```

---

### Phase 3: Robot CRUD API

#### 3.1 Create Robot Schemas

**File**: `app/schemas/robot.py` (NEW)

```python
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class WalletSource(str, Enum):
    USER_PROVIDED = "user_provided"
    PRIVY_CREATED = "privy_created"


def validate_eth_address(v: str | None) -> str | None:
    """Validate and normalize Ethereum address."""
    if v is None:
        return None
    v = v.strip().lower()
    if not v.startswith("0x") or len(v) != 42:
        raise ValueError("Invalid Ethereum address format")
    return v


def validate_wallet_or_name(v: str | None) -> str | None:
    """Validate wallet address, ENS name, or Base name.

    Accepts:
    - Plain address: 0x1234...
    - ENS name: vitalik.eth
    - Base name: name.base.eth
    """
    if v is None:
        return None
    v = v.strip()
    # Plain address
    if v.startswith("0x"):
        if len(v) != 42:
            raise ValueError("Invalid Ethereum address format")
        return v.lower()
    # ENS/Base name (contains dot, no 0x prefix)
    if "." in v:
        return v.lower()
    raise ValueError("Must be a valid address (0x...) or name (*.eth, *.base.eth)")


class RobotCreate(BaseModel):
    """Request to create a new robot."""
    name: str = Field(..., min_length=1, max_length=100)
    motor_ip: str = Field(..., pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    camera_ip: str = Field(..., pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    motor_mdns: str | None = Field(None, max_length=253)
    camera_mdns: str | None = Field(None, max_length=253)
    wallet_address: str | None = Field(None, description="User-provided wallet address (optional)")
    owner_wallet: str | None = Field(
        None,
        description="Owner's wallet/ENS/Base name for collecting earnings (e.g., 0x..., name.eth, name.base.eth)"
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_robot_wallet(cls, v: str | None) -> str | None:
        return validate_eth_address(v)

    @field_validator("owner_wallet")
    @classmethod
    def validate_owner_wallet(cls, v: str | None) -> str | None:
        return validate_wallet_or_name(v)


class RobotUpdate(BaseModel):
    """Request to update a robot."""
    name: str | None = Field(None, min_length=1, max_length=100)
    motor_ip: str | None = Field(None, pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    camera_ip: str | None = Field(None, pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    motor_mdns: str | None = None
    camera_mdns: str | None = None
    owner_wallet: str | None = Field(
        None,
        description="Owner's wallet/ENS/Base name for collecting earnings"
    )

    @field_validator("owner_wallet")
    @classmethod
    def validate_owner_wallet(cls, v: str | None) -> str | None:
        return validate_wallet_or_name(v)


class RobotResponse(BaseModel):
    """Robot details response."""
    id: str
    name: str
    motor_ip: str
    camera_ip: str
    motor_mdns: str | None
    camera_mdns: str | None
    wallet_address: str
    wallet_source: WalletSource
    owner_wallet: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RobotListResponse(BaseModel):
    """List of robots."""
    robots: list[RobotResponse]
    total: int


class PayoutRequest(BaseModel):
    """Request to transfer robot earnings to owner."""
    amount_wei: str | None = Field(None, description="Amount to transfer in wei. If not specified, transfers all.")


class PayoutResponse(BaseModel):
    """Payout transaction result."""
    status: str
    transaction_hash: str | None
    amount_wei: str
    from_wallet: str
    to_wallet: str
```

#### 3.2 Create Robot Service

**File**: `app/services/robot_wallet.py` (NEW)

```python
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robot import Robot, WalletSource
from app.schemas.robot import RobotCreate, RobotUpdate, PayoutResponse
from app.services.privy import privy_service


class RobotWalletService:
    """Service for robot CRUD with wallet management."""

    async def _get_robot_info(self, motor_ip: str) -> dict | None:
        """GET /info from robot to retrieve mDNS name.

        Returns dict with robot info or None if unreachable.
        Expected response: { "mdns": "tumbller-01", "version": "1.0.0", ... }
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"http://{motor_ip}/info")
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None

    async def get_robot_by_mdns(self, db: AsyncSession, mdns: str) -> Robot | None:
        """Get robot by mDNS name."""
        result = await db.execute(
            select(Robot).where(Robot.motor_mdns == mdns.lower())
        )
        return result.scalar_one_or_none()

    async def create_robot(self, db: AsyncSession, data: RobotCreate) -> tuple[Robot, bool]:
        """Create a new robot, optionally creating a Privy wallet.

        Returns (robot, is_existing) tuple.
        If robot with same mDNS exists, returns existing robot with is_existing=True.
        """

        # Step 1: Get robot info to check mDNS
        robot_info = await self._get_robot_info(data.motor_ip)
        robot_mdns = robot_info.get("mdns") if robot_info else data.motor_mdns

        # Step 2: Check if robot with this mDNS already exists
        if robot_mdns:
            existing_robot = await self.get_robot_by_mdns(db, robot_mdns)
            if existing_robot:
                # Update IP addresses if changed (robot might have new IP)
                if existing_robot.motor_ip != data.motor_ip or existing_robot.camera_ip != data.camera_ip:
                    existing_robot.motor_ip = data.motor_ip
                    existing_robot.camera_ip = data.camera_ip
                    if data.owner_wallet:
                        existing_robot.owner_wallet = data.owner_wallet
                    await db.commit()
                    await db.refresh(existing_robot)
                    # Re-sync wallet to robot
                    await self._send_wallet_to_robot(existing_robot)
                return existing_robot, True  # Return existing robot

        # Step 3: Determine wallet source and address
        if data.wallet_address:
            wallet_address = data.wallet_address
            wallet_source = WalletSource.USER_PROVIDED
            privy_wallet_id = None
        else:
            # Create wallet via Privy
            privy_wallet = await privy_service.create_wallet(chain_type="ethereum")
            wallet_address = privy_wallet.address.lower()
            wallet_source = WalletSource.PRIVY_CREATED
            privy_wallet_id = privy_wallet.id

        # Step 4: Create robot record
        robot = Robot(
            name=data.name,
            motor_ip=data.motor_ip,
            camera_ip=data.camera_ip,
            motor_mdns=robot_mdns.lower() if robot_mdns else None,
            camera_mdns=data.camera_mdns,
            wallet_address=wallet_address,
            wallet_source=wallet_source,
            privy_wallet_id=privy_wallet_id,
            owner_wallet=data.owner_wallet,
        )

        db.add(robot)
        await db.commit()
        await db.refresh(robot)

        # Step 5: Send wallet address to robot hardware
        await self._send_wallet_to_robot(robot)

        return robot, False

    async def _send_wallet_to_robot(self, robot: Robot) -> bool:
        """POST wallet address to robot's motor controller."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"http://{robot.motor_ip}/wallet",
                    json={"wallet_address": robot.wallet_address},
                )
                return response.status_code == 200
        except Exception:
            # Robot may not support this endpoint yet - log but don't fail
            return False

    async def get_robot(self, db: AsyncSession, robot_id: str) -> Robot | None:
        """Get robot by ID."""
        result = await db.execute(select(Robot).where(Robot.id == robot_id))
        return result.scalar_one_or_none()

    async def get_robot_by_name(self, db: AsyncSession, name: str) -> Robot | None:
        """Get robot by name."""
        result = await db.execute(select(Robot).where(Robot.name == name))
        return result.scalar_one_or_none()

    async def get_robot_by_host(self, db: AsyncSession, host: str) -> Robot | None:
        """Get robot by motor IP or mDNS name."""
        host_lower = host.lower()
        result = await db.execute(
            select(Robot).where(
                (Robot.motor_ip == host_lower) |
                (Robot.motor_mdns == host_lower)
            )
        )
        return result.scalar_one_or_none()

    async def list_robots(self, db: AsyncSession) -> list[Robot]:
        """List all robots."""
        result = await db.execute(select(Robot).order_by(Robot.created_at.desc()))
        return list(result.scalars().all())

    async def update_robot(self, db: AsyncSession, robot_id: str, data: RobotUpdate) -> Robot | None:
        """Update robot details (not wallet, but owner_wallet can be updated)."""
        robot = await self.get_robot(db, robot_id)
        if not robot:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(robot, field, value)

        await db.commit()
        await db.refresh(robot)
        return robot

    async def delete_robot(self, db: AsyncSession, robot_id: str) -> bool:
        """Delete a robot."""
        robot = await self.get_robot(db, robot_id)
        if not robot:
            return False

        await db.delete(robot)
        await db.commit()
        return True

    async def _resolve_to_address(self, wallet_or_name: str) -> str:
        """Resolve ENS/Base name to address, or return address as-is.

        Supports:
        - Plain address: 0x1234... → 0x1234...
        - ENS name: vitalik.eth → resolved address
        - Base name: name.base.eth → resolved address
        """
        if wallet_or_name.startswith("0x"):
            return wallet_or_name

        # Import ENS resolver (already exists in app/core/ens.py)
        from app.core.ens import resolve_ens_name

        resolved = await resolve_ens_name(wallet_or_name)
        if not resolved:
            raise ValueError(f"Could not resolve name: {wallet_or_name}")
        return resolved

    async def payout_to_owner(
        self,
        db: AsyncSession,
        robot_id: str,
        amount_wei: str | None = None,
    ) -> PayoutResponse:
        """Transfer funds from robot's Privy wallet to owner's wallet.

        Only works for Privy-created wallets.
        Owner wallet can be address, ENS name, or Base name.
        """
        robot = await self.get_robot(db, robot_id)
        if not robot:
            raise ValueError("Robot not found")

        if not robot.owner_wallet:
            raise ValueError("No owner wallet configured for this robot")

        if robot.wallet_source != WalletSource.PRIVY_CREATED:
            raise ValueError("Payout only supported for Privy-created wallets")

        if not robot.privy_wallet_id:
            raise ValueError("Missing Privy wallet ID")

        # Resolve owner wallet (ENS/Base name → address)
        owner_address = await self._resolve_to_address(robot.owner_wallet)

        # Get current balance if amount not specified
        if amount_wei is None:
            balance = await privy_service.get_balance(robot.wallet_address)
            if balance == 0:
                return PayoutResponse(
                    status="no_funds",
                    transaction_hash=None,
                    amount_wei="0",
                    from_wallet=robot.wallet_address,
                    to_wallet=robot.owner_wallet,
                )
            # Leave some gas for future transactions (0.001 ETH)
            gas_reserve = 1000000000000000  # 0.001 ETH in wei
            amount_wei = str(max(0, balance - gas_reserve))

        if int(amount_wei) <= 0:
            return PayoutResponse(
                status="insufficient_funds",
                transaction_hash=None,
                amount_wei="0",
                from_wallet=robot.wallet_address,
                to_wallet=robot.owner_wallet,
            )

        # Send transaction via Privy (use resolved address)
        tx_hash = await privy_service.send_transaction(
            wallet_id=robot.privy_wallet_id,
            to_address=owner_address,
            amount_wei=amount_wei,
        )

        return PayoutResponse(
            status="success",
            transaction_hash=tx_hash,
            amount_wei=amount_wei,
            from_wallet=robot.wallet_address,
            to_wallet=robot.owner_wallet,  # Return original name/address
        )


robot_wallet_service = RobotWalletService()
```

#### 3.3 Create Robot API Endpoints

**File**: `app/api/v1/robots.py` (NEW)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.robot import (
    RobotCreate,
    RobotListResponse,
    RobotResponse,
    RobotUpdate,
    PayoutRequest,
    PayoutResponse,
)
from app.services.robot_wallet import robot_wallet_service

router = APIRouter(prefix="/robots", tags=["robots"])


@router.post("", response_model=RobotResponse)
async def create_robot(
    data: RobotCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new robot.

    - Checks robot's /info endpoint to get mDNS name
    - If robot with same mDNS exists, returns existing robot (200 OK)
    - If wallet_address not provided, creates new wallet via Privy
    - Sends wallet address to robot's motor controller
    """
    # Check for duplicate name
    existing_by_name = await robot_wallet_service.get_robot_by_name(db, data.name)
    if existing_by_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Robot with name '{data.name}' already exists",
        )

    robot, is_existing = await robot_wallet_service.create_robot(db, data)

    if is_existing:
        # Return 200 OK for existing robot (not 201 Created)
        return JSONResponse(
            content=RobotResponse.model_validate(robot).model_dump(mode="json"),
            status_code=status.HTTP_200_OK,
            headers={"X-Robot-Existing": "true"},
        )

    return JSONResponse(
        content=RobotResponse.model_validate(robot).model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )


@router.get("", response_model=RobotListResponse)
async def list_robots(db: AsyncSession = Depends(get_db)):
    """List all registered robots."""
    robots = await robot_wallet_service.list_robots(db)
    return RobotListResponse(robots=robots, total=len(robots))


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(robot_id: str, db: AsyncSession = Depends(get_db)):
    """Get robot by ID."""
    robot = await robot_wallet_service.get_robot(db, robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )
    return robot


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    robot_id: str,
    data: RobotUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update robot details (name, IPs, mDNS, owner_wallet). Robot wallet cannot be changed."""
    robot = await robot_wallet_service.update_robot(db, robot_id, data)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )
    return robot


@router.delete("/{robot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_robot(robot_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a robot."""
    deleted = await robot_wallet_service.delete_robot(db, robot_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )


@router.post("/{robot_id}/sync-wallet", response_model=dict)
async def sync_wallet_to_robot(robot_id: str, db: AsyncSession = Depends(get_db)):
    """Re-send wallet address to robot hardware."""
    robot = await robot_wallet_service.get_robot(db, robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )

    success = await robot_wallet_service._send_wallet_to_robot(robot)
    return {
        "status": "success" if success else "failed",
        "message": "Wallet address sent to robot" if success else "Failed to send wallet to robot",
    }


@router.post("/{robot_id}/payout", response_model=PayoutResponse)
async def payout_to_owner(
    robot_id: str,
    data: PayoutRequest = PayoutRequest(),
    db: AsyncSession = Depends(get_db),
):
    """
    Transfer funds from robot's wallet to owner's wallet.

    - Only works for Privy-created wallets
    - Requires owner_wallet to be set on the robot
    - If amount_wei not specified, transfers all funds (minus gas reserve)
    """
    try:
        result = await robot_wallet_service.payout_to_owner(
            db, robot_id, data.amount_wei
        )
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
```

---

### Phase 4: Modify x402 Payment Flow

#### 4.1 Update Access Endpoint

**File**: `app/api/v1/access.py` (MODIFY)

```python
# Add import
from app.services.robot_wallet import robot_wallet_service

# Modify purchase endpoint to use robot's wallet
@router.post("/purchase", response_model=PurchaseResponse)
async def purchase_access(
    request: Request,
    purchase: PurchaseRequest,
    wallet_address: str = Depends(require_wallet_header),
    db: AsyncSession = Depends(get_db),  # Add DB dependency
):
    """Purchase robot access time."""

    # Look up robot to get its wallet address
    robot = await robot_wallet_service.get_robot_by_host(db, purchase.robot_host)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Robot '{purchase.robot_host}' not registered. Register it first via POST /api/v1/robots",
        )

    # Payment goes to robot's wallet (set in x402 middleware dynamically)
    # Store robot wallet in request state for middleware
    request.state.robot_wallet = robot.wallet_address

    # ... rest of existing logic
```

#### 4.2 Dynamic Payment Address in Middleware

**File**: `app/main.py` (MODIFY)

The x402 middleware needs modification to support dynamic payment addresses per-robot. This requires a custom approach since the standard middleware uses a single address.

**Option A**: Pre-route lookup (add before x402 middleware)
```python
@app.middleware("http")
async def set_robot_payment_address(request: Request, call_next):
    """Set payment address based on robot_host in request."""
    if request.url.path == "/api/v1/access/purchase" and request.method == "POST":
        # Parse request body to get robot_host
        body = await request.body()
        data = json.loads(body)
        robot_host = data.get("robot_host")

        async with async_session_maker() as db:
            robot = await robot_wallet_service.get_robot_by_host(db, robot_host)
            if robot:
                request.state.payment_address = robot.wallet_address

    return await call_next(request)
```

**Option B**: Remove global x402 middleware, apply per-endpoint (recommended for flexibility).

---

### Phase 5: Register Router

**File**: `app/main.py` (MODIFY)

```python
from app.api.v1 import access, robot, robots  # Add robots

# Add to routers
app.include_router(robots.router, prefix="/api/v1")
```

---

## Environment Variables

Add to `.env`:

```env
# Database
DATABASE_URL=sqlite+aiosqlite:///./robots.db

# Privy API (for wallet creation)
PRIVY_APP_ID=your-app-id
PRIVY_APP_SECRET=your-app-secret

# Remove or make optional
# PAYMENT_ADDRESS=  # No longer needed - each robot has its own wallet
```

---

## API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/robots` | Register robot (creates wallet if not provided, checks /info for mDNS) |
| GET | `/api/v1/robots` | List all robots |
| GET | `/api/v1/robots/{id}` | Get robot details |
| PATCH | `/api/v1/robots/{id}` | Update robot (name, IPs, owner_wallet) |
| DELETE | `/api/v1/robots/{id}` | Delete robot |
| POST | `/api/v1/robots/{id}/sync-wallet` | Re-send wallet to hardware |
| POST | `/api/v1/robots/{id}/payout` | Transfer robot earnings to owner wallet |

---

## Migration Path: SQLite → PostgreSQL

1. Change `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost/tumbller
   ```

2. Add `asyncpg` dependency:
   ```toml
   asyncpg = ">=0.29.0"
   ```

3. Run migrations on new database:
   ```bash
   uv run alembic upgrade head
   ```

No code changes required - SQLAlchemy handles the abstraction.

---

## Testing Plan

1. **Unit tests**: Mock Privy API, test service methods
2. **Integration tests**: Use SQLite in-memory database
3. **E2E tests**: Full flow with test Privy credentials

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `pyproject.toml` | MODIFY | Add sqlalchemy, alembic, aiosqlite |
| `app/core/config.py` | MODIFY | Add database_url, privy credentials |
| `app/core/database.py` | CREATE | Database engine and session |
| `app/models/__init__.py` | CREATE | Model exports |
| `app/models/robot.py` | CREATE | Robot SQLAlchemy model |
| `app/schemas/robot.py` | CREATE | Pydantic schemas |
| `app/services/privy.py` | CREATE | Privy API client |
| `app/services/robot_wallet.py` | CREATE | Robot CRUD service |
| `app/api/v1/robots.py` | CREATE | Robot CRUD endpoints |
| `app/api/v1/access.py` | MODIFY | Use robot wallet for payment |
| `app/main.py` | MODIFY | Register robots router, dynamic payment |
| `alembic/` | CREATE | Migrations directory |
| `tests/test_robots.py` | CREATE | Robot API tests |

---

## Open Questions

1. **Privy fallback**: What if Privy is down when creating a robot? (Defer for later)
2. **USDC transfers**: Current payout implementation transfers native ETH. For USDC, need ERC-20 transfer via Privy RPC.
3. **Gas funding**: Robot wallets need ETH for gas. Consider auto-funding mechanism.

---

## References

- [Privy Server Wallets - Create](https://docs.privy.io/guide/server-wallets/create)
- [Privy API Reference](https://docs.privy.io/api-reference/wallets/create)
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
