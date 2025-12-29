"""Dynamic x402 middleware that uses per-robot wallet addresses."""

import json

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.database import async_session_maker
from app.services.robot_wallet import robot_wallet_service


async def get_robot_wallet_for_request(request: Request) -> str | None:
    """Extract robot_host from request and look up its wallet address.

    Returns the robot's wallet address, or None if robot not found.
    """
    # Only process POST requests to purchase endpoint
    if request.method != "POST":
        return None

    try:
        # Read and cache body (needed because body can only be read once)
        body = await request.body()
        # Store in request state for later use
        request.state.cached_body = body

        data = json.loads(body)
        robot_host = data.get("robot_host")

        if not robot_host:
            return None

        # Look up robot in database
        async with async_session_maker() as db:
            robot = await robot_wallet_service.get_robot_by_host(db, robot_host)
            if robot:
                return robot.wallet_address

    except (json.JSONDecodeError, KeyError):
        pass

    return None


def create_dynamic_x402_middleware():
    """Create middleware that dynamically routes payments to robot-specific wallets.

    This middleware:
    1. Intercepts requests to /api/v1/access/purchase
    2. Looks up the robot's wallet address from the database
    3. Creates a dynamic x402 middleware with that wallet
    4. Falls back to global payment address if robot not found in DB
    """
    settings = get_settings()

    async def dynamic_x402_middleware(request: Request, call_next) -> Response:
        # Only intercept purchase endpoint
        if request.url.path != "/api/v1/access/purchase":
            return await call_next(request)

        # Skip OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Get robot's wallet address
        robot_wallet = await get_robot_wallet_for_request(request)

        if not robot_wallet:
            # Robot not registered - return error before x402
            return JSONResponse(
                status_code=400,
                content={
                    "detail": "Robot not registered. Register it first via POST /api/v1/robots"
                },
            )

        # Store robot wallet in request state for potential use downstream
        request.state.robot_wallet = robot_wallet

        try:
            from x402.fastapi.middleware import require_payment

            # Create x402 middleware dynamically with robot's wallet
            x402_middleware = require_payment(
                path="/api/v1/access/purchase",
                price=settings.session_price,
                pay_to_address=robot_wallet,
                network=settings.x402_network,
            )

            # We need to restore the body since we consumed it
            # Create a modified receive that returns our cached body
            original_receive = request.receive
            body_sent = False

            async def receive_with_cached_body():
                nonlocal body_sent
                if not body_sent and hasattr(request.state, "cached_body"):
                    body_sent = True
                    return {
                        "type": "http.request",
                        "body": request.state.cached_body,
                        "more_body": False,
                    }
                return await original_receive()

            # Replace receive function
            request._receive = receive_with_cached_body

            # Call x402 middleware
            response = await x402_middleware(request, call_next)

            # Add CORS headers if needed (x402 402 responses bypass CORS middleware)
            origin = request.headers.get("origin", "")
            if response.status_code == 402 and origin in settings.cors_origins:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Expose-Headers"] = (
                    "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"
                )

            return response

        except ImportError:
            # x402 not installed, proceed without payment
            return await call_next(request)

    return dynamic_x402_middleware
