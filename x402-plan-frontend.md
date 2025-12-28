# x402 Frontend Implementation Plan (React)

**Created:** December 27, 2024
**Framework:** React 18 + Vite + Chakra UI
**Purpose:** React frontend with wallet integration for time-based robot access

---

## Overview

Extend the existing Tumbller React app to:
1. Connect browser wallet (Coinbase Wallet / MetaMask)
2. Purchase time-based robot access via x402 payment
3. Display session status and countdown timer
4. Route all robot commands through the backend

---

## Payment Model

**Time-Based Access:**
- User pays $0.10 → Gets 10 minutes of robot control
- Session countdown displayed in UI
- Motor/camera controls only work with active session

---

## New Dependencies

```bash
pnpm add ethers@^6.11.0
```

Only ethers.js is needed - we'll build wallet integration from scratch.

---

## Project Structure Changes

```
src/
├── providers/
│   ├── AuthProvider.tsx        # Existing
│   └── WalletProvider.tsx      # NEW - Wallet context
├── services/
│   ├── robotApi.ts             # MODIFY - Point to backend
│   ├── accessApi.ts            # NEW - Session management
│   └── paymentClient.ts        # NEW - x402 payment handling
├── hooks/
│   ├── useWallet.ts            # NEW - Wallet connection
│   ├── useSession.ts           # NEW - Access session state
│   └── usePayment.ts           # NEW - Payment flow
├── components/
│   ├── common/
│   │   ├── WalletButton.tsx    # NEW - Connect wallet
│   │   ├── SessionStatus.tsx   # NEW - Timer + status
│   │   └── PurchaseAccess.tsx  # NEW - Buy access button
│   └── features/
│       └── MotorControls.tsx   # MODIFY - Check session
├── types/
│   └── payment.ts              # NEW - Payment types
├── config/
│   └── chains.ts               # NEW - Chain config
└── pages/
    └── RobotControlPage.tsx    # MODIFY - Add wallet + session UI
```

---

## Implementation Steps

### Step 1: Types

**src/types/payment.ts:**
```typescript
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

export interface SessionState {
  active: boolean;
  expiresAt: Date | null;
  remainingSeconds: number;
}

export interface PaymentRequirements {
  price: string;
  network: string;
  recipient: string;
}
```

---

### Step 2: Chain Configuration

**src/config/chains.ts:**
```typescript
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
} as const;

export const DEFAULT_CHAIN = import.meta.env.PROD
  ? CHAINS.baseMainnet
  : CHAINS.baseSepolia;
```

---

### Step 3: Wallet Provider

**src/providers/WalletProvider.tsx:**
```typescript
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ethers, BrowserProvider, Signer } from 'ethers';
import { WalletState } from '../types/payment';
import { DEFAULT_CHAIN } from '../config/chains';

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  getSigner: () => Promise<Signer | null>;
  switchChain: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWalletContext must be used within WalletProvider');
  return context;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('No wallet found. Install Coinbase Wallet or MetaMask.');
    }

    const browserProvider = new BrowserProvider(window.ethereum);
    const accounts = await browserProvider.send('eth_requestAccounts', []);
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setState({
      address: accounts[0],
      isConnected: true,
      chainId: Number(network.chainId),
    });

    // Switch chain if needed
    if (Number(network.chainId) !== DEFAULT_CHAIN.chainId) {
      await switchChain(DEFAULT_CHAIN.chainId);
    }
  }, []);

  const disconnect = useCallback(() => {
    setProvider(null);
    setState({ address: null, isConnected: false, chainId: null });
  }, []);

  const getSigner = useCallback(async () => {
    if (!provider) return null;
    return provider.getSigner();
  }, [provider]);

  const switchChain = useCallback(async (chainId: number) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setState((prev) => ({ ...prev, chainId }));
    } catch (error: any) {
      if (error.code === 4902) {
        // Add chain if not exists
        const chain = DEFAULT_CHAIN;
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${chain.chainId.toString(16)}`,
            chainName: chain.name,
            rpcUrls: [chain.rpcUrl],
            blockExplorerUrls: [chain.blockExplorer],
            nativeCurrency: chain.nativeCurrency,
          }],
        });
      }
    }
  }, []);

  // Listen for wallet events
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else setState((prev) => ({ ...prev, address: accounts[0] }));
    };

    const handleChainChanged = (chainId: string) => {
      setState((prev) => ({ ...prev, chainId: parseInt(chainId, 16) }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, getSigner, switchChain }}>
      {children}
    </WalletContext.Provider>
  );
}

declare global {
  interface Window { ethereum?: any; }
}
```

---

### Step 4: useWallet Hook

**src/hooks/useWallet.ts:**
```typescript
import { useWalletContext } from '../providers/WalletProvider';

export function useWallet() {
  return useWalletContext();
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
```

---

### Step 5: Access API Service

**src/services/accessApi.ts:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface SessionStatus {
  active: boolean;
  expires_at: string | null;
  remaining_seconds: number | null;
}

export interface PurchaseResult {
  status: string;
  message: string;
  session: SessionStatus;
  payment_tx: string | null;
}

/**
 * Check if wallet has active session
 */
export async function checkSession(walletAddress: string): Promise<SessionStatus> {
  const response = await fetch(`${API_URL}/api/access/status`, {
    headers: { 'X-Wallet-Address': walletAddress },
  });
  return response.json();
}

/**
 * Purchase access session (called after payment)
 */
export async function purchaseAccess(
  walletAddress: string,
  paymentHeader: string
): Promise<PurchaseResult> {
  const response = await fetch(`${API_URL}/api/access/purchase`, {
    method: 'POST',
    headers: {
      'X-Wallet-Address': walletAddress,
      'X-Payment': paymentHeader,
    },
  });
  return response.json();
}
```

---

### Step 6: useSession Hook

**src/hooks/useSession.ts:**
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';
import { checkSession, SessionStatus } from '../services/accessApi';

export function useSession() {
  const { address, isConnected } = useWallet();
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch session status
  const refreshSession = useCallback(async () => {
    if (!address) {
      setSession(null);
      setRemainingSeconds(0);
      return;
    }

    setIsLoading(true);
    try {
      const status = await checkSession(address);
      setSession(status);
      setRemainingSeconds(status.remaining_seconds || 0);
    } catch (error) {
      console.error('Failed to check session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Poll session status
  useEffect(() => {
    if (!isConnected) return;

    refreshSession();
    const interval = setInterval(refreshSession, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, refreshSession]);

  // Countdown timer
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          refreshSession(); // Refresh when expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, refreshSession]);

  const hasActiveSession = session?.active && remainingSeconds > 0;

  return {
    hasActiveSession,
    remainingSeconds,
    isLoading,
    refreshSession,
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

### Step 7: Payment Client

**src/services/paymentClient.ts:**
```typescript
import { Signer } from 'ethers';
import { purchaseAccess } from './accessApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PaymentRequirements {
  price: string;
  network: string;
  pay_to_address: string;
}

/**
 * Parse payment requirements from 402 response
 */
function parsePaymentRequirements(headers: Headers): PaymentRequirements | null {
  const header = headers.get('X-Payment-Required');
  if (!header) return null;
  try {
    return JSON.parse(atob(header));
  } catch {
    return null;
  }
}

/**
 * Sign payment using EIP-712
 */
async function signPayment(signer: Signer, requirements: PaymentRequirements) {
  const address = await signer.getAddress();

  const domain = {
    name: 'x402',
    version: '1',
    chainId: requirements.network === 'base-sepolia' ? 84532 : 8453,
  };

  const types = {
    Payment: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'string' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const value = {
    recipient: requirements.pay_to_address,
    amount: requirements.price,
    nonce: Date.now(),
  };

  const signature = await signer.signTypedData(domain, types, value);

  return btoa(JSON.stringify({ signature, message: JSON.stringify(value), address }));
}

/**
 * Purchase access with x402 payment
 */
export async function purchaseAccessWithPayment(
  getSigner: () => Promise<Signer | null>
): Promise<{ success: boolean; error?: string; remainingSeconds?: number }> {
  // 1. First request to get payment requirements
  const response = await fetch(`${API_URL}/api/access/purchase`, {
    method: 'POST',
  });

  if (response.status !== 402) {
    return { success: false, error: `Unexpected response: ${response.status}` };
  }

  // 2. Parse requirements
  const requirements = parsePaymentRequirements(response.headers);
  if (!requirements) {
    return { success: false, error: 'Invalid payment requirements' };
  }

  // 3. Get signer
  const signer = await getSigner();
  if (!signer) {
    return { success: false, error: 'Wallet not connected' };
  }

  // 4. Sign payment
  const paymentHeader = await signPayment(signer, requirements);
  const walletAddress = await signer.getAddress();

  // 5. Retry with payment
  const result = await purchaseAccess(walletAddress, paymentHeader);

  if (result.status === 'success') {
    return {
      success: true,
      remainingSeconds: result.session.remaining_seconds || 0,
    };
  }

  return { success: false, error: 'Payment verification failed' };
}
```

---

### Step 8: usePayment Hook

**src/hooks/usePayment.ts:**
```typescript
import { useState, useCallback } from 'react';
import { useWallet } from './useWallet';
import { useSession } from './useSession';
import { purchaseAccessWithPayment } from '../services/paymentClient';

export function usePayment() {
  const { getSigner, isConnected } = useWallet();
  const { refreshSession } = useSession();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseAccess = useCallback(async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return false;
    }

    setIsPaying(true);
    setError(null);

    try {
      const result = await purchaseAccessWithPayment(getSigner);

      if (result.success) {
        await refreshSession();
        return true;
      } else {
        setError(result.error || 'Payment failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      return false;
    } finally {
      setIsPaying(false);
    }
  }, [getSigner, isConnected, refreshSession]);

  const clearError = useCallback(() => setError(null), []);

  return { purchaseAccess, isPaying, error, clearError };
}
```

---

### Step 9: WalletButton Component

**src/components/common/WalletButton.tsx:**
```typescript
import { Button, Menu, MenuButton, MenuList, MenuItem, HStack, Text, Badge, useToast } from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { useWallet, shortenAddress } from '../../hooks/useWallet';
import { DEFAULT_CHAIN } from '../../config/chains';

export function WalletButton() {
  const { address, isConnected, chainId, connect, disconnect, switchChain } = useWallet();
  const toast = useToast();

  const handleConnect = async () => {
    try {
      await connect();
      toast({ title: 'Wallet connected', status: 'success', duration: 3000 });
    } catch (error) {
      toast({
        title: 'Failed to connect',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const isWrongChain = chainId !== null && chainId !== DEFAULT_CHAIN.chainId;

  if (!isConnected) {
    return (
      <Button colorScheme="brand" onClick={handleConnect} size="sm">
        Connect Wallet
      </Button>
    );
  }

  return (
    <Menu>
      <MenuButton as={Button} rightIcon={<ChevronDownIcon />} size="sm" variant="outline">
        <HStack spacing={2}>
          {isWrongChain && <Badge colorScheme="red">Wrong Chain</Badge>}
          <Text>{shortenAddress(address!)}</Text>
        </HStack>
      </MenuButton>
      <MenuList>
        <MenuItem isDisabled>Chain: {chainId}</MenuItem>
        {isWrongChain && (
          <MenuItem onClick={() => switchChain(DEFAULT_CHAIN.chainId)}>
            Switch to {DEFAULT_CHAIN.name}
          </MenuItem>
        )}
        <MenuItem onClick={disconnect} color="red.500">Disconnect</MenuItem>
      </MenuList>
    </Menu>
  );
}
```

---

### Step 10: SessionStatus Component

**src/components/common/SessionStatus.tsx:**
```typescript
import { Box, HStack, Text, Badge, Progress } from '@chakra-ui/react';
import { useSession, formatTime } from '../../hooks/useSession';

const TOTAL_SECONDS = 10 * 60; // 10 minutes

export function SessionStatus() {
  const { hasActiveSession, remainingSeconds, isLoading } = useSession();

  if (isLoading) {
    return <Badge>Checking session...</Badge>;
  }

  if (!hasActiveSession) {
    return (
      <Badge colorScheme="red" px={3} py={1}>
        No Active Session
      </Badge>
    );
  }

  const progress = (remainingSeconds / TOTAL_SECONDS) * 100;

  return (
    <Box w="200px">
      <HStack justify="space-between" mb={1}>
        <Badge colorScheme="green">Active</Badge>
        <Text fontSize="sm" fontWeight="bold">
          {formatTime(remainingSeconds)}
        </Text>
      </HStack>
      <Progress
        value={progress}
        size="sm"
        colorScheme={progress < 20 ? 'red' : progress < 50 ? 'yellow' : 'green'}
        borderRadius="full"
      />
    </Box>
  );
}
```

---

### Step 11: PurchaseAccess Component

**src/components/common/PurchaseAccess.tsx:**
```typescript
import {
  Box,
  Button,
  VStack,
  Text,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { useWallet } from '../../hooks/useWallet';
import { useSession } from '../../hooks/useSession';
import { usePayment } from '../../hooks/usePayment';
import { WalletButton } from './WalletButton';

export function PurchaseAccess() {
  const { isConnected } = useWallet();
  const { hasActiveSession } = useSession();
  const { purchaseAccess, isPaying, error, clearError } = usePayment();
  const toast = useToast();

  const handlePurchase = async () => {
    clearError();
    const success = await purchaseAccess();
    if (success) {
      toast({
        title: 'Access Purchased!',
        description: 'You now have 10 minutes of robot control',
        status: 'success',
        duration: 5000,
      });
    }
  };

  // Already has access
  if (hasActiveSession) {
    return null;
  }

  // Not connected
  if (!isConnected) {
    return (
      <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50" textAlign="center">
        <VStack spacing={4}>
          <Text fontSize="lg" fontWeight="medium">
            Connect Wallet to Control Robot
          </Text>
          <Text color="gray.600">
            Purchase 10 minutes of access for $0.10 USDC
          </Text>
          <WalletButton />
        </VStack>
      </Box>
    );
  }

  // Connected but no session
  return (
    <Box p={6} borderWidth={1} borderRadius="lg" bg="orange.50" textAlign="center">
      <VStack spacing={4}>
        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <Text fontSize="lg" fontWeight="medium">
          Purchase Robot Access
        </Text>
        <Text color="gray.600">
          10 minutes of full robot control for $0.10 USDC
        </Text>
        <Button
          colorScheme="brand"
          size="lg"
          onClick={handlePurchase}
          isLoading={isPaying}
          loadingText="Processing Payment..."
        >
          Purchase Access - $0.10
        </Button>
      </VStack>
    </Box>
  );
}
```

---

### Step 12: Update robotApi.ts

**src/services/robotApi.ts:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Send motor command (requires active session)
 */
export async function sendMotorCommand(
  motorIp: string,
  command: 'forward' | 'back' | 'left' | 'right' | 'stop',
  walletAddress: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/api/motor/${command}?motor_ip=${motorIp}`,
    {
      headers: { 'X-Wallet-Address': walletAddress },
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error('No active session. Please purchase access.');
  }

  if (!response.ok) {
    throw new Error(`Motor command failed: ${response.status}`);
  }
}

/**
 * Get camera frame URL
 */
export function getCameraFrameUrl(cameraIp: string, walletAddress: string): string {
  return `${API_URL}/api/camera/frame?camera_ip=${cameraIp}&wallet=${walletAddress}`;
}

/**
 * Check robot status (no session required)
 */
export async function checkRobotStatus(motorIp: string, cameraIp: string) {
  const [motorRes, cameraRes] = await Promise.all([
    fetch(`${API_URL}/api/motor/stop?motor_ip=${motorIp}`).catch(() => null),
    fetch(`${API_URL}/api/camera/status?camera_ip=${cameraIp}`).catch(() => null),
  ]);

  return {
    motorOnline: motorRes?.ok || false,
    cameraOnline: cameraRes?.ok || false,
  };
}
```

---

### Step 13: Update main.tsx

**src/main.tsx:**
```typescript
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './providers/AuthProvider';
import { WalletProvider } from './providers/WalletProvider';
import { theme } from './theme';
import App from './App';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <WalletProvider>
    <AuthProvider>
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ChakraProvider>
    </AuthProvider>
  </WalletProvider>
);
```

---

### Step 14: Update RobotControlPage

**src/pages/RobotControlPage.tsx (key changes):**
```typescript
// Add imports
import { WalletButton } from '../components/common/WalletButton';
import { SessionStatus } from '../components/common/SessionStatus';
import { PurchaseAccess } from '../components/common/PurchaseAccess';
import { useSession } from '../hooks/useSession';
import { useWallet } from '../hooks/useWallet';

// Inside component
const { hasActiveSession } = useSession();
const { address } = useWallet();

// In header
<HStack spacing={4}>
  <SessionStatus />
  <WalletButton />
  {/* Existing auth */}
</HStack>

// Before MotorControls
{!hasActiveSession && <PurchaseAccess />}

// MotorControls only shown with session
{hasActiveSession && activeRobot?.connectionStatus === 'online' && (
  <MotorControls
    motorIp={activeRobot.config.motorIp}
    walletAddress={address!}
  />
)}
```

---

### Step 15: Environment Variables

**.env additions:**
```env
VITE_API_URL=http://localhost:8000
```

**.env.example:**
```env
# Robot defaults
VITE_DEFAULT_ROBOT_NAME=Tumbller-1
VITE_DEFAULT_MOTOR_IP=192.168.1.100
VITE_DEFAULT_CAMERA_IP=192.168.1.101

# Backend API
VITE_API_URL=http://localhost:8000

# Optional Auth
VITE_ENABLE_AUTH=false
```

---

## File Summary

### New Files
| File | Description |
|------|-------------|
| `src/providers/WalletProvider.tsx` | Wallet context |
| `src/hooks/useWallet.ts` | Wallet hook |
| `src/hooks/useSession.ts` | Session state + timer |
| `src/hooks/usePayment.ts` | Payment flow |
| `src/services/accessApi.ts` | Session API |
| `src/services/paymentClient.ts` | x402 payment |
| `src/components/common/WalletButton.tsx` | Connect wallet |
| `src/components/common/SessionStatus.tsx` | Timer display |
| `src/components/common/PurchaseAccess.tsx` | Buy access |
| `src/types/payment.ts` | Types |
| `src/config/chains.ts` | Chain config |

### Modified Files
| File | Changes |
|------|---------|
| `src/main.tsx` | Add WalletProvider |
| `src/pages/RobotControlPage.tsx` | Session UI |
| `src/services/robotApi.ts` | Backend URLs |

---

## User Flow

1. **User opens app** → Sees "Connect Wallet" and "Purchase Access" prompt
2. **User connects wallet** → Address displayed, purchase button enabled
3. **User clicks Purchase** → Wallet popup for payment signing
4. **User signs** → Payment processed, 10 min session starts
5. **Session active** → Timer countdown shown, motor controls enabled
6. **Session expires** → Controls disabled, purchase prompt returns

---

## Testing

```bash
# Start backend
cd tumbller-backend
uvicorn app.main:app --reload --port 8000

# Start frontend
pnpm dev

# Test flow
1. Install Coinbase Wallet / MetaMask
2. Get Base Sepolia testnet ETH
3. Connect wallet
4. Purchase access
5. Control robot for 10 minutes
```

---

## Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.11.0"
  }
}
```

---

## Resources

- [ethers.js v6](https://docs.ethers.org/v6/)
- [Base Network](https://base.org)
- [x402 GitHub](https://github.com/coinbase/x402)
