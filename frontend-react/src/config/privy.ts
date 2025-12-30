/**
 * Privy SDK configuration for wallet-based authentication
 */

import { base, baseSepolia } from 'viem/chains';
import type { PrivyClientConfig } from '@privy-io/react-auth';
import ycLogo from '../assets/yclogo.jpeg';

// Get Privy App ID from environment
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

// Get network from environment (matches x402 setup)
const network = (import.meta.env.VITE_X402_NETWORK as string | undefined) ?? 'base-sepolia';
export const DEFAULT_PRIVY_CHAIN = network === 'base' ? base : baseSepolia;

/**
 * Privy configuration
 * - Wallet-only login (no embedded wallets, no email/social)
 * - Users must bring their own wallet (MetaMask, Coinbase, WalletConnect)
 */
export const PRIVY_CONFIG: PrivyClientConfig = {
  // Embedded wallets disabled - users must bring their own wallet
  embeddedWallets: {
    createOnLogin: 'off',
  },

  // Supported chains (match x402 configuration)
  defaultChain: DEFAULT_PRIVY_CHAIN,
  supportedChains: [baseSepolia, base],

  // Appearance (match Chakra UI theme)
  appearance: {
    theme: 'light',
    accentColor: '#f97316', // Brand orange
    logo: ycLogo,

    // Customize modal text
    landingHeader: 'Connect Your Wallet',
    loginMessage: 'Connect your wallet to access Tumbller robot control',

    // Show these wallets in priority order
    walletList: ['metamask', 'coinbase_wallet', 'wallet_connect', 'detected_wallets'],
  },

  // Legal links (optional)
  legal: {
    termsAndConditionsUrl: undefined,
    privacyPolicyUrl: undefined,
  },
};
