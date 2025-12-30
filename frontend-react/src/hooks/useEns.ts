/**
 * ENS (Ethereum Name Service) resolution hooks
 * Uses Ethereum mainnet for lookups since ENS registry lives on L1
 */

import { useState, useEffect } from 'react';
import { JsonRpcProvider } from 'ethers';

// ENS lives on Ethereum mainnet, use a public RPC
// Using publicnode.com free RPC
const ENS_PROVIDER = new JsonRpcProvider('https://ethereum-rpc.publicnode.com');

// Cache ENS lookups to avoid repeated RPC calls
const ensCache = new Map<string, string | null>();
const addressCache = new Map<string, string | null>();

/**
 * Reverse lookup: Address → ENS name
 * Returns the primary ENS name for an address, or null if not set
 */
export function useEnsName(address: string | null): {
  ensName: string | null;
  isLoading: boolean;
} {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setEnsName(null);
      return;
    }

    // Check cache first
    const cached = ensCache.get(address.toLowerCase());
    if (cached !== undefined) {
      setEnsName(cached);
      return;
    }

    setIsLoading(true);

    ENS_PROVIDER.lookupAddress(address)
      .then((name) => {
        ensCache.set(address.toLowerCase(), name);
        setEnsName(name);
      })
      .catch((error: unknown) => {
        console.warn('[ENS] Failed to lookup address:', error);
        ensCache.set(address.toLowerCase(), null);
        setEnsName(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [address]);

  return { ensName, isLoading };
}

/**
 * Forward lookup: ENS name → Address
 * Resolves an ENS name to its configured address, or null if not configured
 */
export function useEnsAddress(ensName: string | null): {
  address: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ensName) {
      setAddress(null);
      setError(null);
      return;
    }

    // Check cache first
    const cached = addressCache.get(ensName.toLowerCase());
    if (cached !== undefined) {
      setAddress(cached);
      return;
    }

    setIsLoading(true);
    setError(null);

    ENS_PROVIDER.resolveName(ensName)
      .then((resolved) => {
        addressCache.set(ensName.toLowerCase(), resolved);
        setAddress(resolved);
        if (!resolved) {
          setError(`No address configured for ${ensName}`);
        }
      })
      .catch((err: unknown) => {
        console.warn('[ENS] Failed to resolve name:', err);
        addressCache.set(ensName.toLowerCase(), null);
        setAddress(null);
        setError(`Failed to resolve ${ensName}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [ensName]);

  return { address, isLoading, error };
}

/**
 * Check if a string looks like an ENS name
 * ENS names contain at least one dot and don't start with 0x
 */
export function isEnsName(value: string): boolean {
  return value.includes('.') && !value.startsWith('0x');
}

/**
 * Format address with ENS name if available
 * Returns "name.eth (0x1234...5678)" or just shortened address
 */
export function formatAddressWithEns(
  address: string,
  ensName: string | null,
  shorten: boolean = true
): string {
  const shortAddr = shorten
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;

  if (ensName) {
    return `${ensName} (${shortAddr})`;
  }

  return shortAddr;
}
