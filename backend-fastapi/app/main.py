from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import access, robot
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Tumbller Robot Control API",
        description="Time-based robot access with optional x402 payments",
        version="1.0.0",
    )

    # CORS - expose x402 headers
    # Response headers: PAYMENT-REQUIRED (402 requirements), X-PAYMENT-RESPONSE (success)
    # Request headers: X-PAYMENT (client payment signature) - allowed via allow_headers=["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["PAYMENT-REQUIRED", "X-PAYMENT-RESPONSE"],
    )

    # x402 Payment Middleware - only when enabled and address configured
    # Resolve ENS name to address if needed
    payment_address = settings.get_payment_address() if settings.payment_enabled else ""

    if settings.payment_enabled and payment_address:
        try:
            from starlette.requests import Request
            from starlette.responses import Response
            from x402.fastapi.middleware import require_payment

            # Get the x402 middleware
            x402_middleware = require_payment(
                path="/api/v1/access/purchase",
                price=settings.session_price,
                pay_to_address=payment_address,
                network=settings.x402_network,
            )

            # Wrap x402 to handle CORS (x402 runs before CORS middleware)
            async def x402_with_cors_support(request: Request, call_next) -> Response:
                origin = request.headers.get("origin", "")

                # Skip x402 for OPTIONS requests (CORS preflight)
                if request.method == "OPTIONS":
                    return await call_next(request)

                response = await x402_middleware(request, call_next)

                # Add CORS headers to x402 responses (402 bypasses CORS middleware)
                if response.status_code == 402 and origin in settings.cors_origins:
                    response.headers["Access-Control-Allow-Origin"] = origin
                    response.headers["Access-Control-Allow-Credentials"] = "true"
                    response.headers["Access-Control-Expose-Headers"] = "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"

                return response

            app.middleware("http")(x402_with_cors_support)
            print(
                f"x402 payments ENABLED: {settings.session_price} "
                f"for {settings.session_duration_minutes} min"
            )
        except ImportError:
            print("WARNING: x402 package not installed. Payments disabled.")
    elif settings.payment_enabled and not settings.payment_address:
        print("WARNING: PAYMENT_ENABLED=true but PAYMENT_ADDRESS not set. Payments disabled.")
    else:
        print("Payment gateway DISABLED (PAYMENT_ENABLED=false). Free access mode.")

    # Routers
    app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
    app.include_router(robot.router, prefix="/api/v1/robot", tags=["Robot"])

    @app.get("/health")
    async def health():
        """Health check endpoint."""
        return {"status": "healthy", "payment_enabled": settings.payment_enabled}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
