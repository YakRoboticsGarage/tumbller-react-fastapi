"""Robot CRUD API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.robot import (
    GasFundingInfoResponse,
    PayoutRequest,
    PayoutResponse,
    RobotCreate,
    RobotListResponse,
    RobotResponse,
    RobotUpdate,
    WalletBalanceResponse,
    WalletSwitchRequest,
    WalletUpgradeResponse,
)
from app.services.privy import privy_service
from app.services.robot_wallet import robot_wallet_service

router = APIRouter(prefix="/robots", tags=["robots"])


@router.post("", response_model=RobotResponse, status_code=status.HTTP_201_CREATED)
async def create_robot(
    data: RobotCreate,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Register a new robot.

    - Checks robot's /info endpoint to get mDNS name
    - If robot with same mDNS exists (active), returns existing robot (200 OK)
    - If robot with same mDNS was deleted, reactivates it with same wallet (200 OK)
    - If wallet_address not provided, creates new wallet via Privy
    - Sends wallet address to robot's motor controller
    """
    # Check for duplicate name (only among active robots)
    existing_by_name = await robot_wallet_service.get_robot_by_name(db, data.name)
    if existing_by_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Robot with name '{data.name}' already exists",
        )

    try:
        robot, is_existing, was_reactivated = await robot_wallet_service.create_robot(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    response_data = RobotResponse.model_validate(robot).model_dump(mode="json")

    if is_existing:
        # Return 200 OK for existing active robot
        return JSONResponse(
            content=response_data,
            status_code=status.HTTP_200_OK,
            headers={"X-Robot-Existing": "true"},
        )

    if was_reactivated:
        # Return 200 OK for reactivated robot (was deleted, now restored)
        return JSONResponse(
            content=response_data,
            status_code=status.HTTP_200_OK,
            headers={"X-Robot-Reactivated": "true"},
        )

    return JSONResponse(
        content=response_data,
        status_code=status.HTTP_201_CREATED,
    )


@router.get("", response_model=RobotListResponse)
async def list_robots(db: AsyncSession = Depends(get_db)) -> RobotListResponse:
    """List all registered robots."""
    robots = await robot_wallet_service.list_robots(db)
    return RobotListResponse(robots=robots, total=len(robots))


@router.get("/{robot_id}", response_model=RobotResponse)
async def get_robot(robot_id: str, db: AsyncSession = Depends(get_db)) -> RobotResponse:
    """Get robot by ID."""
    robot = await robot_wallet_service.get_robot(db, robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )
    return RobotResponse.model_validate(robot)


@router.patch("/{robot_id}", response_model=RobotResponse)
async def update_robot(
    robot_id: str,
    data: RobotUpdate,
    db: AsyncSession = Depends(get_db),
) -> RobotResponse:
    """Update robot details (name, IPs, owner_wallet). Robot wallet cannot be changed."""
    robot = await robot_wallet_service.update_robot(db, robot_id, data)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )
    return RobotResponse.model_validate(robot)


@router.delete("/{robot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_robot(robot_id: str, db: AsyncSession = Depends(get_db)) -> None:
    """Soft delete a robot.

    Robot data and wallet info are preserved. If the same robot (by mDNS)
    is added again later, it will be reactivated with the same wallet.
    """
    deleted = await robot_wallet_service.delete_robot(db, robot_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )


@router.post("/{robot_id}/sync-wallet")
async def sync_wallet_to_robot(
    robot_id: str, db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    """Re-send wallet address to robot hardware."""
    try:
        success = await robot_wallet_service.sync_wallet_to_robot(db, robot_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    return {
        "status": "success" if success else "failed",
        "message": "Wallet address sent to robot" if success else "Failed to send wallet to robot",
    }


@router.post("/{robot_id}/payout", response_model=PayoutResponse)
async def payout_to_owner(
    robot_id: str,
    data: PayoutRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> PayoutResponse:
    """Transfer USDC from robot's wallet to owner's wallet.

    - Only works for Privy-created wallets
    - Requires owner_wallet to be set on the robot
    - If amount_usdc not specified, transfers all USDC
    """
    if data is None:
        data = PayoutRequest()

    try:
        result = await robot_wallet_service.payout_to_owner(db, robot_id, data.amount_usdc)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{robot_id}/switch-wallet", response_model=WalletUpgradeResponse)
async def switch_wallet(
    robot_id: str,
    data: WalletSwitchRequest,
    db: AsyncSession = Depends(get_db),
) -> WalletUpgradeResponse:
    """Switch the active wallet for a robot.

    - Can switch between user-provided and Privy wallets
    - If switching to Privy and no Privy wallet exists, creates one
    - Syncs the new wallet address to the robot hardware
    """
    try:
        result = await robot_wallet_service.switch_wallet(db, robot_id, data.wallet_type)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{robot_id}/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(
    robot_id: str,
    db: AsyncSession = Depends(get_db),
) -> WalletBalanceResponse:
    """Get the balance of a robot's wallet.

    Returns both ETH and USDC balances for the robot's active wallet.
    """
    robot = await robot_wallet_service.get_robot(db, robot_id)
    if not robot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Robot not found",
        )

    # Fetch ETH and USDC balances in parallel
    eth_balance_wei = await privy_service.get_balance(robot.wallet_address)
    usdc_balance_raw = await privy_service.get_usdc_balance(robot.wallet_address)

    # Format balances
    eth_balance = eth_balance_wei / 1e18
    usdc_balance = usdc_balance_raw / 1e6  # USDC has 6 decimals

    return WalletBalanceResponse(
        wallet_address=robot.wallet_address,
        eth_balance_wei=str(eth_balance_wei),
        eth_balance=f"{eth_balance:.6f}",
        usdc_balance_raw=str(usdc_balance_raw),
        usdc_balance=f"{usdc_balance:.2f}",
    )


@router.get("/gas-funding-info", response_model=GasFundingInfoResponse)
async def get_gas_funding_info(
    usd_amount: float = 1.0,
) -> GasFundingInfoResponse:
    """Get information for funding a wallet with gas (ETH).

    Returns the current ETH price and how much ETH to send for the given USD amount.
    Default is $1.00 worth of ETH for gas fees.
    """
    eth_price = await privy_service.get_eth_price_usd()
    eth_amount_wei = privy_service.calculate_eth_for_usd(usd_amount, eth_price)
    eth_amount = eth_amount_wei / 1e18

    return GasFundingInfoResponse(
        eth_price_usd=eth_price,
        usd_amount=usd_amount,
        eth_amount_wei=str(eth_amount_wei),
        eth_amount=f"{eth_amount:.8f}",
    )
