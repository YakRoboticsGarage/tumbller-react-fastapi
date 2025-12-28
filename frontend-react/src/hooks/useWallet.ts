import { useWalletContext } from '../providers/WalletProvider';

/**
 * Hook to access wallet state and actions
 */
export function useWallet() {
  return useWalletContext();
}

/**
 * Shorten an Ethereum address for display
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
