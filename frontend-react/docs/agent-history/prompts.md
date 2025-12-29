# Prompts Library

> **Purpose**: Store prompts that actually worked well in previous sessions.
> These are proven prompts - use them as-is or adapt for similar tasks.

---

## Index

- [Component Development](#component-development)
- [Wallet Integration](#wallet-integration)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [Debugging](#debugging)

---

## Component Development

### Create Modal with User Input (Worked: 2025-12-29)

**Context**: Needed modal for user to specify ETH amount for gas funding

**Prompt Used**:
```
Let the user decide on the amount of eth they want to fund
```

**Result**:
- Created `FundPrivyWalletModal` with ETH amount input
- Added USD conversion display using CoinGecko price API
- Transaction signing and status feedback

**Notes**:
- Let users control amounts rather than auto-transferring
- Show USD equivalent so users understand cost
- Provide clear feedback during transaction

---

### Update Button to Show Multiple Values (Worked: 2025-12-29)

**Context**: Needed to show both USDC and ETH balances beside collect button

**Prompt Used**:
```
The transfer button should only transfer the USDC collected and the balance should show both usdc and eth balance
```

**Result**:
- Added two badges: green for USDC, blue for ETH
- Changed button text to "Collect USDC"
- Added refresh balance button

**Notes**:
- Use color-coded badges for different value types
- Separate concerns: display vs action

---

## Wallet Integration

### Display Wallet Balance (Worked: 2025-12-29)

**Context**: Needed to show Privy wallet funds in UI

**Prompt Used**:
```
Okay, let's use the privy to show the funds in the privy wallet beside the collect earnings button
```

**Result**:
- Added `getWalletBalance()` API call
- Display balance badges in `RobotPayoutButton`
- Auto-fetch on component mount with manual refresh

**Notes**:
- Fetch balance on mount, not continuously
- Provide manual refresh button
- Handle loading state with spinner

---

### Send ETH Transaction from Frontend (Worked: 2025-12-29)

**Context**: Need to fund Privy wallet with ETH from user's connected wallet

**What Worked**:
```typescript
import { parseEther } from 'ethers';

const handleFund = async () => {
  const signer = await getSigner();
  const tx = await signer.sendTransaction({
    to: privyWalletAddress,
    value: parseEther(ethAmount),
  });
  await tx.wait();
};
```

**Notes**:
- Use `parseEther()` to convert string to wei
- Call `tx.wait()` to wait for confirmation
- Handle errors with try/catch and show toast

---

## State Management

### Handle Missing Fields in Persisted State (Worked: 2025-12-29)

**Context**: Schema changed, old localStorage missing new required fields

**What Worked**:
```typescript
// In Zustand persist merge function
merge: (persistedState, currentState) => {
  const persisted = persistedState as PersistedState;
  // Filter out robots without required wallet fields
  const validRobots = (persisted.robots || []).filter(
    ([, robot]) => robot.walletAddress && robot.walletSource
  );
  const robots = new Map(validRobots.map(([id, robot]) => [
    id,
    { ...robot, connectionStatus: 'disconnected' as const }
  ]));
  return { ...currentState, robots };
}
```

**Notes**:
- Filter invalid entries instead of crashing
- Reset transient state (like connectionStatus) on load
- Type cast persisted state for TypeScript

---

## API Integration

### Add New API Endpoint Method (Worked: 2025-12-29)

**Context**: Needed to call new backend balance endpoint

**Pattern**:
```typescript
// In robotManagementApi.ts
async getWalletBalance(robotId: string): Promise<WalletBalanceResponse> {
  const response = await fetch(`${this.baseUrl}/robots/${robotId}/balance`);
  if (!response.ok) {
    throw new Error(`Failed to get balance: ${response.statusText}`);
  }
  return response.json();
}
```

**Notes**:
- Follow existing patterns in the API file
- Always check `response.ok`
- Return typed response

---

## Debugging

### Debug CORS Error That's Actually Backend Error (Worked: 2025-12-29)

**Context**: Frontend showed CORS error but real issue was 500 from backend

**Prompt Sequence**:
```
I get this error Access to fetch at 'http://localhost:8000/...' has been blocked by CORS policy...
```

```
the python server is running just use curl
```

**Result**:
- Used curl to bypass CORS and see actual error
- Backend returned 500 due to Privy API format issue
- Fixed backend, frontend worked

**Notes**:
- CORS errors often mask real backend errors
- Test API with curl to see actual response
- Check backend logs for the real error

---

## Prompts That Didn't Work

### Auto-Fund on Wallet Creation

**Prompt**:
```
Let's change the creation of privy wallet so that 1 dollar of eth is transferred on the eth base network to the privy wallet for gas fees from the login wallet
```

**Why It Didn't Work**: User rejected auto-funding approach

**Better Approach**: Let user decide the amount with a modal

---

## Tips for Writing Effective Prompts

Based on what worked in this project:

1. **Be specific about UI changes**: "show both usdc and eth balance" is clearer than "show the balances"
2. **Mention the component**: Reference specific files or components when possible
3. **Describe the user flow**: "Let the user decide" helps guide UX decisions
4. **Reference existing patterns**: "like the existing button" helps maintain consistency
5. **State the goal, not just the implementation**: "for gas fees" explains why, not just what

---

## How to Add Entries

When a prompt works well:

1. Copy the exact prompt you used
2. Note the context (what you were trying to do)
3. Record the result (what happened)
4. Add any tips for reuse
5. Include the date for reference

When a prompt fails:
1. Document it in "Prompts That Didn't Work"
2. Note what went wrong
3. Add what worked instead
