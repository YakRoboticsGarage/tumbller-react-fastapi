import { createRoot } from 'react-dom/client'
import { AuthProvider } from './providers/AuthProvider'
import { WalletProvider } from './providers/WalletProvider'
import { SessionProvider } from './providers/SessionProvider'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

// Provider order matters:
// 1. WalletProvider - provides external wallet context (for Logto auth mode)
// 2. AuthProvider - wraps PrivyProvider (for Privy auth mode, which provides its own wallet)
// 3. SessionProvider - uses useWallet() which needs to see Privy wallets
createRoot(rootElement).render(
  <WalletProvider>
    <AuthProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </AuthProvider>
  </WalletProvider>
)
