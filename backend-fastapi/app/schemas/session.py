from datetime import datetime

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """Response when session is created/checked."""

    active: bool
    robot_host: str | None = None  # mDNS name or IP
    expires_at: datetime | None = None
    remaining_seconds: int | None = None


class PurchaseRequest(BaseModel):
    """Request to purchase access to a robot."""

    robot_host: str  # mDNS name or IP


class PurchaseResponse(BaseModel):
    """Response after purchasing access."""

    status: str
    message: str
    session: SessionResponse
    payment_tx: str | None = None


class CommandResponse(BaseModel):
    """Response for motor commands."""

    status: str
    command: str


class RobotStatusResponse(BaseModel):
    """Response for robot status check."""

    robot_host: str  # mDNS name or IP used to query
    motor_online: bool
    motor_ip: str | None = None
    motor_mdns: str | None = None
    camera_online: bool
    camera_ip: str | None = None
    camera_mdns: str | None = None
    available: bool  # Whether the robot is available for a new session
    locked_by: str | None = None  # Wallet that has it locked (partial, for privacy)
