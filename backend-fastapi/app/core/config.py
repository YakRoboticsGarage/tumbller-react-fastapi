from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # x402 Payments
    payment_enabled: bool = False  # Toggle to enable/disable payment gateway
    payment_address: str = ""
    x402_network: str = "base-sepolia"

    # Session config
    session_duration_minutes: int = 10
    session_price: str = "$0.10"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
