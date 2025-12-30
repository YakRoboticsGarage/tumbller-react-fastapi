import { ReactNode, useEffect, useMemo } from 'react';
import { LogtoProvider, LogtoConfig, UserScope } from '@logto/react';
import { PrivyAuthProvider } from './PrivyAuthProvider';

interface AuthProviderProps {
  children: ReactNode;
}

// Get configuration values at module level to avoid conditional hook issues
const isAuthEnabled =
  (import.meta.env.VITE_ENABLE_AUTH as string | undefined) === 'true';
const authMethod =
  (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

// Logto config
const logtoEndpoint = (
  (import.meta.env.VITE_LOGTO_ENDPOINT as string | undefined) ?? ''
).replace(/\/$/, '');
const logtoAppId =
  (import.meta.env.VITE_LOGTO_APP_ID as string | undefined) ?? '';

/**
 * Logto authentication provider (existing)
 * Only rendered when auth method is "logto"
 */
function LogtoAuthProvider({ children }: AuthProviderProps) {
  const config: LogtoConfig = useMemo(
    () => ({
      endpoint: logtoEndpoint,
      appId: logtoAppId,
      scopes: [
        UserScope.Email,
        UserScope.Phone,
        UserScope.CustomData,
        UserScope.Identities,
      ],
    }),
    []
  );

  useEffect(() => {
    console.log('[AuthProvider] Logto initialized:', {
      endpoint: logtoEndpoint,
      appId: logtoAppId ? `${logtoAppId.substring(0, 8)}...` : 'missing',
    });
  }, []);

  try {
    return <LogtoProvider config={config}>{children}</LogtoProvider>;
  } catch (error) {
    console.error('[AuthProvider] Error initializing Logto:', error);
    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#e53e3e',
        }}
      >
        <h1>Authentication Initialization Error</h1>
        <p>Failed to initialize Logto SDK.</p>
        <p>Error: {error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }
}

/**
 * Main authentication provider
 * - Supports both Logto (email/social) and Privy (wallet-only)
 * - Configured via VITE_AUTH_METHOD environment variable
 * - Can be disabled via VITE_ENABLE_AUTH=false
 */
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    console.log('[AuthProvider] Configuration:', {
      isAuthEnabled,
      authMethod,
    });
  }, []);

  // If authentication is disabled, render children directly
  if (!isAuthEnabled) {
    console.log('[AuthProvider] Authentication disabled');
    return <>{children}</>;
  }

  // Choose authentication provider based on method
  if (authMethod === 'privy') {
    return <PrivyAuthProvider>{children}</PrivyAuthProvider>;
  }

  if (authMethod === 'logto') {
    // Validate Logto configuration when enabled
    if (!logtoEndpoint || !logtoAppId) {
      console.error('Logto is enabled but configuration is missing!');
      console.error('Required environment variables:');
      console.error('- VITE_LOGTO_ENDPOINT');
      console.error('- VITE_LOGTO_APP_ID');

      return (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#e53e3e',
          }}
        >
          <h1>Authentication Configuration Error</h1>
          <p>Logto is enabled but endpoint and app ID are not configured.</p>
          <p>
            Please update your .env file or set VITE_AUTH_METHOD=privy to use
            wallet login
          </p>
        </div>
      );
    }

    return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
  }

  // Invalid auth method
  console.error(`Invalid VITE_AUTH_METHOD: ${authMethod}`);
  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e53e3e',
      }}
    >
      <h1>Invalid Authentication Method</h1>
      <p>VITE_AUTH_METHOD must be either "logto" or "privy"</p>
      <p>Current value: {authMethod}</p>
    </div>
  );
}
