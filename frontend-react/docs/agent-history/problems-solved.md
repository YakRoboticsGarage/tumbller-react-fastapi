# Problems Solved

> **Purpose**: Document solutions to problems encountered during development.
> **Before debugging**: Search this file - the problem may have been solved before.

---

## Index by Category

- [State Management](#state-management)
- [React Hooks & Context](#react-hooks--context)
- [Wallet & Payment Integration](#wallet--payment-integration)
- [UI & Component Rendering](#ui--component-rendering)
- [API & Backend Communication](#api--backend-communication)
- [Performance](#performance)
- [x402 Payment Integration Issues](#x402-payment-integration-issues)

---

## State Management

### useSession Hook Not Sharing State Across Components

**Date**: 2024-12-28

**Symptoms**:
After purchasing access, the controls didn't appear. User had to disconnect and reconnect wallet to see the controls.

**Root Cause**:
Each call to `useSession()` created its own independent state. When `usePayment` called `setSessionDirectly` after a successful purchase, it only updated ITS instance of the session state, not the instances in `RobotControlPage`, `PurchaseAccess`, or `SessionStatus`.

```typescript
// Problem: Each component had its own state
// RobotControlPage.tsx
const { hasActiveSession } = useSession(); // Instance 1

// PurchaseAccess.tsx
const { hasActiveSession } = useSession(); // Instance 2

// usePayment.ts
const { setSessionDirectly } = useSession(); // Instance 3 - updates only this!
```

**Solution**:
Created a `SessionProvider` context to share session state across all components:

```typescript
// src/providers/SessionProvider.tsx
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<SessionStatus | null>(null);
  // ... all session state and logic

  return (
    <SessionContext.Provider value={{ hasActiveSession, setSessionDirectly, ... }}>
      {children}
    </SessionContext.Provider>
  );
}

// src/hooks/useSession.ts - now just wraps context
export function useSession() {
  return useSessionContext();
}

// src/main.tsx - add provider
<WalletProvider>
  <SessionProvider>
    <App />
  </SessionProvider>
</WalletProvider>
```

**Prevention**:
- When state needs to be shared across multiple components, use Context or Zustand
- React hooks with `useState` create independent state per component instance
- If a hook is called in multiple places and needs shared state, wrap it in a provider

**Related Files**:
- `src/providers/SessionProvider.tsx` (new)
- `src/hooks/useSession.ts`
- `src/main.tsx`

---

### Robot Connection Status Not Updating in Parent Component

**Date**: 2024-12-28

**Symptoms**:
After connecting to robot, controls didn't appear even though robot showed as "Connected".

**Root Cause**:
The `activeRobot` in `RobotControlPage` was derived from a Map lookup, which didn't trigger re-renders when the robot's internal state changed:

```typescript
// Problem: Derived value doesn't trigger re-render
const activeRobot = activeRobotId ? robots.get(activeRobotId) : undefined
```

**Solution**:
Use a Zustand selector that subscribes directly to the state:

```typescript
// Solution: Direct selector subscription
const activeRobot = useRobotStore((state) =>
  state.activeRobotId ? state.robots.get(state.activeRobotId) : undefined
);
```

**Prevention**:
- Use Zustand selectors for derived state that needs to trigger re-renders
- Don't derive state from other variables when reactivity is needed

**Related Files**: `src/pages/RobotControlPage.tsx`

---

### Robot Status Persisting After Page Reload

**Date**: 2024-12-28

**Symptoms**:
Robot showed as "online" after page reload, even though no connection was active. This caused the disconnect effect to run immediately and disconnect the robot.

**Root Cause**:
Zustand's persist middleware was saving `connectionStatus: 'online'` to localStorage. On reload, the robot appeared online but wasn't actually connected.

**Solution**:
Reset connection status to 'disconnected' when loading from storage:

```typescript
// src/stores/robotStore.ts
merge: (persistedState, currentState) => {
  // Reset connection status to 'disconnected' on load
  const robots = new Map(
    (persisted.robots || []).map(([id, robot]) => [
      id,
      { ...robot, connectionStatus: 'disconnected' as const, cameraStatus: 'disconnected' as const }
    ])
  );
  return { ...currentState, robots, ... };
}
```

**Prevention**:
- Don't persist transient state like connection status
- Reset runtime state in the merge function when using persist middleware

**Related Files**: `src/stores/robotStore.ts`

---

## React Hooks & Context

### Effect Running on Mount Instead of State Change

**Date**: 2024-12-28

**Symptoms**:
Robot disconnected immediately on page load when wallet was not connected, even though the robot was legitimately online from a previous session.

**Root Cause**:
The useEffect that disconnects robot when wallet disconnects ran on initial mount:

```typescript
// Problem: Runs on mount too
useEffect(() => {
  if (!isWalletConnected && robot.connectionStatus === 'online') {
    updateRobotStatus(robot.config.id, { connectionStatus: 'disconnected' });
  }
}, [isWalletConnected, robot.connectionStatus, ...]);
```

**Solution**:
Track previous value with useRef to only act on changes:

```typescript
const prevWalletConnected = useRef(isWalletConnected);

useEffect(() => {
  // Only act when wallet changes from connected to disconnected
  if (prevWalletConnected.current && !isWalletConnected && robot.connectionStatus === 'online') {
    updateRobotStatus(robot.config.id, { connectionStatus: 'disconnected' });
  }
  prevWalletConnected.current = isWalletConnected;
}, [isWalletConnected, robot.connectionStatus, ...]);
```

**Prevention**:
- Use useRef to track previous values when you need to detect changes
- Effects run on mount - consider if that's desired behavior

**Related Files**: `src/components/features/RobotConnection.tsx`

---

## Wallet & Payment Integration

### Wallet Address Not Available When Session Check Runs

**Date**: 2024-12-28

**Symptoms**:
Session check failed silently after wallet connection because `address` was not yet set.

**Root Cause**:
The `refreshSession` callback depended on `address`, but the effect that called it depended on `isConnected`. There was a timing issue where `isConnected` became true before `address` was set.

**Solution**:
Ensure both `address` and `isConnected` are set atomically in the wallet provider:

```typescript
// src/providers/WalletProvider.tsx
setState({
  address: accounts[0],
  isConnected: true,
  chainId: Number(network.chainId),
});
```

And check for `address` in the callback:

```typescript
const refreshSession = useCallback(async (showLoading?: boolean) => {
  if (!address) {
    setSession(null);
    return;
  }
  // ... fetch session
}, [address]);
```

**Prevention**:
- Always check for required dependencies in callbacks
- Set related state values atomically

**Related Files**: `src/providers/WalletProvider.tsx`, `src/providers/SessionProvider.tsx`

---

## UI & Component Rendering

### Controls Section Not Showing After Purchase

**Date**: 2024-12-28

**Symptoms**:
After getting access, had to disconnect/reconnect wallet multiple times to see controls.

**Root Cause**:
Multiple issues combined:
1. Session state not shared (see above)
2. Robot connection state not reactive (see above)
3. No loading state shown during session check

**Solution**:
Added explicit loading state:

```typescript
{isSessionLoading ? (
  <Box p={6} textAlign="center">
    <Text color="gray.500">Checking session...</Text>
  </Box>
) : !hasActiveSession ? (
  <PurchaseAccess ... />
) : (
  <>
    <CameraStream />
    <MotorControls />
  </>
)}
```

**Prevention**:
- Always handle loading states explicitly
- Show feedback during async operations

**Related Files**: `src/pages/RobotControlPage.tsx`

---

## API & Backend Communication

### Robot Host vs Robot Name Confusion

**Date**: 2024-12-28

**Symptoms**:
Error: "Robot 'Tumbller-2' is offline" when trying to purchase access.

**Root Cause**:
`PurchaseAccess` was receiving the robot's display name instead of the actual IP/mDNS host:

```typescript
// Wrong
<PurchaseAccess robotHost={activeRobot.config.name} ... />

// Correct
<PurchaseAccess robotHost={activeRobot.config.motorIp} ... />
```

**Solution**:
Use `motorIp` for backend communication, `name` for display:

```typescript
<PurchaseAccess
  robotHost={activeRobot.config.motorIp}  // For backend API
  robotName={activeRobot.config.name}      // For UI display
/>
```

**Prevention**:
- Clearly distinguish between display names and identifiers
- Consider naming: `robotHost` vs `robotDisplayName`

**Related Files**: `src/pages/RobotControlPage.tsx`

---

## Performance

### UI Slow After Getting Access

**Date**: 2024-12-28

**Symptoms**:
After purchasing access, UI was very slow and unresponsive. Controls appeared with delay.

**Root Cause**:
1. Session refresh showed loading indicator on every refresh
2. Countdown timer recreated every second due to wrong dependency
3. Extra API call made after purchase instead of using response data

**Solution**:

1. Only show loading on initial fetch:
```typescript
const refreshSession = useCallback(async (showLoading?: boolean) => {
  if (showLoading) {
    setIsLoading(true);
  }
  // ... fetch
}, [address]);
```

2. Fix timer dependency:
```typescript
const isTimerActive = remainingSeconds > 0;

useEffect(() => {
  if (!isTimerActive) return;
  const timer = setInterval(...);
  return () => clearInterval(timer);
}, [isTimerActive]); // Not [remainingSeconds]
```

3. Use session from purchase response:
```typescript
if (result.success && result.result?.session) {
  setSessionDirectly(result.result.session, result.result.payment_tx);
}
```

**Prevention**:
- Avoid showing loading states for background operations
- Be careful with effect dependencies - use booleans instead of changing values
- Reuse data from API responses instead of making extra calls

**Related Files**:
- `src/providers/SessionProvider.tsx`
- `src/hooks/usePayment.ts`

---

### Camera Constantly Pinging Backend

**Date**: 2024-12-28

**Symptoms**:
Camera was constantly making requests to backend even when user didn't need it.

**Root Cause**:
Camera started polling automatically on component mount.

**Solution**:
Added manual "Connect Camera" button - only poll when user explicitly requests:

```typescript
const [isConnected, setIsConnected] = useState(false);

if (!isConnected) {
  return (
    <Button onClick={() => setIsConnected(true)}>
      Connect Camera
    </Button>
  );
}

// Only poll when isConnected is true
useEffect(() => {
  if (!isConnected) return;
  // ... polling logic
}, [isConnected]);
```

**Prevention**:
- Don't auto-start expensive operations
- Let users opt-in to resource-intensive features

**Related Files**: `src/components/features/CameraStream.tsx`

---

## Common React Patterns Reference

### Shared State Pattern
```typescript
// ❌ Wrong - each call creates new state
function useMyHook() {
  const [state, setState] = useState(initial);
  return { state, setState };
}

// ✅ Correct - shared via context
const MyContext = createContext(null);
function MyProvider({ children }) {
  const [state, setState] = useState(initial);
  return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>;
}
function useMyHook() {
  return useContext(MyContext);
}
```

### Effect on Change (Not Mount)
```typescript
// ❌ Wrong - runs on mount
useEffect(() => {
  if (condition) doSomething();
}, [condition]);

// ✅ Correct - only on change
const prevValue = useRef(value);
useEffect(() => {
  if (prevValue.current !== value) {
    doSomething();
  }
  prevValue.current = value;
}, [value]);
```

### Zustand Reactivity
```typescript
// ❌ Wrong - derived value not reactive
const robots = useStore(s => s.robots);
const activeRobot = robots.get(activeId);

// ✅ Correct - selector is reactive
const activeRobot = useStore(s => s.robots.get(s.activeId));
```

---

## x402 Payment Integration Issues

### x402 Payment Flow Not Working - 402 Returned But Payment Not Processed

**Date**: 2024-12-28

**Symptoms**:
User clicks "Get Access", gets 402 Payment Required from backend, but payment flow doesn't complete. Error: "Failed to fetch" or "Invalid payment requirements - header may be empty".

**Root Cause**:
Multiple issues combined:

1. **Wrong header name**: Code used `X-Payment-Required` but x402 protocol uses `PAYMENT-REQUIRED`
2. **CORS not exposing header**: Frontend couldn't read the `PAYMENT-REQUIRED` response header
3. **Custom EIP-712 signature**: Frontend tried to manually sign payments but x402 uses EIP-3009 `TransferWithAuthorization`
4. **Wrong client library**: Need official `@x402/evm` package, not custom implementation

**Solution**:

1. Use official x402 client packages:
```bash
pnpm add @x402/core @x402/evm @x402/fetch
```

2. Update backend CORS to expose x402 headers:
```python
# backend-fastapi/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["PAYMENT-REQUIRED", "X-PAYMENT-RESPONSE"],
)
```

3. Use `@x402/fetch` wrapper with `ExactEvmClientV1`:
```typescript
// src/services/paymentClient.ts
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { ExactEvmClientV1 } from '@x402/evm/v1';

// Adapter for ethers.js Signer to x402 ClientEvmSigner
function createX402Signer(signer: Signer, address: string) {
  return {
    address: address as `0x${string}`,
    async signTypedData(message) {
      const types = { ...message.types };
      delete types['EIP712Domain'];
      return await signer.signTypedData(message.domain, types, message.message);
    },
  };
}

// Create client with V1 scheme (base-sepolia uses V1 network names)
const client = new x402Client().registerSchemeV1(
  'base-sepolia',
  new ExactEvmClientV1(x402Signer)
);

// Wrap fetch - handles 402 flow automatically
const fetchWithPayment = wrapFetchWithPayment(fetch, client);
```

4. Wrap x402 middleware to add CORS headers to 402 responses:
```python
# x402 middleware runs before CORS, so 402 responses bypass CORS
async def x402_with_cors_support(request: Request, call_next) -> Response:
    origin = request.headers.get("origin", "")

    if request.method == "OPTIONS":
        return await call_next(request)

    response = await x402_middleware(request, call_next)

    # Add CORS headers to 402 responses manually
    if response.status_code == 402 and origin in settings.cors_origins:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Expose-Headers"] = "PAYMENT-REQUIRED, X-PAYMENT-RESPONSE"

    return response
```

5. Extract transaction hash from `X-PAYMENT-RESPONSE` header (set by facilitator after settlement):
```typescript
// src/services/paymentClient.ts
import { decodePaymentResponseHeader } from '@x402/fetch';

// After successful purchase response
const paymentResponseHeader = response.headers.get('X-PAYMENT-RESPONSE');
if (paymentResponseHeader) {
  const paymentResponse = decodePaymentResponseHeader(paymentResponseHeader);
  if (paymentResponse.transaction) {
    result.payment_tx = paymentResponse.transaction;
  }
}
```

**Prevention**:
- Use official x402 client libraries, not custom implementations
- x402 uses EIP-3009 `TransferWithAuthorization`, not generic EIP-712
- Always expose custom headers in CORS config
- Check x402 protocol docs for correct header names: `PAYMENT-REQUIRED`, `X-PAYMENT`, `X-PAYMENT-RESPONSE`
- FastAPI middleware runs in LIFO order - x402 middleware added after CORS will run BEFORE CORS
- 402 responses from x402 bypass CORS middleware, need manual CORS headers
- Transaction hash comes from `X-PAYMENT-RESPONSE` header, not from route handler (settlement happens after handler returns)

**Related Files**:
- `src/services/paymentClient.ts`
- `backend-fastapi/app/main.py`

**References**:
- [x402 Protocol](https://www.x402.org/)
- [@x402/evm on npm](https://www.npmjs.com/package/@x402/evm)
- [Coinbase x402 GitHub](https://github.com/coinbase/x402)

---

## How to Add Entries

When you solve a problem:

1. **Identify category** (or create new one)
2. **Copy the error message** exactly
3. **Document root cause** - why it happened
4. **Show the fix** - actual code, not description
5. **Add prevention** - how to avoid next time
6. **Link related files** - where the fix was applied

**Good entry** = Someone else can fix the same issue in 2 minutes

**Bad entry** = "Fixed the state thing"
