# Frontend Plan: Privy Wallet Integration for Robot Wallets

> **Purpose**: Add UI for robot wallet management with Privy integration.
> **Status**: DRAFT - Pending approval

---

## Overview

Modify the frontend to:
1. Ask users during robot registration if robot has a wallet or needs one created
2. Display robot wallet addresses with copy functionality
3. Use robot-specific wallets for payments (instead of hardcoded address)
4. Sync robot data with backend database
5. Add optional owner wallet field for collecting robot earnings
6. Add UI to trigger payout from robot wallet to owner wallet

---

## Current State

- Robots are stored in localStorage via Zustand (`robotStore.ts`)
- No wallet info stored per robot
- Payment goes to single hardcoded address from backend config
- Robot config: `{ id, name, motorIp, cameraIp, motorMdns?, cameraMdns? }`

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AddRobotForm (Modified)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Robot Name: [_______________]                           │   │
│  │  Motor IP:   [_______________]                           │   │
│  │  Camera IP:  [_______________]                           │   │
│  │                                                           │   │
│  │  ◉ Robot already has a wallet                            │   │
│  │    Wallet Address: [0x_______________________________]   │   │
│  │                                                           │   │
│  │  ○ Create a new wallet for this robot                    │   │
│  │    (Privy will generate a secure wallet)                 │   │
│  │                                                           │   │
│  │  [Add Robot]                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Call                              │
│  POST /api/v1/robots                                            │
│  { name, motor_ip, camera_ip, wallet_address? }                 │
│                                                                  │
│  Response: { id, wallet_address, wallet_source, ... }           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RobotCard (Modified)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🤖 Tumbller-1                          [Connect]        │   │
│  │  Motor: 192.168.1.100  Camera: 192.168.1.101            │   │
│  │                                                           │   │
│  │  💰 Wallet: 0x1234...5678  [📋 Copy]                     │   │
│  │     Source: Privy Created                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: API Client Updates

#### 1.1 Create Robot API Service

**File**: `src/services/robotManagementApi.ts` (NEW)

```typescript
import { API_BASE_URL } from './config';

export interface RobotCreateRequest {
  name: string;
  motor_ip: string;
  camera_ip: string;
  motor_mdns?: string;
  camera_mdns?: string;
  wallet_address?: string; // Optional - if not provided, Privy creates one
  owner_wallet?: string;   // Optional - owner's wallet for payouts
}

export interface RobotResponse {
  id: string;
  name: string;
  motor_ip: string;
  camera_ip: string;
  motor_mdns: string | null;
  camera_mdns: string | null;
  wallet_address: string;
  wallet_source: 'user_provided' | 'privy_created';
  owner_wallet: string | null;
  created_at: string;
  updated_at: string;
}

export interface RobotListResponse {
  robots: RobotResponse[];
  total: number;
}

export interface PayoutRequest {
  amount_wei?: string; // If not specified, transfers all funds
}

export interface PayoutResponse {
  status: 'success' | 'no_funds' | 'insufficient_funds';
  transaction_hash: string | null;
  amount_wei: string;
  from_wallet: string;
  to_wallet: string;
}

class RobotManagementApi {
  private baseUrl = `${API_BASE_URL}/api/v1/robots`;

  async createRobot(data: RobotCreateRequest): Promise<RobotResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create robot');
    }

    return response.json();
  }

  async listRobots(): Promise<RobotListResponse> {
    const response = await fetch(this.baseUrl);

    if (!response.ok) {
      throw new Error('Failed to fetch robots');
    }

    return response.json();
  }

  async getRobot(robotId: string): Promise<RobotResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}`);

    if (!response.ok) {
      throw new Error('Robot not found');
    }

    return response.json();
  }

  async deleteRobot(robotId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${robotId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete robot');
    }
  }

  async syncWalletToRobot(robotId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/${robotId}/sync-wallet`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to sync wallet');
    }

    return response.json();
  }

  async payoutToOwner(robotId: string, amountWei?: string): Promise<PayoutResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_wei: amountWei }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to process payout');
    }

    return response.json();
  }

  async updateRobot(robotId: string, data: Partial<RobotCreateRequest>): Promise<RobotResponse> {
    const response = await fetch(`${this.baseUrl}/${robotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update robot');
    }

    return response.json();
  }
}

export const robotManagementApi = new RobotManagementApi();
```

---

### Phase 2: Update Store

#### 2.1 Extend Robot Config Type

**File**: `src/stores/robotStore.ts` (MODIFY)

```typescript
// Add wallet fields to RobotConfig
export interface RobotConfig {
  id: string;
  name: string;
  motorIp: string;
  cameraIp: string;
  motorMdns?: string;
  cameraMdns?: string;
  // Wallet information
  walletAddress: string;
  walletSource: 'user_provided' | 'privy_created';
  ownerWallet?: string;  // Owner's wallet for payouts
  createdAt: Date;
}

// Update store to sync with backend
interface RobotStore {
  // ... existing fields

  // NEW: Sync methods
  syncFromBackend: () => Promise<void>;
  isLoading: boolean;
  syncError: string | null;
}
```

#### 2.2 Add Backend Sync

**File**: `src/stores/robotStore.ts` (MODIFY)

```typescript
import { robotManagementApi, RobotResponse } from '../services/robotManagementApi';

// Helper to convert API response to store format
function apiResponseToConfig(robot: RobotResponse): RobotConfig {
  return {
    id: robot.id,
    name: robot.name,
    motorIp: robot.motor_ip,
    cameraIp: robot.camera_ip,
    motorMdns: robot.motor_mdns ?? undefined,
    cameraMdns: robot.camera_mdns ?? undefined,
    walletAddress: robot.wallet_address,
    walletSource: robot.wallet_source,
    ownerWallet: robot.owner_wallet ?? undefined,
    createdAt: new Date(robot.created_at),
  };
}

export const useRobotStore = create<RobotStore>()(
  persist(
    (set, get) => ({
      // ... existing state
      isLoading: false,
      syncError: null,

      syncFromBackend: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const response = await robotManagementApi.listRobots();
          const robots = new Map<string, RobotState>();

          for (const robot of response.robots) {
            robots.set(robot.id, {
              config: apiResponseToConfig(robot),
              connectionStatus: 'disconnected',
              cameraStatus: 'disconnected',
            });
          }

          set({ robots, isLoading: false });

          // Set first robot as active if none selected
          const { activeRobotId } = get();
          if (!activeRobotId && response.robots.length > 0) {
            set({ activeRobotId: response.robots[0].id });
          }
        } catch (error) {
          set({
            isLoading: false,
            syncError: error instanceof Error ? error.message : 'Sync failed'
          });
        }
      },

      // Modify addRobot to call backend
      addRobot: async (config: Omit<RobotConfig, 'id' | 'createdAt' | 'walletAddress' | 'walletSource'> & { walletAddress?: string }) => {
        const response = await robotManagementApi.createRobot({
          name: config.name,
          motor_ip: config.motorIp,
          camera_ip: config.cameraIp,
          motor_mdns: config.motorMdns,
          camera_mdns: config.cameraMdns,
          wallet_address: config.walletAddress,
        });

        const newRobot: RobotState = {
          config: apiResponseToConfig(response),
          connectionStatus: 'disconnected',
          cameraStatus: 'disconnected',
        };

        set((state) => ({
          robots: new Map(state.robots).set(response.id, newRobot),
          activeRobotId: response.id,
        }));

        return response;
      },

      // Modify removeRobot to call backend
      removeRobot: async (robotId: string) => {
        await robotManagementApi.deleteRobot(robotId);

        set((state) => {
          const newRobots = new Map(state.robots);
          newRobots.delete(robotId);

          return {
            robots: newRobots,
            activeRobotId: state.activeRobotId === robotId
              ? (newRobots.size > 0 ? newRobots.keys().next().value : null)
              : state.activeRobotId,
          };
        });
      },
    }),
    {
      name: 'tumbller-robot-storage',
      // ... existing persist config
    }
  )
);
```

---

### Phase 3: Update Add Robot Form

#### 3.1 Add Wallet Option to Form

**File**: `src/components/features/AddRobotForm.tsx` (MODIFY)

```tsx
import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack,
  useToast,
  Collapse,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;

// Validates: 0x address, ENS name (*.eth), or Base name (*.base.eth)
const isValidWalletOrName = (value: string): boolean => {
  const trimmed = value.trim();
  // Plain address
  if (trimmed.startsWith('0x')) {
    return ethAddressPattern.test(trimmed);
  }
  // ENS/Base name (contains dot)
  if (trimmed.includes('.')) {
    return trimmed.length >= 3 && trimmed.length <= 253;
  }
  return false;
};

const robotFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  motorIp: z.string().regex(ipPattern, 'Invalid IP address'),
  cameraIp: z.string().regex(ipPattern, 'Invalid IP address'),
  motorMdns: z.string().optional(),
  cameraMdns: z.string().optional(),
  walletOption: z.enum(['existing', 'create']),
  walletAddress: z.string().optional(),
  ownerWallet: z.string().optional(),  // Owner's wallet/ENS/Base name
}).refine((data) => {
  // If user chose existing wallet, address is required
  if (data.walletOption === 'existing') {
    if (!data.walletAddress) return false;
    return ethAddressPattern.test(data.walletAddress);
  }
  return true;
}, {
  message: 'Valid Ethereum address required (0x...)',
  path: ['walletAddress'],
}).refine((data) => {
  // Owner wallet is optional but must be valid if provided
  if (data.ownerWallet && data.ownerWallet.trim()) {
    return isValidWalletOrName(data.ownerWallet);
  }
  return true;
}, {
  message: 'Enter a valid address (0x...) or name (vitalik.eth, name.base.eth)',
  path: ['ownerWallet'],
});

type RobotFormData = z.infer<typeof robotFormSchema>;

interface AddRobotFormProps {
  onSuccess?: () => void;
}

export function AddRobotForm({ onSuccess }: AddRobotFormProps) {
  const toast = useToast();
  const addRobot = useRobotStore((state) => state.addRobot);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RobotFormData>({
    resolver: zodResolver(robotFormSchema),
    defaultValues: {
      walletOption: 'create',
    },
  });

  const walletOption = watch('walletOption');

  const onSubmit = async (data: RobotFormData) => {
    setIsSubmitting(true);
    try {
      await addRobot({
        name: data.name,
        motorIp: data.motorIp,
        cameraIp: data.cameraIp,
        motorMdns: data.motorMdns || undefined,
        cameraMdns: data.cameraMdns || undefined,
        walletAddress: data.walletOption === 'existing' ? data.walletAddress : undefined,
        ownerWallet: data.ownerWallet?.trim() || undefined,
      });

      toast({
        title: 'Robot added successfully',
        description: data.walletOption === 'create'
          ? 'A new wallet has been created for this robot'
          : 'Robot registered with provided wallet',
        status: 'success',
        duration: 5000,
      });

      reset();
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to add robot',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack spacing={4} align="stretch">
        {/* Existing fields: name, motorIp, cameraIp, mdns fields */}
        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Robot Name</FormLabel>
          <Input {...register('name')} placeholder="Tumbller-1" />
          <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.motorIp}>
          <FormLabel>Motor Controller IP</FormLabel>
          <Input {...register('motorIp')} placeholder="192.168.1.100" />
          <FormErrorMessage>{errors.motorIp?.message}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.cameraIp}>
          <FormLabel>Camera IP</FormLabel>
          <Input {...register('cameraIp')} placeholder="192.168.1.101" />
          <FormErrorMessage>{errors.cameraIp?.message}</FormErrorMessage>
        </FormControl>

        {/* NEW: Wallet Option */}
        <FormControl>
          <FormLabel>Robot Wallet</FormLabel>
          <RadioGroup defaultValue="create">
            <Stack spacing={3}>
              <Radio {...register('walletOption')} value="create">
                <Box>
                  <Text fontWeight="medium">Create a new wallet</Text>
                  <Text fontSize="sm" color="gray.500">
                    Privy will generate a secure wallet for this robot
                  </Text>
                </Box>
              </Radio>

              <Radio {...register('walletOption')} value="existing">
                <Box>
                  <Text fontWeight="medium">Robot already has a wallet</Text>
                  <Text fontSize="sm" color="gray.500">
                    Enter the existing wallet address
                  </Text>
                </Box>
              </Radio>
            </Stack>
          </RadioGroup>
        </FormControl>

        {/* Conditional wallet address input */}
        <Collapse in={walletOption === 'existing'} animateOpacity>
          <FormControl isInvalid={!!errors.walletAddress}>
            <FormLabel>Wallet Address</FormLabel>
            <Input
              {...register('walletAddress')}
              placeholder="0x..."
              fontFamily="mono"
            />
            <FormErrorMessage>{errors.walletAddress?.message}</FormErrorMessage>
          </FormControl>
        </Collapse>

        {/* Owner Wallet (optional) */}
        <FormControl isInvalid={!!errors.ownerWallet}>
          <FormLabel>
            Owner Wallet{' '}
            <Text as="span" fontSize="sm" color="gray.500" fontWeight="normal">
              (optional)
            </Text>
          </FormLabel>
          <Input
            {...register('ownerWallet')}
            placeholder="0x..., vitalik.eth, or name.base.eth"
            fontFamily="mono"
          />
          <FormErrorMessage>{errors.ownerWallet?.message}</FormErrorMessage>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Address, ENS name, or Base name to receive robot earnings
          </Text>
        </FormControl>

        <Button
          type="submit"
          colorScheme="brand"
          isLoading={isSubmitting}
          loadingText="Adding Robot..."
        >
          Add Robot
        </Button>
      </VStack>
    </form>
  );
}
```

---

### Phase 4: Display Wallet Address

#### 4.1 Create Wallet Display Component

**File**: `src/components/features/RobotWalletDisplay.tsx` (NEW)

```tsx
import {
  Box,
  HStack,
  IconButton,
  Text,
  Tooltip,
  useClipboard,
  Badge,
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';

interface RobotWalletDisplayProps {
  walletAddress: string;
  walletSource: 'user_provided' | 'privy_created';
  showFullAddress?: boolean;
}

export function RobotWalletDisplay({
  walletAddress,
  walletSource,
  showFullAddress = false,
}: RobotWalletDisplayProps) {
  const { hasCopied, onCopy } = useClipboard(walletAddress);

  // Format: 0x1234...5678 or full address
  const displayAddress = showFullAddress
    ? walletAddress
    : `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <Box>
      <HStack spacing={2} align="center">
        <Text fontSize="sm" color="gray.500">
          Wallet:
        </Text>
        <Tooltip
          label={showFullAddress ? 'Click to copy' : walletAddress}
          placement="top"
        >
          <Text
            fontFamily="mono"
            fontSize="sm"
            cursor="pointer"
            onClick={onCopy}
            _hover={{ color: 'brand.500' }}
          >
            {displayAddress}
          </Text>
        </Tooltip>
        <Tooltip label={hasCopied ? 'Copied!' : 'Copy address'}>
          <IconButton
            aria-label="Copy wallet address"
            icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
            size="xs"
            variant="ghost"
            onClick={onCopy}
            colorScheme={hasCopied ? 'green' : 'gray'}
          />
        </Tooltip>
        <Badge
          colorScheme={walletSource === 'privy_created' ? 'purple' : 'blue'}
          fontSize="xs"
        >
          {walletSource === 'privy_created' ? 'Privy' : 'User'}
        </Badge>
      </HStack>
    </Box>
  );
}
```

#### 4.2 Integrate into Robot Card/Connection Component

**File**: `src/components/features/RobotConnection.tsx` (MODIFY)

```tsx
import { RobotWalletDisplay } from './RobotWalletDisplay';
import { RobotPayoutButton } from './RobotPayoutButton';

// In the component JSX, add after robot name/status:
<RobotWalletDisplay
  walletAddress={robot.config.walletAddress}
  walletSource={robot.config.walletSource}
/>

{/* Show payout button if owner wallet is set */}
{robot.config.ownerWallet && robot.config.walletSource === 'privy_created' && (
  <RobotPayoutButton robotId={robot.config.id} />
)}
```

#### 4.3 Create Payout Button Component

**File**: `src/components/features/RobotPayoutButton.tsx` (NEW)

```tsx
import { useState } from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  VStack,
  useDisclosure,
  useToast,
  Link,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { robotManagementApi } from '../../services/robotManagementApi';

interface RobotPayoutButtonProps {
  robotId: string;
}

export function RobotPayoutButton({ robotId }: RobotPayoutButtonProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: string;
    txHash: string | null;
    amount: string;
  } | null>(null);
  const toast = useToast();

  const handlePayout = async () => {
    setIsLoading(true);
    try {
      const response = await robotManagementApi.payoutToOwner(robotId);

      setResult({
        status: response.status,
        txHash: response.transaction_hash,
        amount: response.amount_wei,
      });

      if (response.status === 'success') {
        toast({
          title: 'Payout successful',
          description: `Transferred ${formatWei(response.amount_wei)} to owner wallet`,
          status: 'success',
          duration: 5000,
        });
      } else if (response.status === 'no_funds') {
        toast({
          title: 'No funds available',
          description: 'Robot wallet has no funds to transfer',
          status: 'warning',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Payout failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button size="sm" colorScheme="green" variant="outline" onClick={onOpen}>
        Collect Earnings
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Collect Robot Earnings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text>
                Transfer all available funds from the robot's wallet to the owner's wallet.
              </Text>

              {result?.status === 'success' && result.txHash && (
                <Link
                  href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                  isExternal
                  color="blue.500"
                >
                  View transaction <ExternalLinkIcon mx="2px" />
                </Link>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Close
            </Button>
            <Button
              colorScheme="green"
              onClick={handlePayout}
              isLoading={isLoading}
              loadingText="Processing..."
            >
              Transfer Funds
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function formatWei(wei: string): string {
  const eth = Number(wei) / 1e18;
  return `${eth.toFixed(6)} ETH`;
}
```

---

### Phase 5: Payment Integration Update

#### 5.1 Modify Payment Flow

The payment flow already sends `robot_host` to the backend. The backend now looks up the robot's wallet and uses it for payment. No frontend changes needed for payment destination.

However, we should display which wallet will receive payment:

**File**: `src/components/features/PurchaseAccessButton.tsx` (MODIFY)

```tsx
// Show the robot's wallet that will receive payment
<Text fontSize="sm" color="gray.500">
  Payment will go to robot wallet:
</Text>
<Text fontFamily="mono" fontSize="xs">
  {activeRobot.config.walletAddress}
</Text>
```

---

### Phase 6: Sync on App Load

#### 6.1 Add Sync Effect

**File**: `src/App.tsx` or `src/providers/RobotProvider.tsx` (MODIFY)

```tsx
import { useEffect } from 'react';
import { useRobotStore } from './stores/robotStore';

function App() {
  const syncFromBackend = useRobotStore((state) => state.syncFromBackend);
  const isLoading = useRobotStore((state) => state.isLoading);

  // Sync robots from backend on app load
  useEffect(() => {
    syncFromBackend();
  }, [syncFromBackend]);

  if (isLoading) {
    return <LoadingSpinner message="Loading robots..." />;
  }

  // ... rest of app
}
```

---

## UI/UX Summary

### Add Robot Flow

1. User clicks "Add Robot"
2. Modal opens with form
3. User enters name, IPs
4. User selects wallet option:
   - **"Create new wallet"** (default) → Backend creates via Privy
   - **"Use existing wallet"** → User enters 0x address
5. Click "Add Robot"
6. Backend creates robot, returns wallet info
7. Toast shows success with wallet info
8. Robot appears in list with wallet display

### Robot Display

```
┌────────────────────────────────────────────────┐
│  🤖 Tumbller-1                    [🔌 Online]  │
│  Motor: 192.168.1.100                          │
│  Camera: 192.168.1.101                         │
│                                                │
│  💰 Wallet: 0x1234...5678  [📋]  [Privy]       │
│  👤 Owner:  0xabcd...ef01  [📋]                │
│                                                │
│  [Collect Earnings]                            │
│                                                │
│  [▶ Forward] [◀ Back] [↺ Left] [↻ Right]      │
└────────────────────────────────────────────────┘
```

### Purchase Access

```
┌────────────────────────────────────────────────┐
│  Purchase Robot Access                          │
│                                                │
│  Duration: 10 minutes                          │
│  Price: $0.10 USDC                             │
│                                                │
│  Payment goes to:                              │
│  0x1234567890abcdef1234567890abcdef12345678   │
│  (Tumbller-1's wallet)                         │
│                                                │
│  [💳 Purchase Access]                          │
└────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/services/robotManagementApi.ts` | CREATE | Backend API client for robot CRUD + payout |
| `src/stores/robotStore.ts` | MODIFY | Add wallet fields, owner_wallet, backend sync |
| `src/components/features/AddRobotForm.tsx` | MODIFY | Add wallet option + owner wallet field |
| `src/components/features/RobotWalletDisplay.tsx` | CREATE | Wallet address with copy button |
| `src/components/features/RobotPayoutButton.tsx` | CREATE | Collect earnings modal + button |
| `src/components/features/RobotConnection.tsx` | MODIFY | Show wallet display + payout button |
| `src/components/features/PurchaseAccessButton.tsx` | MODIFY | Show target wallet |
| `src/App.tsx` | MODIFY | Sync robots on load |
| `src/types/robot.ts` | MODIFY | Add wallet types |

---

## Dependencies

No new npm dependencies required. Uses existing:
- Chakra UI (copy, tooltips, badges)
- React Hook Form + Zod (form validation)
- Zustand (state management)

---

## Testing Plan

1. **Unit tests**: Form validation, wallet display component
2. **Integration tests**: Add robot flow, sync from backend
3. **E2E tests**: Full flow from add robot to payment

---

## Open Questions

1. **Offline handling**: What if backend is down during sync?
2. **Local fallback**: Keep localStorage as cache/fallback?
3. **Sync frequency**: Sync on every page load or background polling?
4. **Payout confirmation**: Should we require user confirmation before payout?

---

## References

- [Privy Documentation](https://docs.privy.io/)
- [Chakra UI Clipboard](https://chakra-ui.com/docs/hooks/use-clipboard)
- [React Hook Form](https://react-hook-form.com/)
