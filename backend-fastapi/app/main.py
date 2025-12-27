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

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # x402 Payment Middleware - only when enabled and address configured
    if settings.payment_enabled and settings.payment_address:
        try:
            from x402.fastapi.middleware import require_payment

            app.middleware("http")(
                require_payment(
                    path="/api/v1/access/purchase",
                    price=settings.session_price,
                    pay_to_address=settings.payment_address,
                    network=settings.x402_network,
                )
            )
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
