
from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.services.session import has_valid_session


def require_session(
    x_wallet_address: str | None = Header(None, description="Wallet address"),
) -> str:
    """Dependency to verify wallet has active session.

    When payment is disabled, allows any wallet address through.
    When payment is enabled, requires a valid session.
    """
    settings = get_settings()

    if not x_wallet_address:
        raise HTTPException(
            status_code=401,
            detail="Wallet address required. Include X-Wallet-Address header.",
        )

    # If payment is disabled, allow access without session check
    if not settings.payment_enabled:
        return x_wallet_address

    # Payment enabled - require valid session
    if not has_valid_session(x_wallet_address):
        raise HTTPException(
            status_code=403,
            detail="No active session. Purchase access first.",
        )

    return x_wallet_address
