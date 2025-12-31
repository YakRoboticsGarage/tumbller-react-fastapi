import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import access, robot, robots
from app.core.config import get_settings
from app.core.logging import setup_logging

# Initialize logging
logger = setup_logging()


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="YakRover Robot Control API",
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

    # x402 Payment Middleware - dynamic per-robot wallet addresses
    if settings.payment_enabled:
        try:
            from app.core.x402_dynamic import create_dynamic_x402_middleware

            dynamic_middleware = create_dynamic_x402_middleware()
            app.middleware("http")(dynamic_middleware)
            logger.info(
                f"x402 payments ENABLED (dynamic per-robot wallets): {settings.session_price} "
                f"for {settings.session_duration_minutes} min"
            )
        except ImportError as e:
            logger.warning(f"x402 package not installed. Payments disabled. Error: {e}")
    else:
        logger.info("Payment gateway DISABLED (PAYMENT_ENABLED=false). Free access mode.")

    # Routers
    app.include_router(access.router, prefix="/api/v1/access", tags=["Access"])
    app.include_router(robot.router, prefix="/api/v1/robot", tags=["Robot"])
    app.include_router(robots.router, prefix="/api/v1", tags=["Robots"])

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
