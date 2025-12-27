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

    robot_host: str  # mDNS name or IP used to query
    motor_online: bool
    motor_ip: Optional[str] = None
    motor_mdns: Optional[str] = None
    camera_online: bool
    camera_ip: Optional[str] = None
    camera_mdns: Optional[str] = None
    available: bool  # Whether the robot is available for a new session
    locked_by: Optional[str] = None  # Wallet that has it locked (partial, for privacy)
