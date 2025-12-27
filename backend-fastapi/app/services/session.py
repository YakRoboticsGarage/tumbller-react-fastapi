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
# Key: wallet_address (lowercase)
_sessions: dict[str, SessionData] = {}

# Track which robots are currently in use
# Key: robot_mdns, Value: wallet_address
_robot_locks: dict[str, str] = {}


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

    # Check if expired
    if datetime.utcnow() > session.expires_at:
        _cleanup_session(wallet_lower)
        return None

    return session


def _cleanup_session(wallet_address: str) -> None:
    """Remove session and release robot lock."""
    wallet_lower = wallet_address.lower()
    session = _sessions.get(wallet_lower)
    if session:
        # Release robot lock
        if session.robot_host in _robot_locks:
            if _robot_locks[session.robot_host] == wallet_lower:
                del _robot_locks[session.robot_host]
        del _sessions[wallet_lower]


def has_valid_session(wallet_address: str) -> bool:
    """Check if wallet has valid active session."""
    return get_session(wallet_address) is not None


def get_remaining_seconds(wallet_address: str) -> int:
    """Get remaining seconds in session."""
    session = get_session(wallet_address)
    if session is None:
        return 0

    remaining = (session.expires_at - datetime.utcnow()).total_seconds()
    return max(0, int(remaining))


def is_robot_available(robot_host: str) -> bool:
    """Check if a robot is available (not locked by another wallet)."""
    robot_lower = robot_host.lower()
    if robot_lower not in _robot_locks:
        return True

    # Check if the lock holder's session is still valid
    lock_holder = _robot_locks[robot_lower]
    if get_session(lock_holder) is None:
        # Session expired, robot is available
        return True

    return False


def get_robot_lock_holder(robot_host: str) -> Optional[str]:
    """Get wallet address that currently has the robot locked."""
    robot_lower = robot_host.lower()
    if robot_lower not in _robot_locks:
        return None

    lock_holder = _robot_locks[robot_lower]
    # Verify session is still valid
    if get_session(lock_holder) is None:
        return None

    return lock_holder


def get_session_robot(wallet_address: str) -> Optional[str]:
    """Get the robot host (mDNS name or IP) bound to this wallet's session."""
    session = get_session(wallet_address)
    if session is None:
        return None
    return session.robot_host
