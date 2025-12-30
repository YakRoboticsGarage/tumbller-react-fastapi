# Privy Wallet Authentication Guide

This guide explains how to use Privy for wallet-based authentication in the Tumbller Robot Control application.

## Overview

Privy provides wallet-based authentication as an alternative to Logto (email/social login). Users connect their existing Web3 wallets (MetaMask, Coinbase Wallet, WalletConnect) to authenticate.

**Key features:**
- Wallet-only login (no embedded wallet creation)
- Users must have an existing wallet
- Automatic wallet connection after login
- Seamless integration with x402 payment flow

## Setup

### 1. Get Privy App ID

1. Sign up at [dashboard.privy.io](https://dashboard.privy.io)
2. Create a new app: "Tumbller Robot Control"
3. Configure your app:
   - **Login methods**: Wallet
   - **Allowed origins**: `http://localhost:5173` (development), your production URL
   - **Supported chains**: Base Sepolia, Base Mainnet
4. Copy your **App ID**

### 2. Configure Environment Variables

Update your `frontend-react/.env` file:

```env
# Enable authentication
VITE_ENABLE_AUTH=true

# Use Privy for wallet-based login
VITE_AUTH_METHOD=privy

# Your Privy App ID
VITE_PRIVY_APP_ID=your_privy_app_id_here

# Network configuration (must match backend)
VITE_X402_NETWORK=base-sepolia
```

### 3. Start the Application

```bash
cd frontend-react
pnpm dev
```

Visit http://localhost:5173 - you should see the wallet login page.

## User Flow

### Login Flow

1. User visits the application
2. **Wallet Login Page** appears with "Connect Wallet" button
3. User clicks the button
4. **Privy modal** opens with wallet options:
   - MetaMask
   - Coinbase Wallet
   - WalletConnect
5. User selects their wallet and approves the connection
6. User is authenticated and redirected to the robot control page
7. Wallet is automatically connected for session payments

### Logout Flow

1. User clicks "Log Out" button in the header
2. Privy session is cleared
3. User is redirected to the login page

## Differences from Logto Authentication

| Feature | Logto | Privy |
|---------|-------|-------|
| Login method | Email, Social | Wallet only |
| Wallet connection | Manual (separate step) | Automatic (via login) |
| User identity | Email/username | Wallet address |
| Session payment | Requires manual wallet connect | Auto-connected |

## Configuration Options

### Switch Between Auth Methods

To switch back to Logto:

```env
VITE_AUTH_METHOD=logto
VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
VITE_LOGTO_APP_ID=your_logto_app_id
```

### Disable Authentication

For development/testing without authentication:

```env
VITE_ENABLE_AUTH=false
```

## Troubleshooting

### "Privy App ID is missing"

**Cause**: `VITE_PRIVY_APP_ID` is not set in your `.env` file.

**Solution**:
1. Get your App ID from [dashboard.privy.io](https://dashboard.privy.io)
2. Add it to your `.env` file
3. Restart the dev server (`pnpm dev`)

### "No wallet detected"

**Cause**: User doesn't have a Web3 wallet installed.

**Solution**: Users must install MetaMask, Coinbase Wallet, or another WalletConnect-compatible wallet before they can log in. Privy is configured to NOT create embedded wallets.

### Session payment fails

**Cause**: Wallet may be on wrong network.

**Solution**:
1. Check the wallet is connected to the correct network (Base Sepolia for testnet)
2. Use the "Switch Chain" option in the wallet dropdown if available
3. Ensure wallet has USDC for payment (or payments are disabled on backend)

### Wallet connected but session not working

**Cause**: Backend may not recognize the wallet address.

**Solution**:
1. Check browser console for errors
2. Verify backend is running and accessible
3. Check `VITE_API_URL` in `.env` points to correct backend

## Technical Details

### Files Changed

| File | Purpose |
|------|---------|
| `src/config/privy.ts` | Privy configuration (wallet-only, no embedded wallets) |
| `src/providers/PrivyAuthProvider.tsx` | Privy provider wrapper |
| `src/providers/AuthProvider.tsx` | Toggle between Logto and Privy |
| `src/hooks/usePrivyAuth.ts` | Privy authentication hook |
| `src/hooks/useAuth.ts` | Unified auth interface |
| `src/hooks/useWallet.ts` | Unified wallet interface (supports Privy) |
| `src/pages/WalletLoginPage.tsx` | Wallet login UI |
| `src/components/common/ProtectedRoute.tsx` | Shows correct login page |
| `src/components/common/LogoutButton.tsx` | Works with both auth methods |
| `src/components/common/UserProfile.tsx` | Shows wallet address for Privy |
| `src/components/common/WalletButton.tsx` | Adapted for Privy mode |
| `src/components/common/LoginButton.tsx` | Only shows for Logto mode |

### Privy Configuration

The Privy SDK is configured in `src/config/privy.ts`:

```typescript
export const PRIVY_CONFIG: PrivyClientConfig = {
  // No embedded wallets - users must bring their own
  embeddedWallets: {
    createOnLogin: 'off',
  },

  // Supported chains
  defaultChain: baseSepolia, // or base for mainnet
  supportedChains: [baseSepolia, base],

  // Appearance
  appearance: {
    theme: 'light',
    accentColor: '#f97316', // Brand orange
    landingHeader: 'Connect Your Wallet',
    loginMessage: 'Connect your wallet to access Tumbller robot control',
    walletList: ['metamask', 'coinbase_wallet', 'wallet_connect', 'detected_wallets'],
  },
};
```

### Wallet Integration

When using Privy auth, the `useWallet()` hook automatically:
1. Gets the wallet address from Privy (instead of manual connection)
2. Provides a signer for x402 payments
3. Handles chain switching

This means:
- No separate "Connect Wallet" button needed
- Session payments work immediately after login
- Logout disconnects the wallet

## Best Practices

1. **Always test with real wallets** - Use MetaMask or Coinbase Wallet with Base Sepolia testnet
2. **Keep Logto as fallback** - Set `VITE_AUTH_METHOD=logto` if Privy has issues
3. **Check network** - Ensure wallet is on correct network before testing payments
4. **Clear localStorage** - If issues persist, clear browser localStorage and retry

## Resources

- [Privy Documentation](https://docs.privy.io/)
- [Privy React SDK](https://docs.privy.io/guide/react)
- [Privy Logout](https://docs.privy.io/authentication/user-authentication/logout)
- [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia) - Get testnet ETH
