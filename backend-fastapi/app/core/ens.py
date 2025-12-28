"""
ENS (Ethereum Name Service) resolution utilities.
Resolves ENS names to Ethereum addresses using JSON-RPC.
"""

import httpx

# Use pycryptodome or fallback to sha3 for keccak256
try:
    from Crypto.Hash import keccak

    def keccak256(data: bytes) -> bytes:
        return keccak.new(digest_bits=256, data=data).digest()
except ImportError:
    # Fallback: use pysha3 or hashlib (Python 3.11+)
    import hashlib

    def keccak256(data: bytes) -> bytes:
        # Note: hashlib.sha3_256 is NOT the same as keccak256
        # We need to use a proper keccak implementation
        # For simplicity, we'll try the web3 approach via RPC
        raise ImportError("pycryptodome required for ENS resolution")


# Public Ethereum mainnet RPC (ENS lives on L1)
# Using publicnode.com free RPC
ETH_RPC_URL = "https://ethereum-rpc.publicnode.com"

# ENS Registry contract address (same on all networks)
ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"

# Public Resolver interface method IDs
# addr(bytes32) - 0x3b3b57de
ADDR_SELECTOR = "0x3b3b57de"


def namehash(name: str) -> str:
    """
    Compute the namehash of an ENS name.
    See: https://docs.ens.domains/resolution/names#namehash
    """
    if not name:
        return "0x" + "00" * 32

    node = b"\x00" * 32
    labels = name.split(".")

    for label in reversed(labels):
        label_hash = keccak256(label.encode())
        node = keccak256(node + label_hash)

    return "0x" + node.hex()


def is_ens_name(value: str) -> bool:
    """Check if a string looks like an ENS name (contains dot, not 0x address)."""
    return "." in value and not value.startswith("0x")


async def resolve_ens_name(name: str) -> str | None:
    """
    Resolve an ENS name to an Ethereum address.
    Returns None if resolution fails or name is not configured.

    Uses the ENS Public Resolver via JSON-RPC.
    """
    if not is_ens_name(name):
        return None

    try:
        # First, get the resolver for this name from the ENS Registry
        node = namehash(name)

        async with httpx.AsyncClient() as client:
            # Call resolver(bytes32 node) on ENS Registry
            # Method ID: 0x0178b8bf
            resolver_call = {
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "to": ENS_REGISTRY,
                        "data": f"0x0178b8bf{node[2:]}",  # resolver(bytes32)
                    },
                    "latest",
                ],
                "id": 1,
            }

            response = await client.post(ETH_RPC_URL, json=resolver_call)
            result = response.json()

            if "error" in result or not result.get("result"):
                return None

            resolver_address = "0x" + result["result"][-40:]

            # Check if resolver is set (not zero address)
            if resolver_address == "0x" + "0" * 40:
                return None

            # Call addr(bytes32 node) on the resolver
            addr_call = {
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "to": resolver_address,
                        "data": f"{ADDR_SELECTOR}{node[2:]}",  # addr(bytes32)
                    },
                    "latest",
                ],
                "id": 2,
            }

            response = await client.post(ETH_RPC_URL, json=addr_call)
            result = response.json()

            if "error" in result or not result.get("result"):
                return None

            # Extract address from result (last 40 hex chars)
            address = "0x" + result["result"][-40:]

            # Check if address is set (not zero address)
            if address == "0x" + "0" * 40:
                return None

            return address

    except Exception as e:
        print(f"[ENS] Failed to resolve {name}: {e}")
        return None


def resolve_ens_name_sync(name: str) -> str | None:
    """
    Synchronous version of resolve_ens_name for use during startup.
    Uses a synchronous HTTP client to avoid asyncio loop issues with uvloop.
    """
    if not is_ens_name(name):
        return None

    try:
        node = namehash(name)

        # Use synchronous httpx client
        with httpx.Client() as client:
            # Call resolver(bytes32 node) on ENS Registry
            resolver_call = {
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "to": ENS_REGISTRY,
                        "data": f"0x0178b8bf{node[2:]}",
                    },
                    "latest",
                ],
                "id": 1,
            }

            response = client.post(ETH_RPC_URL, json=resolver_call)
            result = response.json()

            if "error" in result or not result.get("result"):
                return None

            resolver_address = "0x" + result["result"][-40:]

            if resolver_address == "0x" + "0" * 40:
                return None

            # Call addr(bytes32 node) on the resolver
            addr_call = {
                "jsonrpc": "2.0",
                "method": "eth_call",
                "params": [
                    {
                        "to": resolver_address,
                        "data": f"{ADDR_SELECTOR}{node[2:]}",
                    },
                    "latest",
                ],
                "id": 2,
            }

            response = client.post(ETH_RPC_URL, json=addr_call)
            result = response.json()

            if "error" in result or not result.get("result"):
                return None

            address = "0x" + result["result"][-40:]

            if address == "0x" + "0" * 40:
                return None

            return address

    except Exception as e:
        print(f"[ENS] Failed to resolve {name}: {e}")
        return None
