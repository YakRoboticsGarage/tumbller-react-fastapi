"""
ENS (Ethereum Name Service) resolution utilities.
Resolves ENS names to Ethereum addresses using web3.py.
"""

from web3 import Web3

# Public Ethereum mainnet RPC (ENS lives on L1)
ETH_RPC_URL = "https://ethereum-rpc.publicnode.com"

# Initialize Web3 with HTTP provider
_w3 = Web3(Web3.HTTPProvider(ETH_RPC_URL))


def is_ens_name(value: str) -> bool:
    """Check if a string looks like an ENS name (contains dot, not 0x address)."""
    return "." in value and not value.startswith("0x")


def resolve_ens_name_sync(name: str) -> str | None:
    """
    Resolve an ENS name to an Ethereum address.
    Returns None if resolution fails or name is not configured.
    """
    if not is_ens_name(name):
        return None

    try:
        address = _w3.ens.address(name)
        return address
    except Exception as e:
        print(f"[ENS] Failed to resolve {name}: {e}")
        return None


async def resolve_ens_name(name: str) -> str | None:
    """
    Async version of resolve_ens_name.
    Note: web3.py ENS is synchronous, so this wraps the sync version.
    """
    return resolve_ens_name_sync(name)
