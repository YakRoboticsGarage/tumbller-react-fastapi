"""Robot model for database storage."""

from datetime import UTC, datetime
from enum import Enum
from uuid import uuid4

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class WalletSource(str, Enum):
    """Source of the robot's wallet."""

    USER_PROVIDED = "user_provided"
    PRIVY_CREATED = "privy_created"


class Robot(Base):
    """Robot entity with wallet information."""

    __tablename__ = "robots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    motor_ip: Mapped[str] = mapped_column(String(45))  # IPv6 max length
    camera_ip: Mapped[str] = mapped_column(String(45))
    motor_mdns: Mapped[str | None] = mapped_column(String(253), nullable=True, unique=True)
    camera_mdns: Mapped[str | None] = mapped_column(String(253), nullable=True)
    # Active wallet (the one currently used for receiving payments)
    wallet_address: Mapped[str] = mapped_column(String(42), index=True)  # 0x + 40 hex chars
    wallet_source: Mapped[WalletSource] = mapped_column(SQLEnum(WalletSource))
    # User-provided wallet (preserved, can switch back to this)
    user_wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    # Privy-managed wallet (created on upgrade, preserved for switching)
    privy_wallet_address: Mapped[str | None] = mapped_column(String(42), nullable=True)
    privy_wallet_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Owner wallet: can be address (42 chars), ENS name, or Base name (up to 253 chars)
    owner_wallet: Mapped[str | None] = mapped_column(String(253), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    @property
    def is_deleted(self) -> bool:
        """Check if robot is soft-deleted."""
        return self.deleted_at is not None

    def __repr__(self) -> str:
        return f"<Robot(id={self.id}, name={self.name}, wallet={self.wallet_address})>"
