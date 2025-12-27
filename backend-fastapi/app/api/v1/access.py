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
    x_wallet_address: str = Header(..., description="Wallet address that paid"),
):
    """
    Purchase robot access session.

    When PAYMENT_ENABLED=true: Requires x402 payment.
    When PAYMENT_ENABLED=false: Creates session without payment (for testing).

    Binds the wallet to a specific robot for the session duration.
    Only one wallet can control a robot at a time.
    """
    settings = get_settings()
    robot_host = body.robot_host

    # Check if robot is online (motor must be online)
    motor_online = await robot_service.check_motor_online(robot_host)
    if not motor_online:
        raise HTTPException(
            status_code=503,
            detail=f"Robot '{robot_host}' is offline. Cannot create session.",
        )

    # Check if robot is available
    if not is_robot_available(robot_host):
        raise HTTPException(
            status_code=409,
            detail=f"Robot '{robot_host}' is currently in use by another user.",
        )

    # Get payment tx from request state (set by x402 middleware when enabled)
    payment_tx = getattr(request.state, "x402_tx_hash", None)

    # Create session binding wallet to robot
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
    x_wallet_address: Optional[str] = Header(None, description="Wallet address to check"),
):
    """Check if wallet has active access session."""
    settings = get_settings()

    if not x_wallet_address:
        return SessionResponse(active=False)

    # If payment is disabled, report as always active (but still check for robot binding)
    if not settings.payment_enabled:
        session = get_session(x_wallet_address)
        if session:
            return SessionResponse(
                active=True,
                robot_host=session.robot_host,
                expires_at=session.expires_at,
                remaining_seconds=get_remaining_seconds(x_wallet_address),
            )
        # No session yet but payment disabled - can't be "active" without a robot
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
    """Get payment configuration (for frontend to know if payments are enabled)."""
    settings = get_settings()
    return {
        "payment_enabled": settings.payment_enabled,
        "session_duration_minutes": settings.session_duration_minutes,
        "session_price": settings.session_price if settings.payment_enabled else None,
    }
