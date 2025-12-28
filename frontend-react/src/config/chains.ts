/**
 * Ethereum chain configuration for x402 payments
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const CHAINS = {
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
  baseMainnet: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  },
} as const satisfies Record<string, ChainConfig>;

// Network is configured via VITE_X402_NETWORK env var
// Options: "base-sepolia" (testnet) or "base" (mainnet)
const networkEnv = import.meta.env.VITE_X402_NETWORK || 'base-sepolia';

export const DEFAULT_CHAIN: ChainConfig =
  networkEnv === 'base' ? CHAINS.baseMainnet : CHAINS.baseSepolia;
