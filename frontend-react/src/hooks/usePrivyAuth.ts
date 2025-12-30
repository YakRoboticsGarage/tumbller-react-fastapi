import { usePrivy, useWallets } from '@privy-io/react-auth';

/**
 * Common auth user interface
 */
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  walletAddress: string | null;
}

/**
 * Common auth state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  walletAddress: string | null;
  login: () => void;
  logout: () => Promise<void>;
  error: Error | null;
}

/**
 * Privy authentication hook
 * - Maps Privy hooks to common AuthState interface
 * - Compatible with existing useAuth interface
 */
export function usePrivyAuth(): AuthState {
  const { ready, authenticated, user, login, logout: privyLogout } = usePrivy();
  const { wallets } = useWallets();

  // Get the first connected wallet
  const connectedWallet = wallets[0];
  const walletAddress = connectedWallet?.address ?? null;

  // Map Privy's state to common auth interface
  return {
    isAuthenticated: authenticated,
    isLoading: !ready,
    user: user
      ? {
          id: user.id,
          email: user.email?.address ?? null,
          name: null, // Privy doesn't provide name for wallet-only login
          walletAddress,
        }
      : null,
    walletAddress,
    login,
    logout: async () => {
      await privyLogout();
    },
    error: null,
  };
}
