from functools import lru_cache

from pydantic_settings import BaseSettings

from .ens import is_ens_name, resolve_ens_name_sync


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # Database
    database_url: str = "sqlite+aiosqlite:///./robots.db"

    # Privy API (for wallet creation)
    privy_app_id: str = ""
    privy_app_secret: str = ""

    # x402 Payments
    payment_enabled: bool = False  # Toggle to enable/disable payment gateway
    payment_address: str = ""  # Can be ENS name (e.g., "vitalik.eth") or address
    x402_network: str = "base-sepolia"

    # Session config
    session_duration_minutes: int = 10
    session_price: str = "$0.10"

    # Resolved payment address (after ENS resolution)
    _resolved_payment_address: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def get_payment_address(self) -> str:
        """
        Get the resolved payment address.
        If payment_address is an ENS name, resolves it to an address.
        """
        if self._resolved_payment_address is not None:
            return self._resolved_payment_address

        if not self.payment_address:
            return ""

        # If it's an ENS name, resolve it
        if is_ens_name(self.payment_address):
            resolved = resolve_ens_name_sync(self.payment_address)
            if resolved:
                print(f"[ENS] Resolved {self.payment_address} -> {resolved}")
                self._resolved_payment_address = resolved
                return resolved
            else:
                print(f"[ENS] Failed to resolve {self.payment_address}, using as-is")
                return self.payment_address

        # Already an address
        self._resolved_payment_address = self.payment_address
        return self.payment_address


@lru_cache
def get_settings() -> Settings:
    return Settings()
