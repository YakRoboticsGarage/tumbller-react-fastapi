import { useLogto } from '@logto/react';
import { useMemo } from 'react';

/**
 * Conditional authentication hook
 * - Returns Logto hook data when auth is enabled
 * - Returns mock authenticated data when auth is disabled
 */
export function useAuth() {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- Will be replaced with Privy auth
  const isAuthEnabled = (import.meta.env.VITE_ENABLE_AUTH as string) === 'true';

  // Memoize mock data to prevent re-renders
  const mockAuth = useMemo(() => ({
    isAuthenticated: true,
    isLoading: false,
    user: null,
    signIn: async () => {
      console.warn('Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true');
      return Promise.resolve();
    },
    signOut: async () => {
      console.warn('Authentication is disabled. Enable it by setting VITE_ENABLE_AUTH=true');
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
  }), []);

  // When auth is disabled, return mock data WITHOUT calling useLogto
  if (!isAuthEnabled) {
    return mockAuth;
  }

  // When auth is enabled, use Logto hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useLogto();
}

/**
 * Check if authentication is enabled in the app
 */
export function useAuthEnabled() {
  return import.meta.env.VITE_ENABLE_AUTH === 'true';
}
