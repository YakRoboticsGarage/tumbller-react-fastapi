"""Robot wallet management service."""

from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.robot import Robot, WalletSource
from app.schemas.robot import PayoutResponse, RobotCreate, RobotUpdate, WalletUpgradeResponse
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

    async def get_robot_by_mdns(
        self, db: AsyncSession, mdns: str, include_deleted: bool = False
    ) -> Robot | None:
        """Get robot by mDNS name.

        Args:
            db: Database session
            mdns: mDNS name to search for
            include_deleted: If True, also return soft-deleted robots
        """
        query = select(Robot).where(Robot.motor_mdns == mdns.lower())
        if not include_deleted:
            query = query.where(Robot.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_deleted_robot_by_mdns(self, db: AsyncSession, mdns: str) -> Robot | None:
        """Get a soft-deleted robot by mDNS name (for reactivation)."""
        result = await db.execute(
            select(Robot).where(
                Robot.motor_mdns == mdns.lower(), Robot.deleted_at.is_not(None)
            )
        )
        return result.scalar_one_or_none()

    async def create_robot(
        self, db: AsyncSession, data: RobotCreate
    ) -> tuple[Robot, bool, bool]:
        """Create a new robot, optionally creating a Privy wallet.

        Returns (robot, is_existing, was_reactivated) tuple.
        - is_existing=True if robot with same mDNS already exists (active)
        - was_reactivated=True if a deleted robot was reactivated
        """
        # Step 1: Get robot info to check mDNS
        robot_info = await self._get_robot_info(data.motor_ip)
        robot_mdns = robot_info.get("mdns") if robot_info else None

        # Step 2: Check if robot with this mDNS already exists (active)
        if robot_mdns:
            existing_robot = await self.get_robot_by_mdns(db, robot_mdns)
            if existing_robot:
                # Update IP addresses if changed (robot might have new IP)
                updated = False
                if existing_robot.motor_ip != data.motor_ip:
                    existing_robot.motor_ip = data.motor_ip
                    updated = True
                if existing_robot.camera_ip != data.camera_ip:
                    existing_robot.camera_ip = data.camera_ip
                    updated = True
                if data.owner_wallet and existing_robot.owner_wallet != data.owner_wallet:
                    existing_robot.owner_wallet = data.owner_wallet
                    updated = True

                if updated:
                    await db.commit()
                    await db.refresh(existing_robot)
                    # Re-sync wallet to robot
                    await self._send_wallet_to_robot(existing_robot)

                return existing_robot, True, False  # Existing active robot

            # Step 2b: Check for soft-deleted robot with same mDNS (reactivate)
            deleted_robot = await self.get_deleted_robot_by_mdns(db, robot_mdns)
            if deleted_robot:
                # Reactivate the robot - keep same wallet!
                deleted_robot.deleted_at = None
                deleted_robot.name = data.name  # Allow name change on reactivation
                deleted_robot.motor_ip = data.motor_ip
                deleted_robot.camera_ip = data.camera_ip
                if data.owner_wallet:
                    deleted_robot.owner_wallet = data.owner_wallet

                await db.commit()
                await db.refresh(deleted_robot)
                # Re-sync wallet to robot
                await self._send_wallet_to_robot(deleted_robot)

                return deleted_robot, False, True  # Reactivated robot

        # Step 3: Determine wallet source and address
        if data.wallet_address:
            wallet_address = data.wallet_address.lower()
            wallet_source = WalletSource.USER_PROVIDED
            user_wallet_address = wallet_address
            privy_wallet_address = None
            privy_wallet_id = None
        else:
            # Create wallet via Privy
            if not privy_service.is_configured:
                raise ValueError(
                    "No wallet address provided and Privy is not configured. "
                    "Either provide a wallet_address or configure PRIVY_APP_ID and PRIVY_APP_SECRET."
                )
            privy_wallet = await privy_service.create_wallet(chain_type="ethereum")
            wallet_address = privy_wallet.address.lower()
            wallet_source = WalletSource.PRIVY_CREATED
            user_wallet_address = None
            privy_wallet_address = wallet_address
            privy_wallet_id = privy_wallet.id

        # Step 4: Create robot record
        robot = Robot(
            name=data.name,
            motor_ip=data.motor_ip,
            camera_ip=data.camera_ip,
            motor_mdns=robot_mdns.lower() if robot_mdns else None,
            camera_mdns=None,  # Can be added later if needed
            wallet_address=wallet_address,
            wallet_source=wallet_source,
            user_wallet_address=user_wallet_address,
            privy_wallet_address=privy_wallet_address,
            privy_wallet_id=privy_wallet_id,
            owner_wallet=data.owner_wallet,
        )

        db.add(robot)
        await db.commit()
        await db.refresh(robot)

        # Step 5: Send wallet address to robot hardware
        await self._send_wallet_to_robot(robot)

        return robot, False, False  # New robot

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

    async def get_robot(
        self, db: AsyncSession, robot_id: str, include_deleted: bool = False
    ) -> Robot | None:
        """Get robot by ID."""
        query = select(Robot).where(Robot.id == robot_id)
        if not include_deleted:
            query = query.where(Robot.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_robot_by_name(
        self, db: AsyncSession, name: str, include_deleted: bool = False
    ) -> Robot | None:
        """Get robot by name."""
        query = select(Robot).where(Robot.name == name)
        if not include_deleted:
            query = query.where(Robot.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_robot_by_host(
        self, db: AsyncSession, host: str, include_deleted: bool = False
    ) -> Robot | None:
        """Get robot by motor IP or mDNS name."""
        host_lower = host.lower()
        query = select(Robot).where(
            (Robot.motor_ip == host_lower) | (Robot.motor_mdns == host_lower)
        )
        if not include_deleted:
            query = query.where(Robot.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_robots(
        self, db: AsyncSession, include_deleted: bool = False
    ) -> list[Robot]:
        """List all robots."""
        query = select(Robot).order_by(Robot.created_at.desc())
        if not include_deleted:
            query = query.where(Robot.deleted_at.is_(None))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def update_robot(
        self, db: AsyncSession, robot_id: str, data: RobotUpdate
    ) -> Robot | None:
        """Update robot details.

        Wallet address can only be updated for user-provided wallets.
        Privy-created wallets cannot be changed (would lose access to funds).
        """
        robot = await self.get_robot(db, robot_id)
        if not robot:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Check if trying to update wallet_address
        if "wallet_address" in update_data and update_data["wallet_address"] is not None:
            if robot.wallet_source == WalletSource.PRIVY_CREATED:
                raise ValueError(
                    "Cannot update wallet address for Privy-created wallets. "
                    "This would result in loss of access to funds."
                )
            # For user-provided wallets, also update user_wallet_address
            robot.user_wallet_address = update_data["wallet_address"]

        for field, value in update_data.items():
            setattr(robot, field, value)

        await db.commit()
        await db.refresh(robot)

        # Re-sync wallet to robot hardware if wallet was updated
        if "wallet_address" in update_data:
            await self._send_wallet_to_robot(robot)

        return robot

    async def delete_robot(self, db: AsyncSession, robot_id: str) -> bool:
        """Soft delete a robot (sets deleted_at timestamp).

        Robot data and wallet info are preserved for potential reactivation.
        """
        robot = await self.get_robot(db, robot_id)
        if not robot:
            return False

        robot.deleted_at = datetime.now(UTC)
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

        # Import ENS resolver
        from app.core.ens import resolve_ens_name

        resolved = await resolve_ens_name(wallet_or_name)
        if not resolved:
            raise ValueError(f"Could not resolve name: {wallet_or_name}")
        return resolved

    async def payout_to_owner(
        self,
        db: AsyncSession,
        robot_id: str,
        amount_usdc: str | None = None,
    ) -> PayoutResponse:
        """Transfer USDC from robot's Privy wallet to owner's wallet.

        Only works for Privy-created wallets.
        Owner wallet can be address, ENS name, or Base name.

        Args:
            db: Database session
            robot_id: Robot ID
            amount_usdc: Amount in USDC smallest units (6 decimals). If None, transfers all.
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

        # Get current USDC balance if amount not specified
        if amount_usdc is None:
            usdc_balance = await privy_service.get_usdc_balance(robot.wallet_address)
            if usdc_balance == 0:
                return PayoutResponse(
                    status="no_funds",
                    transaction_hash=None,
                    amount_usdc="0",
                    from_wallet=robot.wallet_address,
                    to_wallet=robot.owner_wallet,
                )
            amount_usdc = str(usdc_balance)

        if int(amount_usdc) <= 0:
            return PayoutResponse(
                status="insufficient_funds",
                transaction_hash=None,
                amount_usdc="0",
                from_wallet=robot.wallet_address,
                to_wallet=robot.owner_wallet,
            )

        # Send USDC via Privy (use resolved address)
        tx_hash = await privy_service.send_usdc(
            wallet_id=robot.privy_wallet_id,
            to_address=owner_address,
            amount=int(amount_usdc),
        )

        return PayoutResponse(
            status="success",
            transaction_hash=tx_hash,
            amount_usdc=amount_usdc,
            from_wallet=robot.wallet_address,
            to_wallet=robot.owner_wallet,  # Return original name/address
        )

    async def sync_wallet_to_robot(self, db: AsyncSession, robot_id: str) -> bool:
        """Re-send wallet address to robot hardware."""
        robot = await self.get_robot(db, robot_id)
        if not robot:
            raise ValueError("Robot not found")
        return await self._send_wallet_to_robot(robot)

    async def create_privy_wallet(
        self, db: AsyncSession, robot_id: str
    ) -> WalletUpgradeResponse:
        """Create a Privy wallet for a robot that has a user-provided wallet.

        Does not switch to it automatically - call switch_wallet to activate.
        """
        robot = await self.get_robot(db, robot_id)
        if not robot:
            raise ValueError("Robot not found")

        if robot.privy_wallet_address:
            raise ValueError("Robot already has a Privy wallet")

        if not privy_service.is_configured:
            raise ValueError("Privy is not configured")

        # Create new Privy wallet
        privy_wallet = await privy_service.create_wallet(chain_type="ethereum")
        robot.privy_wallet_address = privy_wallet.address.lower()
        robot.privy_wallet_id = privy_wallet.id

        await db.commit()
        await db.refresh(robot)

        return WalletUpgradeResponse(
            wallet_address=robot.wallet_address,
            wallet_source=robot.wallet_source,
            user_wallet_address=robot.user_wallet_address,
            privy_wallet_address=robot.privy_wallet_address,
            message="Privy wallet created. Use switch_wallet to activate it.",
        )

    async def switch_wallet(
        self, db: AsyncSession, robot_id: str, wallet_type: WalletSource
    ) -> WalletUpgradeResponse:
        """Switch the active wallet for a robot.

        Args:
            robot_id: Robot ID
            wallet_type: Which wallet to activate (USER_PROVIDED or PRIVY_CREATED)
        """
        robot = await self.get_robot(db, robot_id)
        if not robot:
            raise ValueError("Robot not found")

        if wallet_type == WalletSource.USER_PROVIDED:
            if not robot.user_wallet_address:
                raise ValueError("Robot has no user-provided wallet")
            robot.wallet_address = robot.user_wallet_address
            robot.wallet_source = WalletSource.USER_PROVIDED
            message = "Switched to user-provided wallet"

        elif wallet_type == WalletSource.PRIVY_CREATED:
            if not robot.privy_wallet_address:
                # Create Privy wallet if it doesn't exist
                if not privy_service.is_configured:
                    raise ValueError("Privy is not configured")
                privy_wallet = await privy_service.create_wallet(chain_type="ethereum")
                robot.privy_wallet_address = privy_wallet.address.lower()
                robot.privy_wallet_id = privy_wallet.id
                message = "Created and switched to Privy wallet"
            else:
                message = "Switched to Privy wallet"

            robot.wallet_address = robot.privy_wallet_address
            robot.wallet_source = WalletSource.PRIVY_CREATED

        await db.commit()
        await db.refresh(robot)

        # Sync new wallet to robot hardware
        await self._send_wallet_to_robot(robot)

        return WalletUpgradeResponse(
            wallet_address=robot.wallet_address,
            wallet_source=robot.wallet_source,
            user_wallet_address=robot.user_wallet_address,
            privy_wallet_address=robot.privy_wallet_address,
            message=message,
        )


# Singleton instance
robot_wallet_service = RobotWalletService()
