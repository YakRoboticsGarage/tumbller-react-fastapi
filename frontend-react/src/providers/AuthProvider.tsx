import { ReactNode, useEffect, useMemo } from 'react';
import { LogtoProvider, LogtoConfig, UserScope } from '@logto/react';

interface AuthProviderProps {
  children: ReactNode;
}

// Get configuration values at module level to avoid conditional hook issues
const isAuthEnabled = (import.meta.env.VITE_ENABLE_AUTH as string | undefined) === 'true';
const endpoint = ((import.meta.env.VITE_LOGTO_ENDPOINT as string | undefined) ?? '').replace(/\/$/, '');
const appId = (import.meta.env.VITE_LOGTO_APP_ID as string | undefined) ?? '';

/**
 * Inner component that uses hooks unconditionally
 * Only rendered when auth is enabled and config is valid
 */
function LogtoAuthProvider({ children }: AuthProviderProps) {
  const config: LogtoConfig = useMemo(() => ({
    endpoint,
    appId,
    scopes: [
      UserScope.Email,
      UserScope.Phone,
      UserScope.CustomData,
      UserScope.Identities,
    ],
  }), []);

  useEffect(() => {
    console.log('[AuthProvider] Logto initialized:', {
      endpoint,
      appId: appId ? `${appId.substring(0, 8)}...` : 'missing',
    });
  }, []);

  try {
    return (
      <LogtoProvider config={config}>
        {children}
      </LogtoProvider>
    );
  } catch (error) {
    console.error('[AuthProvider] Error initializing Logto:', error);
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e53e3e'
      }}>
        <h1>Authentication Initialization Error</h1>
        <p>Failed to initialize Logto SDK.</p>
        <p>Error: {error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }
}

/**
 * Conditional LogtoProvider wrapper
 * - If VITE_ENABLE_AUTH is 'true', wraps children with LogtoProvider
 * - Otherwise, renders children directly without authentication
 */
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    console.log('[AuthProvider] Configuration:', {
      isAuthEnabled,
      endpoint,
      appId: appId ? `${appId.substring(0, 8)}...` : 'missing',
    });
  }, []);

  // If authentication is disabled, render children directly
  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  // Validate Logto configuration when enabled
  if (!endpoint || !appId) {
    console.error('Logto is enabled but configuration is missing!');
    console.error('Required environment variables:');
    console.error('- VITE_LOGTO_ENDPOINT');
    console.error('- VITE_LOGTO_APP_ID');

    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e53e3e'
      }}>
        <h1>Authentication Configuration Error</h1>
        <p>Logto is enabled but endpoint and app ID are not configured.</p>
        <p>Please update your .env file with valid Logto credentials or set VITE_ENABLE_AUTH=false</p>
      </div>
    );
  }

  return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
}
