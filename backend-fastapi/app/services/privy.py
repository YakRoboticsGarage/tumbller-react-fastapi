"""Privy server wallet API client."""

import base64
from dataclasses import dataclass

import httpx

from app.core.config import get_settings


@dataclass
class PrivyWallet:
    """Privy wallet information."""

    id: str
    address: str
    chain_type: str


class PrivyService:
    """Service for Privy server wallet API.

    Docs: https://docs.privy.io/guide/server-wallets/
    """

    BASE_URL = "https://api.privy.io/v1"

    def __init__(self) -> None:
        settings = get_settings()
        self.app_id = settings.privy_app_id
        self.app_secret = settings.privy_app_secret
        self._client: httpx.AsyncClient | None = None

    @property
    def is_configured(self) -> bool:
        """Check if Privy credentials are configured."""
        return bool(self.app_id and self.app_secret)

    def _get_headers(self) -> dict[str, str]:
        """Get headers for Privy API requests."""
        credentials = base64.b64encode(f"{self.app_id}:{self.app_secret}".encode()).decode()
        return {
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/json",
            "privy-app-id": self.app_id,
        }

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.BASE_URL,
                headers=self._get_headers(),
                timeout=30.0,
            )
        return self._client

    async def create_wallet(self, chain_type: str = "ethereum") -> PrivyWallet:
        """Create a new server wallet via Privy API.

        Args:
            chain_type: Blockchain type (default: "ethereum")

        Returns:
            PrivyWallet with id, address, and chain_type

        Raises:
            ValueError: If Privy credentials not configured
            httpx.HTTPStatusError: If API request fails
        """
        if not self.is_configured:
            raise ValueError("Privy API credentials not configured")

        client = await self._get_client()
        response = await client.post("/wallets", json={"chain_type": chain_type})
        response.raise_for_status()

        data = response.json()
        return PrivyWallet(
            id=data["id"],
            address=data["address"],
            chain_type=data["chain_type"],
        )

    async def get_wallet(self, wallet_id: str) -> PrivyWallet | None:
        """Get wallet by Privy wallet ID.

        Args:
            wallet_id: Privy wallet ID

        Returns:
            PrivyWallet if found, None otherwise
        """
        if not self.is_configured:
            return None

        client = await self._get_client()
        response = await client.get(f"/wallets/{wallet_id}")

        if response.status_code == 404:
            return None
        response.raise_for_status()

        data = response.json()
        return PrivyWallet(
            id=data["id"],
            address=data["address"],
            chain_type=data["chain_type"],
        )

    async def send_transaction(
        self,
        wallet_id: str,
        to_address: str,
        amount_wei: str,
        chain_id: int = 84532,  # Base Sepolia
    ) -> str:
        """Send ETH/native token from Privy wallet to destination.

        Args:
            wallet_id: Privy wallet ID to send from
            to_address: Destination wallet address
            amount_wei: Amount to send in wei (as string)
            chain_id: Chain ID (default: 84532 for Base Sepolia)

        Returns:
            Transaction hash

        Raises:
            ValueError: If Privy credentials not configured
            httpx.HTTPStatusError: If API request fails
        """
        if not self.is_configured:
            raise ValueError("Privy API credentials not configured")

        client = await self._get_client()
        response = await client.post(
            f"/wallets/{wallet_id}/rpc",
            json={
                "method": "eth_sendTransaction",
                "params": {
                    "transaction": {
                        "to": to_address,
                        "value": amount_wei,
                        "chainId": chain_id,
                    }
                },
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("hash", data.get("transactionHash", ""))

    async def send_usdc(
        self,
        wallet_id: str,
        to_address: str,
        amount: int,
        chain_id: int = 84532,  # Base Sepolia
    ) -> str:
        """Send USDC from Privy wallet to destination.

        Args:
            wallet_id: Privy wallet ID to send from
            to_address: Destination wallet address
            amount: Amount to send in USDC smallest units (6 decimals)
            chain_id: Chain ID (default: 84532 for Base Sepolia)

        Returns:
            Transaction hash

        Raises:
            ValueError: If Privy credentials not configured
            httpx.HTTPStatusError: If API request fails
        """
        if not self.is_configured:
            raise ValueError("Privy API credentials not configured")

        # USDC contract addresses
        usdc_contracts = {
            84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # Base Sepolia USDC
            8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # Base Mainnet USDC
        }
        usdc_address = usdc_contracts.get(chain_id)
        if not usdc_address:
            raise ValueError(f"USDC not supported on chain {chain_id}")

        # Encode ERC20 transfer(address,uint256) call
        # Function selector: 0xa9059cbb (keccak256("transfer(address,uint256)")[:4])
        # Pad address to 32 bytes
        to_padded = to_address.lower().replace("0x", "").zfill(64)
        # Pad amount to 32 bytes (hex)
        amount_padded = hex(amount)[2:].zfill(64)
        data_hex = f"0xa9059cbb{to_padded}{amount_padded}"

        client = await self._get_client()
        response = await client.post(
            f"/wallets/{wallet_id}/rpc",
            json={
                "method": "eth_sendTransaction",
                "caip2": f"eip155:{chain_id}",
                "params": {
                    "transaction": {
                        "to": usdc_address,
                        "data": data_hex,
                        "value": 0,
                    }
                },
            },
        )
        if response.status_code != 200:
            error_detail = response.text
            raise ValueError(f"Privy API error: {response.status_code} - {error_detail}")
        data = response.json()
        # Privy returns transaction hash in different fields depending on the response
        # Try multiple possible paths in the response
        tx_hash = (
            data.get("data", {}).get("transaction_hash")
            or data.get("data", {}).get("transactionHash")
            or data.get("data", {}).get("hash")
            or data.get("transaction_hash")
            or data.get("transactionHash")
            or data.get("hash")
            or ""
        )
        return tx_hash

    async def get_balance(self, wallet_address: str, chain_id: int = 84532) -> int:
        """Get ETH balance of wallet in wei (via public RPC, not Privy).

        Args:
            wallet_address: Wallet address to check
            chain_id: Chain ID (default: 84532 for Base Sepolia)

        Returns:
            Balance in wei as integer
        """
        rpc_url = self._get_rpc_url(chain_id)

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "eth_getBalance",
                    "params": [wallet_address, "latest"],
                    "id": 1,
                },
            )
            data = response.json()
            if "error" in data:
                return 0
            return int(data["result"], 16)

    async def get_usdc_balance(self, wallet_address: str, chain_id: int = 84532) -> int:
        """Get USDC balance of wallet (via public RPC).

        Args:
            wallet_address: Wallet address to check
            chain_id: Chain ID (default: 84532 for Base Sepolia)

        Returns:
            Balance in USDC smallest units (6 decimals) as integer
        """
        # USDC contract addresses
        usdc_contracts = {
            84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # Base Sepolia USDC
            8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  # Base Mainnet USDC
        }
        usdc_address = usdc_contracts.get(chain_id)
        if not usdc_address:
            return 0

        rpc_url = self._get_rpc_url(chain_id)

        # ERC20 balanceOf(address) function selector
        # keccak256("balanceOf(address)")[:4] = 0x70a08231
        # Pad wallet address to 32 bytes (remove 0x, pad left with zeros)
        wallet_padded = wallet_address.lower().replace("0x", "").zfill(64)
        data_hex = f"0x70a08231{wallet_padded}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "2.0",
                    "method": "eth_call",
                    "params": [
                        {"to": usdc_address, "data": data_hex},
                        "latest",
                    ],
                    "id": 1,
                },
            )
            data = response.json()
            if "error" in data or data.get("result") == "0x":
                return 0
            return int(data["result"], 16)

    def _get_rpc_url(self, chain_id: int) -> str:
        """Get RPC URL for chain."""
        rpc_urls = {
            84532: "https://sepolia.base.org",  # Base Sepolia
            8453: "https://mainnet.base.org",  # Base Mainnet
        }
        return rpc_urls.get(chain_id, rpc_urls[84532])

    async def get_eth_price_usd(self) -> float:
        """Get current ETH price in USD from CoinGecko API.

        Returns:
            ETH price in USD, or 3000.0 as fallback
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": "ethereum", "vs_currencies": "usd"},
                )
                data = response.json()
                return float(data["ethereum"]["usd"])
        except Exception:
            # Fallback price if API fails
            return 3000.0

    def calculate_eth_for_usd(self, usd_amount: float, eth_price: float) -> int:
        """Calculate ETH amount in wei for a given USD amount.

        Args:
            usd_amount: Amount in USD
            eth_price: Current ETH price in USD

        Returns:
            Amount in wei as integer
        """
        eth_amount = usd_amount / eth_price
        wei_amount = int(eth_amount * 1e18)
        return wei_amount

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Singleton instance
privy_service = PrivyService()
