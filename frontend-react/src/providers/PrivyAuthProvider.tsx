import { ReactNode, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { PRIVY_APP_ID, PRIVY_CONFIG, DEFAULT_PRIVY_CHAIN } from '../config/privy';

interface PrivyAuthProviderProps {
  children: ReactNode;
}

/**
 * Privy authentication provider for wallet-based login
 * - Wallet-only authentication (no embedded wallets)
 * - Users must have MetaMask, Coinbase Wallet, or WalletConnect
 * - Auto-connects wallet after login
 */
export function PrivyAuthProvider({ children }: PrivyAuthProviderProps) {
  useEffect(() => {
    console.log('[PrivyAuthProvider] Initialized:', {
      appId: PRIVY_APP_ID ? `${PRIVY_APP_ID.substring(0, 8)}...` : 'missing',
      defaultChain: DEFAULT_PRIVY_CHAIN.name,
      embeddedWallets: String(PRIVY_CONFIG.embeddedWallets?.ethereum?.createOnLogin),
    });
  }, []);

  // Validate Privy App ID
  if (!PRIVY_APP_ID) {
    console.error('Privy App ID is missing!');
    console.error('Set VITE_PRIVY_APP_ID in your .env file');

    return (
      <div
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#e53e3e',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7fafc',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Privy Configuration Error
        </h1>
        <p style={{ marginBottom: '0.5rem' }}>Privy App ID is not configured.</p>
        <p style={{ marginBottom: '1rem' }}>
          Please set <code>VITE_PRIVY_APP_ID</code> in your .env file
        </p>
        <p style={{ fontSize: '0.875rem', color: '#718096' }}>
          Get your App ID from{' '}
          <a
            href="https://dashboard.privy.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3182ce', textDecoration: 'underline' }}
          >
            dashboard.privy.io
          </a>
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
      {children}
    </PrivyProvider>
  );
}
