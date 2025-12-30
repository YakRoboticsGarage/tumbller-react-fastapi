import { useLogto } from '@logto/react';
import { useMemo } from 'react';
import { usePrivyAuth, type AuthState } from './usePrivyAuth';

// Re-export types for convenience
export type { AuthUser, AuthState } from './usePrivyAuth';

// Get configuration at module level
const isAuthEnabled =
  (import.meta.env.VITE_ENABLE_AUTH as string | undefined) === 'true';
const authMethod =
  (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

/**
 * Check if authentication is enabled in the app
 */
export function useAuthEnabled(): boolean {
  return isAuthEnabled;
}

/**
 * Get the current auth method
 */
export function useAuthMethod(): 'logto' | 'privy' {
  return authMethod === 'privy' ? 'privy' : 'logto';
}

/**
 * Main authentication hook
 * - Abstracts over Logto and Privy authentication
 * - Returns consistent AuthState interface
 * - Automatically selects provider based on VITE_AUTH_METHOD
 */
export function useAuth(): AuthState {
  // Memoize mock data to prevent re-renders when auth is disabled
  const mockAuth = useMemo<AuthState>(
    () => ({
      isAuthenticated: true,
      isLoading: false,
      user: null,
      walletAddress: null,
      login: () => {
        console.warn(
          'Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true'
        );
      },
      logout: () => {
        console.warn(
          'Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true'
        );
        return Promise.resolve();
      },
      error: null,
    }),
    []
  );

  // When auth is disabled, return mock authenticated state
  if (!isAuthEnabled) {
    return mockAuth;
  }

  // Use Privy if method is "privy"
  if (authMethod === 'privy') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrivyAuth();
  }

  // Default to Logto
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const logto = useLogto();

  return {
    isAuthenticated: logto.isAuthenticated,
    isLoading: logto.isLoading,
    user: null, // Logto user info would need separate fetch
    walletAddress: null, // Logto doesn't provide wallet
    login: () => {
      void logto.signIn(window.location.origin + '/callback');
    },
    logout: () => logto.signOut(),
    error: logto.error ?? null,
  };
}

/**
 * Legacy hook for backward compatibility
 * Returns Logto-specific interface when using Logto auth
 */
export function useLogtoAuth() {
  const isEnabled = useAuthEnabled();

  // Memoize mock data to prevent re-renders
  const mockAuth = useMemo(
    () => ({
      isAuthenticated: true,
      isLoading: false,
      user: null,
      signIn: async () => {
        console.warn(
          'Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true'
        );
        return Promise.resolve();
      },
      signOut: async () => {
        console.warn(
          'Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true'
        );
        return Promise.resolve();
      },
      getAccessToken: async () => {
        return Promise.resolve('');
      },
      getIdTokenClaims: async () => {
        return Promise.resolve(undefined);
      },
      fetchUserInfo: async () => {
        return Promise.resolve({});
      },
      error: undefined,
    }),
    []
  );

  // When auth is disabled, return mock data WITHOUT calling useLogto
  if (!isEnabled) {
    return mockAuth;
  }

  // When auth is enabled with Logto, use Logto hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLogto();
}
