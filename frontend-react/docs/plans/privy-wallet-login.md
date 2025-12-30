# Frontend Plan: Privy Wallet-Based User Authentication

> **Purpose**: Add Privy SDK for wallet-based user login alongside existing Logto authentication.
> **Status**: IMPLEMENTED
> **Date**: 2025-12-30
> **Completed**: 2025-12-30

---

## Overview

Add Privy wallet authentication as an alternative to Logto, allowing users to log in with their existing Web3 wallets (MetaMask, Coinbase Wallet, WalletConnect, etc.). This is for **user authentication only** - the robot wallet management system remains unchanged.

### Key Requirements

- **Wallet-only login**: Only users with existing wallets can log in (no embedded wallet creation)
- **Logto compatibility**: Keep Logto as an optional authentication method
- **Toggleable**: Use `VITE_AUTH_METHOD` to switch between Logto and Privy
- **No disruption**: Robot wallet system (Privy-created wallets per robot) remains unchanged

---

## Current State

### Authentication
- **Logto** for user authentication (email/social login)
- Optional via `VITE_ENABLE_AUTH` environment variable
- `AuthProvider.tsx` wraps app with `LogtoProvider`
- `ProtectedRoute.tsx` guards routes, shows login page

### Wallet System
- **WalletProvider.tsx**: Manages user wallet connection (MetaMask/Coinbase via ethers.js)
- **Robot wallets**: Separate system using Privy backend API to create wallets per robot
- **Session payment**: User wallet pays for robot access sessions via x402

### Current Flow
```
User logs in (Logto) → Connects wallet (MetaMask) → Purchases session → Controls robot
```

---

## Proposed Architecture

### New Flow with Privy
```
User logs in with wallet (Privy) → Auto-connected wallet → Purchases session → Controls robot
```

### Two Authentication Paths

```
┌─────────────────────────────────────────────────────┐
│              VITE_AUTH_METHOD env var                │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼─────┐      ┌─────▼──────┐
    │  "logto" │      │  "privy"   │
    └────┬─────┘      └─────┬──────┘
         │                  │
    ┌────▼──────────┐  ┌───▼────────────┐
    │ LogtoProvider │  │ PrivyProvider  │
    └───────────────┘  └────────────────┘
```

### Component Architecture

```
App
├── AuthProvider (Modified)
│   ├── LogtoAuthProvider (Existing)
│   └── PrivyAuthProvider (NEW)
│       └── PrivyProvider
│           └── config: wallet-only login
│
├── ProtectedRoute (Modified)
│   ├── LogtoLoginPage (Existing)
│   └── WalletLoginPage (NEW)
│
└── RobotControlPage
    ├── useAuth() → abstraction over Logto/Privy
    └── SessionProvider → uses wallet from Privy or WalletProvider
```

---

## Implementation Steps

### Phase 1: Install Privy SDK

#### 1.1 Install Dependencies

```bash
cd frontend-react
pnpm add @privy-io/react-auth @privy-io/wagmi viem@^2.x wagmi@^2.x
```

**Package purposes**:
- `@privy-io/react-auth`: Core Privy React SDK
- `@privy-io/wagmi`: Wagmi integration for Privy wallets
- `viem`: Modern Ethereum library (wagmi dependency)
- `wagmi`: React hooks for Ethereum

#### 1.2 Get Privy Credentials

1. Sign up at https://dashboard.privy.io
2. Create new app: "Tumbller Robot Control"
3. Configure:
   - **Login methods**: Wallet only
   - **Allowed origins**: `http://localhost:5173`, production URL
   - **Supported chains**: Base Sepolia, Base Mainnet
4. Copy `App ID`

#### 1.3 Update Environment Variables

**File**: `frontend-react/.env`

```env
# Authentication Method Selection
VITE_AUTH_METHOD=privy  # Options: "logto" or "privy"
VITE_ENABLE_AUTH=true

# Privy Configuration (NEW)
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Logto Configuration (Keep for backward compatibility)
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your_logto_app_id
```

**File**: `frontend-react/.env.example` (Update)

```env
# Authentication Configuration
# Set VITE_ENABLE_AUTH=true to require login
VITE_ENABLE_AUTH=false

# Choose auth method: "logto" (email/social) or "privy" (wallet-only)
VITE_AUTH_METHOD=logto

# Privy Configuration (for wallet-based login)
# Get credentials from https://dashboard.privy.io
VITE_PRIVY_APP_ID=

# Logto Configuration (for email/social login)
VITE_LOGTO_ENDPOINT=
VITE_LOGTO_APP_ID=
```

---

### Phase 2: Create Privy Provider

#### 2.1 Create Privy Configuration

**File**: `src/config/privy.ts` (NEW)

```typescript
import { baseSepolia, base } from 'viem/chains';

// Get Privy App ID from environment
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string;

// Get network from environment (matches your x402 setup)
const network = import.meta.env.VITE_X402_NETWORK as string;
export const DEFAULT_CHAIN = network === 'base' ? base : baseSepolia;

// Privy configuration
export const PRIVY_CONFIG = {
  // Wallet-only login (no embedded wallets, no email/social)
  loginMethods: ['wallet'] as const,

  // Embedded wallets disabled - users must bring their own wallet
  embeddedWallets: {
    createOnLogin: 'off' as const,
  },

  // Supported chains (match your x402 configuration)
  defaultChain: DEFAULT_CHAIN,
  supportedChains: [baseSepolia, base],

  // Appearance (match your Chakra UI theme)
  appearance: {
    theme: 'light' as const,
    accentColor: '#f97316', // Your brand orange
    logo: undefined, // Optional: Add your logo URL

    // Customize modal text
    landingHeader: 'Connect Your Wallet',
    loginMessage: 'Connect your wallet to access Tumbller robot control',

    // Wallet options
    walletList: ['metamask', 'coinbase_wallet', 'wallet_connect'],
  },
};
```

#### 2.2 Create Privy Auth Provider

**File**: `src/providers/PrivyAuthProvider.tsx` (NEW)

```typescript
import { ReactNode, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PRIVY_APP_ID, PRIVY_CONFIG } from '../config/privy';

interface PrivyAuthProviderProps {
  children: ReactNode;
}

// Separate QueryClient for Wagmi (Privy requirement)
const queryClient = new QueryClient();

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
      loginMethods: PRIVY_CONFIG.loginMethods,
      defaultChain: PRIVY_CONFIG.defaultChain.name,
    });
  }, []);

  // Validate Privy App ID
  if (!PRIVY_APP_ID) {
    console.error('Privy App ID is missing!');
    console.error('Set VITE_PRIVY_APP_ID in your .env file');

    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e53e3e',
      }}>
        <h1>Privy Configuration Error</h1>
        <p>Privy App ID is not configured.</p>
        <p>Please set VITE_PRIVY_APP_ID in your .env file</p>
        <p style={{ fontSize: '0.875rem', marginTop: '1rem', color: '#718096' }}>
          Get your App ID from <a href="https://dashboard.privy.io" target="_blank" rel="noopener noreferrer">dashboard.privy.io</a>
        </p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={PRIVY_CONFIG}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
```

#### 2.3 Update Main Auth Provider

**File**: `src/providers/AuthProvider.tsx` (MODIFY)

```typescript
import { ReactNode, useEffect } from 'react';
import { LogtoProvider, LogtoConfig, UserScope } from '@logto/react';
import { PrivyAuthProvider } from './PrivyAuthProvider';

interface AuthProviderProps {
  children: ReactNode;
}

// Get configuration values at module level
const isAuthEnabled = (import.meta.env.VITE_ENABLE_AUTH as string | undefined) === 'true';
const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

// Logto config (existing)
const logtoEndpoint = ((import.meta.env.VITE_LOGTO_ENDPOINT as string | undefined) ?? '').replace(/\/$/, '');
const logtoAppId = (import.meta.env.VITE_LOGTO_APP_ID as string | undefined) ?? '';

/**
 * Logto authentication provider (existing)
 */
function LogtoAuthProvider({ children }: AuthProviderProps) {
  const config: LogtoConfig = {
    endpoint: logtoEndpoint,
    appId: logtoAppId,
    scopes: [
      UserScope.Email,
      UserScope.Phone,
      UserScope.CustomData,
      UserScope.Identities,
    ],
  };

  useEffect(() => {
    console.log('[AuthProvider] Logto initialized:', {
      endpoint: logtoEndpoint,
      appId: logtoAppId ? `${logtoAppId.substring(0, 8)}...` : 'missing',
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
  } else if (authMethod === 'logto') {
    // Validate Logto configuration when enabled
    if (!logtoEndpoint || !logtoAppId) {
      console.error('Logto is enabled but configuration is missing!');
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#e53e3e'
        }}>
          <h1>Authentication Configuration Error</h1>
          <p>Logto is enabled but endpoint and app ID are not configured.</p>
          <p>Please update your .env file or set VITE_AUTH_METHOD=privy to use wallet login</p>
        </div>
      );
    }

    return <LogtoAuthProvider>{children}</LogtoAuthProvider>;
  } else {
    console.error(`Invalid VITE_AUTH_METHOD: ${authMethod}`);
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e53e3e'
      }}>
        <h1>Invalid Authentication Method</h1>
        <p>VITE_AUTH_METHOD must be either "logto" or "privy"</p>
        <p>Current value: {authMethod}</p>
      </div>
    );
  }
}
```

---

### Phase 3: Create Wallet Login Page

#### 3.1 Create Auth Hook Abstraction

**File**: `src/hooks/usePrivyAuth.ts` (NEW)

```typescript
import { usePrivy } from '@privy-io/react-auth';

/**
 * Privy authentication hook
 * - Maps Privy hooks to common AuthState interface
 * - Compatible with existing useAuth interface
 */
export function usePrivyAuth() {
  const {
    ready,
    authenticated,
    user,
    login,
    logout: privyLogout,
  } = usePrivy();

  // Map Privy's state to common auth interface
  return {
    isAuthenticated: authenticated,
    isLoading: !ready,
    user: user ? {
      id: user.id,
      email: user.email?.address || null,
      name: null, // Privy doesn't provide name for wallet-only
    } : null,
    login,
    logout: async () => {
      await privyLogout();
    },
    error: null,
  };
}
```

**File**: `src/hooks/useAuth.ts` (MODIFY)

```typescript
import { useLogto } from '@logto/react';
import { usePrivyAuth } from './usePrivyAuth';

// Common auth interface
export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: () => void;
  logout: () => Promise<void>;
  error: Error | null;
}

// Check if auth is enabled
export function useAuthEnabled(): boolean {
  return (import.meta.env.VITE_ENABLE_AUTH as string | undefined) === 'true';
}

// Get current auth method
function getAuthMethod(): 'logto' | 'privy' {
  return (import.meta.env.VITE_AUTH_METHOD as string | undefined) === 'privy'
    ? 'privy'
    : 'logto';
}

/**
 * Main authentication hook
 * - Abstracts over Logto and Privy
 * - Returns consistent AuthState interface
 */
export function useAuth(): AuthState {
  const isAuthEnabled = useAuthEnabled();
  const authMethod = getAuthMethod();

  // If auth is disabled, return mock authenticated state
  if (!isAuthEnabled) {
    return {
      isAuthenticated: true,
      isLoading: false,
      user: null,
      login: () => {},
      logout: async () => {},
      error: null,
    };
  }

  // Use Privy if method is "privy"
  if (authMethod === 'privy') {
    return usePrivyAuth();
  }

  // Default to Logto
  const { isLoading, isAuthenticated, error, signIn, signOut } = useLogto();

  return {
    isAuthenticated,
    isLoading,
    user: null, // TODO: Get user from Logto
    login: signIn,
    logout: signOut,
    error: error || null,
  };
}
```

#### 3.2 Create Wallet Login Page Component

**File**: `src/pages/WalletLoginPage.tsx` (NEW)

```tsx
import {
  Box,
  Button,
  VStack,
  Text,
  Heading,
  Icon,
  Container,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaWallet } from 'react-icons/fa';
import { usePrivy } from '@privy-io/react-auth';

/**
 * Wallet login page for Privy authentication
 * - Shows wallet connection button
 * - Displays error states
 * - Branded with Tumbller theme
 */
export function WalletLoginPage() {
  const { ready, authenticated, login } = usePrivy();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg={bgColor}>
        <VStack spacing={4}>
          <Text fontSize="lg" color="gray.600">
            Initializing wallet connection...
          </Text>
        </VStack>
      </Box>
    );
  }

  // This shouldn't happen (ProtectedRoute should handle), but just in case
  if (authenticated) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg={bgColor}>
        <Text>Redirecting...</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg={bgColor}>
      <Container maxW="md">
        <VStack
          spacing={8}
          p={8}
          bg={cardBg}
          borderRadius="lg"
          boxShadow="xl"
          align="stretch"
        >
          {/* Logo/Icon */}
          <VStack spacing={4}>
            <Icon as={FaWallet} boxSize={16} color="brand.500" />

            <Heading size="xl" color="gray.800" textAlign="center">
              Tumbller Robot Control
            </Heading>

            <Text fontSize="md" color="gray.600" textAlign="center">
              Connect your wallet to access robot controls
            </Text>
          </VStack>

          {/* Login Button */}
          <Button
            onClick={login}
            colorScheme="brand"
            size="lg"
            leftIcon={<Icon as={FaWallet} />}
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s"
          >
            Connect Wallet
          </Button>

          {/* Supported Wallets Info */}
          <VStack spacing={2}>
            <Text fontSize="sm" color="gray.500" textAlign="center">
              Supported wallets:
            </Text>
            <Text fontSize="xs" color="gray.400" textAlign="center">
              MetaMask • Coinbase Wallet • WalletConnect
            </Text>
          </VStack>

          {/* Requirements Notice */}
          <Box
            p={4}
            bg="orange.50"
            borderRadius="md"
            borderLeft="4px"
            borderColor="brand.500"
          >
            <Text fontSize="sm" color="gray.700">
              <strong>Note:</strong> You must have a Web3 wallet installed to log in.
              We don't create wallets for you.
            </Text>
          </Box>

          {/* Powered By */}
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Secure authentication powered by Privy
          </Text>
        </VStack>
      </Container>
    </Box>
  );
}
```

**Note**: Install `react-icons` if not already installed:
```bash
pnpm add react-icons
```

#### 3.3 Update Protected Route

**File**: `src/components/common/ProtectedRoute.tsx` (MODIFY)

Add import:
```typescript
import { WalletLoginPage } from '../../pages/WalletLoginPage';
```

Update the login page rendering section (around line 108-142):

```typescript
// If not authenticated (and we've finished initial loading), show login page
if (!isAuthenticated) {
  // Get auth method to show appropriate login page
  const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

  // Show Privy wallet login page
  if (authMethod === 'privy') {
    return <WalletLoginPage />;
  }

  // Show Logto login page (existing)
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
    >
      <VStack
        spacing={8}
        p={8}
        bg="white"
        borderRadius="lg"
        boxShadow="xl"
        maxW="md"
        w="90%"
      >
        <VStack spacing={4}>
          <Text fontSize="3xl" fontWeight="bold" color="gray.800">
            Tumbller Robot Control
          </Text>
          <Text fontSize="md" color="gray.600" textAlign="center">
            Please sign in to access the robot control interface
          </Text>
        </VStack>

        <LoginButton />

        <Text fontSize="sm" color="gray.500" textAlign="center">
          Secure authentication powered by Logto
        </Text>
      </VStack>
    </Box>
  );
}
```

---

### Phase 4: Integrate Privy Wallet with Session System

#### 4.1 Update Session Provider to Use Privy Wallet

**File**: `src/providers/SessionProvider.tsx` (MODIFY)

```typescript
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Inside SessionProvider component, update wallet detection:
export function SessionProvider({ children }: SessionProviderProps) {
  const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

  // Get wallet from WalletProvider (for Logto/manual connect)
  const walletContext = useWalletContext();

  // Get wallet from Privy (for Privy auth)
  const { authenticated: privyAuthenticated } = usePrivy();
  const { wallets: privyWallets } = useWallets();

  // Determine wallet address
  const walletAddress = authMethod === 'privy'
    ? (privyAuthenticated && privyWallets[0]?.address) || null
    : walletContext.address;

  // Rest of SessionProvider logic uses walletAddress
  // ...
}
```

#### 4.2 Update Payment Flow to Use Privy Signer

**File**: `src/hooks/usePayment.ts` (MODIFY)

```typescript
import { usePrivy, useWallets } from '@privy-io/react-auth';

export function usePayment() {
  const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

  // Get signer from WalletProvider (Logto/manual wallet)
  const { getSigner: getEthersSigner } = useWalletContext();

  // Get signer from Privy
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();

  const getSigner = async () => {
    if (authMethod === 'privy' && authenticated && wallets[0]) {
      // Get ethers.js provider from Privy wallet
      const provider = await wallets[0].getEthersProvider();
      return provider.getSigner();
    }

    // Fall back to WalletProvider signer
    return getEthersSigner();
  };

  // Use getSigner in payment flow
  // ...
}
```

---

### Phase 5: Update UI Components

#### 5.1 Update Wallet Button for Privy

**File**: `src/components/common/WalletButton.tsx` (MODIFY)

```typescript
import { usePrivy, useWallets } from '@privy-io/react-auth';

export function WalletButton() {
  const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';

  // Privy wallet info
  const { authenticated, logout } = usePrivy();
  const { wallets } = useWallets();

  // WalletProvider info (existing)
  const { address, isConnected, connect, disconnect } = useWalletContext();

  // Use Privy wallet if auth method is privy
  if (authMethod === 'privy') {
    const privyWallet = wallets[0];

    if (authenticated && privyWallet) {
      return (
        <Button
          onClick={logout}
          variant="outline"
        >
          {formatAddress(privyWallet.address)} • Disconnect
        </Button>
      );
    }

    // Shouldn't happen (ProtectedRoute guards), but show for safety
    return (
      <Button onClick={() => {}} disabled>
        Connect Wallet
      </Button>
    );
  }

  // Existing Logto/manual wallet logic
  // ...
}
```

#### 5.2 Update Robot Control Page Header

**File**: `src/pages/RobotControlPage.tsx` (MODIFY)

Show user info from Privy when authenticated:

```typescript
import { usePrivy } from '@privy-io/react-auth';

export function RobotControlPage() {
  const authMethod = (import.meta.env.VITE_AUTH_METHOD as string | undefined) || 'logto';
  const { user: privyUser } = usePrivy();

  // Display wallet address as user identifier for Privy
  const userDisplay = authMethod === 'privy' && privyUser
    ? `Wallet: ${formatAddress(privyUser.wallet?.address || '')}`
    : null;

  // ... rest of component
}
```

---

### Phase 6: Testing & Documentation

#### 6.1 Create Migration Guide

**File**: `docs/Privy_Authentication_Guide.md` (NEW)

```markdown
# Privy Wallet Authentication Guide

## Setup

1. Get Privy App ID from https://dashboard.privy.io
2. Update `.env`:
   ```env
   VITE_ENABLE_AUTH=true
   VITE_AUTH_METHOD=privy
   VITE_PRIVY_APP_ID=your_app_id_here
   ```
3. Restart dev server: `pnpm dev`

## User Flow

1. User visits app
2. Login page appears with "Connect Wallet" button
3. User clicks button → Privy modal opens
4. User selects wallet (MetaMask, Coinbase, WalletConnect)
5. Wallet connection approved in browser extension
6. Redirected to robot control page
7. Wallet auto-connected for session payments

## Requirements

- Users MUST have an existing Web3 wallet
- Supported wallets: MetaMask, Coinbase Wallet, WalletConnect
- No embedded wallet creation (wallet-only mode)

## Switching Between Logto and Privy

### Use Logto (Email/Social Login)
```env
VITE_AUTH_METHOD=logto
```

### Use Privy (Wallet Login)
```env
VITE_AUTH_METHOD=privy
```

## Troubleshooting

**"Privy App ID is missing"**
- Check `.env` has `VITE_PRIVY_APP_ID`
- Restart dev server after changing `.env`

**"No wallet detected"**
- Install MetaMask or Coinbase Wallet browser extension
- Privy doesn't create wallets - users must bring their own

**Session payment fails**
- Ensure wallet is connected to correct network (Base Sepolia)
- Check wallet has USDC for payment
```

#### 6.2 Update Main README

**File**: `frontend-react/README.md` (ADD SECTION)

```markdown
## Authentication Options

Tumbller supports two authentication methods:

### Logto (Email/Social Login)
Traditional authentication via email, Google, GitHub, etc.

```env
VITE_ENABLE_AUTH=true
VITE_AUTH_METHOD=logto
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your_app_id
```

### Privy (Wallet-Only Login)
Web3-native authentication via wallet connection.

```env
VITE_ENABLE_AUTH=true
VITE_AUTH_METHOD=privy
VITE_PRIVY_APP_ID=your_privy_app_id
```

**Requirements**: Users must have MetaMask, Coinbase Wallet, or WalletConnect-compatible wallet.

See [Privy Authentication Guide](docs/Privy_Authentication_Guide.md) for details.
```

---

## Summary of Changes

### New Files

| File | Purpose |
|------|---------|
| `src/config/privy.ts` | Privy configuration constants |
| `src/providers/PrivyAuthProvider.tsx` | Privy provider wrapper |
| `src/hooks/usePrivyAuth.ts` | Privy auth hook abstraction |
| `src/pages/WalletLoginPage.tsx` | Wallet login UI |
| `docs/Privy_Authentication_Guide.md` | User guide |

### Modified Files

| File | Changes |
|------|---------|
| `src/providers/AuthProvider.tsx` | Add Privy option, toggle via env |
| `src/hooks/useAuth.ts` | Abstraction over Logto/Privy |
| `src/components/common/ProtectedRoute.tsx` | Show WalletLoginPage for Privy |
| `src/providers/SessionProvider.tsx` | Use Privy wallet address |
| `src/hooks/usePayment.ts` | Use Privy signer for payments |
| `src/components/common/WalletButton.tsx` | Show Privy wallet info |
| `src/pages/RobotControlPage.tsx` | Display Privy user info |
| `.env.example` | Add Privy env vars |

### Unchanged Files (Robot Wallet System)

✅ All robot wallet management stays exactly as-is:
- `src/components/features/RobotWalletDisplay.tsx`
- `src/components/features/FundPrivyWalletModal.tsx`
- `src/components/features/RobotPayoutButton.tsx`
- `src/services/robotManagementApi.ts`
- `src/stores/robotStore.ts`

---

## Testing Checklist

### Installation
- [ ] Privy packages install without conflicts
- [ ] App builds successfully
- [ ] No TypeScript errors

### Configuration
- [ ] Can toggle between Logto and Privy via `VITE_AUTH_METHOD`
- [ ] Privy shows error if App ID missing
- [ ] Logto shows error if endpoint/ID missing

### Wallet Login
- [ ] Login page displays correctly
- [ ] "Connect Wallet" button triggers Privy modal
- [ ] Can connect MetaMask
- [ ] Can connect Coinbase Wallet
- [ ] Can connect via WalletConnect
- [ ] Error shown if no wallet detected

### Authentication Flow
- [ ] Wallet connection redirects to robot control
- [ ] User stays logged in on page refresh
- [ ] Logout disconnects wallet and returns to login
- [ ] ProtectedRoute guards routes correctly

### Session & Payment
- [ ] Session purchase uses Privy wallet
- [ ] x402 payment signing works
- [ ] Transaction hash displays correctly
- [ ] Session countdown works
- [ ] Can control robot after payment

### Robot Wallet System (Should be unchanged)
- [ ] Can view robot wallet balances
- [ ] Can fund robot wallets with gas
- [ ] Can collect USDC from robot wallets
- [ ] Wallet switching still works

### Backward Compatibility
- [ ] Logto still works when `VITE_AUTH_METHOD=logto`
- [ ] Auth can be disabled with `VITE_ENABLE_AUTH=false`
- [ ] Existing users can switch to Privy without issues

---

## Dependencies

### New
```json
{
  "@privy-io/react-auth": "^1.x",
  "@privy-io/wagmi": "^0.x",
  "viem": "^2.x",
  "wagmi": "^2.x",
  "react-icons": "^5.x"
}
```

### Existing (No Changes)
- Chakra UI
- React Hook Form
- Zustand
- ethers.js (keep for existing WalletProvider)

---

## Open Questions

1. **Wallet Provider Redundancy**: Keep existing `WalletProvider` or fully migrate to Privy's wallet hooks?
   - **Recommendation**: Keep both - WalletProvider for Logto mode, Privy for wallet mode

2. **Session Recovery**: How to handle page refresh while logged in with Privy?
   - **Answer**: Privy SDK handles session persistence automatically

3. **Network Switching**: Should we auto-prompt network switch on login?
   - **Recommendation**: Yes, use Privy's `defaultChain` config

4. **Error Handling**: What if user rejects wallet connection?
   - **Answer**: Show error message, allow retry

---

## Timeline Estimate

- **Phase 1** (Installation): 30 minutes
- **Phase 2** (Providers): 1 hour
- **Phase 3** (Login Page): 1 hour
- **Phase 4** (Wallet Integration): 1.5 hours
- **Phase 5** (UI Updates): 1 hour
- **Phase 6** (Testing & Docs): 1 hour

**Total**: ~6 hours

---

## Success Criteria

✅ Users can log in with wallet (MetaMask, Coinbase, WalletConnect)
✅ No embedded wallet creation (wallet-only mode enforced)
✅ Logto remains functional and toggleable
✅ Session payments work with Privy wallet
✅ Robot wallet system unchanged
✅ All tests pass
✅ Documentation complete

---

## References

- [Privy Documentation](https://docs.privy.io/)
- [Privy React SDK](https://docs.privy.io/guide/react)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
