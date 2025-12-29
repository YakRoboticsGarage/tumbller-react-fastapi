"""Pydantic schemas for robot API."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class WalletSource(str, Enum):
    """Source of the robot's wallet."""

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
    """Request to create/register a new robot."""

    name: str = Field(..., min_length=1, max_length=100)
    motor_ip: str = Field(..., pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    camera_ip: str = Field(..., pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    wallet_address: str | None = Field(
        None, description="User-provided wallet address (optional)"
    )
    owner_wallet: str | None = Field(
        None,
        description="Owner's wallet/ENS/Base name for collecting earnings",
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_robot_wallet(cls, v: str | None) -> str | None:
        return validate_eth_address(v)

    @field_validator("owner_wallet")
    @classmethod
    def validate_owner(cls, v: str | None) -> str | None:
        return validate_wallet_or_name(v)


class RobotUpdate(BaseModel):
    """Request to update a robot."""

    name: str | None = Field(None, min_length=1, max_length=100)
    motor_ip: str | None = Field(None, pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    camera_ip: str | None = Field(None, pattern=r"^(\d{1,3}\.){3}\d{1,3}$")
    wallet_address: str | None = Field(
        None,
        description="Robot wallet address (only updatable for user-provided wallets)",
    )
    owner_wallet: str | None = Field(
        None,
        description="Owner's wallet/ENS/Base name for collecting earnings",
    )

    @field_validator("wallet_address")
    @classmethod
    def validate_robot_wallet(cls, v: str | None) -> str | None:
        return validate_eth_address(v)

    @field_validator("owner_wallet")
    @classmethod
    def validate_owner(cls, v: str | None) -> str | None:
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
    user_wallet_address: str | None  # Original user wallet (if any)
    privy_wallet_address: str | None  # Privy wallet (if created)
    owner_wallet: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WalletSwitchRequest(BaseModel):
    """Request to switch active wallet."""

    wallet_type: WalletSource  # Which wallet to activate


class WalletUpgradeResponse(BaseModel):
    """Response after creating/switching wallet."""

    wallet_address: str
    wallet_source: WalletSource
    user_wallet_address: str | None
    privy_wallet_address: str | None
    message: str


class RobotListResponse(BaseModel):
    """List of robots."""

    robots: list[RobotResponse]
    total: int


class PayoutRequest(BaseModel):
    """Request to transfer robot USDC earnings to owner."""

    amount_usdc: str | None = Field(
        None,
        description="Amount to transfer in USDC smallest units (6 decimals). If not specified, transfers all.",
    )


class PayoutResponse(BaseModel):
    """Payout transaction result."""

    status: str
    transaction_hash: str | None
    amount_usdc: str  # Amount in USDC smallest units (6 decimals)
    from_wallet: str
    to_wallet: str


class WalletBalanceResponse(BaseModel):
    """Wallet balance response."""

    wallet_address: str
    eth_balance_wei: str
    eth_balance: str
    usdc_balance_raw: str  # USDC in smallest units (6 decimals)
    usdc_balance: str  # Formatted USDC


class GasFundingInfoResponse(BaseModel):
    """Information for funding a wallet with gas (ETH)."""

    eth_price_usd: float
    usd_amount: float  # Amount in USD to fund
    eth_amount_wei: str  # Amount in wei to send
    eth_amount: str  # Human-readable ETH amount
