import { useCallback } from 'react';
import { useWalletContext } from '../providers/WalletProvider';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import type { Signer } from 'ethers';
import { BrowserProvider } from 'ethers';

// Get auth method at module level
const authMethod =
  (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

/**
 * Unified wallet state interface
 */
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<Signer | null>;
  switchChain: (chainId: number) => Promise<void>;
}

/**
 * Hook to access wallet state and actions
 * - Uses Privy wallet when auth method is "privy"
 * - Uses WalletProvider (MetaMask/Coinbase) when auth method is "logto"
 */
export function useWallet(): WalletState {
  // Always call hooks at top level (even if not used)
  const walletContext = useWalletContext();

  // Privy hooks - only call if auth method is privy
  // These are safe to call even if not inside PrivyProvider (they'll just return defaults)
  const privyHooks = usePrivyWalletHooks();

  // Use Privy wallet if auth method is privy
  // Check for address rather than isConnected to handle wallet readiness timing
  if (authMethod === 'privy' && privyHooks.address) {
    return privyHooks;
  }

  // Default to WalletProvider
  return walletContext;
}

/**
 * Internal hook for Privy wallet state
 * Separated to avoid conditional hook issues
 */
function usePrivyWalletHooks(): WalletState {
  const { authenticated, logout, ready } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();

  // Get the first connected wallet
  // Privy's useWallets returns wallets that are linked to the user
  const connectedWallet = wallets[0];
  const address = connectedWallet?.address ?? null;
  const chainId = connectedWallet?.chainId
    ? parseInt(connectedWallet.chainId.split(':')[1] || '0', 10)
    : null;


  const connect = useCallback(() => {
    // With Privy, connection happens through login
    // This is a no-op since we're already authenticated
    console.log('[useWallet] Privy wallet already connected via authentication');
    return Promise.resolve();
  }, []);

  const disconnect = useCallback(() => {
    // Disconnect from Privy logs out the user
    void logout();
  }, [logout]);

  const getSigner = useCallback(async (): Promise<Signer | null> => {
    if (!connectedWallet) {
      console.warn('[useWallet] No Privy wallet connected, wallets:', wallets);
      return null;
    }

    console.log('[useWallet] Getting signer from wallet:', connectedWallet.address);

    try {
      // Get EIP-1193 provider from Privy wallet (works for external wallets like MetaMask)
      const eip1193Provider = await connectedWallet.getEthereumProvider();
      console.log('[useWallet] Got EIP-1193 provider');
      // Wrap in BrowserProvider for ethers v6 compatibility
      const browserProvider = new BrowserProvider(eip1193Provider);
      const signer = await browserProvider.getSigner();
      console.log('[useWallet] Got signer successfully');
      return signer;
    } catch (err: unknown) {
      console.error('[useWallet] Failed to get Privy signer:', err);
      return null;
    }
  }, [connectedWallet, wallets]);

  const switchChain = useCallback(
    async (targetChainId: number) => {
      if (!connectedWallet) {
        console.warn('[useWallet] No Privy wallet to switch chain');
        return;
      }

      try {
        await connectedWallet.switchChain(targetChainId);
      } catch (error) {
        console.error('[useWallet] Failed to switch chain:', error);
        throw error;
      }
    },
    [connectedWallet]
  );

  // isConnected requires Privy to be ready, user authenticated, wallets loaded, and a wallet present
  const isConnected = ready && walletsReady && authenticated && !!connectedWallet;

  return {
    address,
    isConnected,
    chainId,
    connect,
    disconnect,
    getSigner,
    switchChain,
  };
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
