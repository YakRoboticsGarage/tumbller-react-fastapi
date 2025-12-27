from fastapi import APIRouter, Depends, HTTPException, Query, Response

from app.api.deps import require_session
from app.schemas.session import CommandResponse, RobotStatusResponse
from app.services.robot import robot_service
from app.services.session import get_robot_lock_holder, get_session_robot, is_robot_available

router = APIRouter()


def _mask_wallet(wallet: str) -> str:
    """Mask wallet address for privacy (show first 6 and last 4 chars)."""
    if len(wallet) <= 10:
        return wallet
    return f"{wallet[:6]}...{wallet[-4:]}"


# --- Motor Controls ---


async def execute_motor_command(robot_host: str, command: str) -> CommandResponse:
    """Execute motor command."""
    success = await robot_service.send_motor_command(robot_host, command)
    if not success:
        raise HTTPException(status_code=503, detail="Robot motor offline")

    return CommandResponse(status="ok", command=command)


@router.get("/motor/forward", response_model=CommandResponse)
async def motor_forward(wallet_address: str = Depends(require_session)):
    """Move robot forward. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")
    return await execute_motor_command(robot_host, "forward")


@router.get("/motor/back", response_model=CommandResponse)
async def motor_back(wallet_address: str = Depends(require_session)):
    """Move robot backward. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")
    return await execute_motor_command(robot_host, "back")


@router.get("/motor/left", response_model=CommandResponse)
async def motor_left(wallet_address: str = Depends(require_session)):
    """Turn robot left. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")
    return await execute_motor_command(robot_host, "left")


@router.get("/motor/right", response_model=CommandResponse)
async def motor_right(wallet_address: str = Depends(require_session)):
    """Turn robot right. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")
    return await execute_motor_command(robot_host, "right")


@router.get("/motor/stop", response_model=CommandResponse)
async def motor_stop(wallet_address: str = Depends(require_session)):
    """Stop robot. Uses robot bound to session."""
    robot_host = get_session_robot(wallet_address)
    if not robot_host:
        raise HTTPException(status_code=403, detail="No robot bound to session")
    return await execute_motor_command(robot_host, "stop")


# --- Camera ---


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


# --- Status ---


@router.get("/status", response_model=RobotStatusResponse)
async def get_robot_status(
    robot_host: str = Query(
        ..., description="mDNS name (e.g., finland-tumbller-01) or IP address of the robot"
    ),
):
    """Check robot status (motor + camera). No session required."""
    status = await robot_service.check_status(robot_host)

    # Check availability
    available = is_robot_available(robot_host)
    locked_by = None
    if not available:
        holder = get_robot_lock_holder(robot_host)
        if holder:
            locked_by = _mask_wallet(holder)

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
