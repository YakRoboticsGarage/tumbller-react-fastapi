# Changelog

All notable changes to the Tumbller Robot Control project.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
-

### Changed
-

### Fixed
-

---

## [1.3.0] - 2025-12-28

### Added
- **ENS (Ethereum Name Service) Integration**:
  - `useEns` hook for resolving wallet addresses to ENS names
  - Display ENS names in wallet UI when available
  - Fallback to truncated address when no ENS name exists
  - Automatic resolution on wallet connection

- **Enhanced Wallet UI**:
  - "View Details" modal replacing inline address display
  - Full address display with copy-to-clipboard functionality
  - ENS name display in modal header (when available)
  - "Wallet Connected" status text in main button
  - Improved visual hierarchy and user experience

- **Network Configuration**:
  - `VITE_X402_NETWORK` environment variable for network switching
  - Support for "base-sepolia" (testnet, default) and "base" (mainnet)
  - Consistent network configuration with backend
  - Network-aware explorer links for transaction viewing

- **Multi-Wallet Support Enhancement**:
  - Wallet provider detection system (`getPreferredProvider`)
  - Automatic prioritization of Coinbase Wallet over MetaMask
  - Support for `window.ethereum.providers` array
  - Graceful fallback to default provider when only one wallet installed

### Changed
- **WalletButton Component**: Redesigned to show modal instead of inline address
  - "View Details" button opens modal with full wallet information
  - Cleaner header layout with better spacing
  - Modal includes ENS name, full address, and copy functionality

- **Robot Management UI**:
  - Robot IPs hidden by default with "Show Details" toggle
  - Robot dropdown shows only robot name (no IP display)
  - Add Robot button moved to left alignment
  - Improved visual hierarchy and reduced clutter

- **Session Management**:
  - Explorer links now use configured network from `VITE_X402_NETWORK`
  - Transaction links properly route to testnet or mainnet explorer

### Technical Details
- ENS resolution uses Ethereum public resolver contract
- Wallet provider selection handles multi-wallet browser extensions
- Network configuration validated at app initialization
- Copy functionality uses Clipboard API with toast feedback

---

## [1.2.1] - 2025-12-28

### Added
- **x402 Payment Integration**:
  - Complete payment flow with Base Sepolia USDC
  - Session-based access control with wallet addresses
  - Payment configuration from backend API
  - Transaction hash extraction from payment headers
  - Session status monitoring and display

- **Wallet Integration**:
  - MetaMask and Coinbase Wallet support
  - EIP-1193 provider detection
  - Wallet connection state management
  - Address display with truncation
  - Network switching to Base Sepolia

- **Session Management**:
  - `SessionProvider` with React Context
  - `useSession` hook for access control
  - Session status polling (active/expired)
  - Automatic session refresh on wallet connection
  - Session expiry countdown display

### Changed
- **Robot Control**: Now requires active payment session
- **Camera Stream**: Proxied through backend with session validation
- **Motor Controls**: Session-aware with automatic disable on expiry

### Technical Details
- Payment client uses x402 protocol
- USDC token address: Base Sepolia testnet
- Session duration: 1 hour (configurable)
- Backend proxy for robot communication

---

## [1.0.0] - 2024-12-26

### Added - Core Features

#### Robot Management
- Multi-robot configuration system with unique IDs
- Add/remove robots via UI form
- Robot dropdown selector
- Default robot initialization from `.env` file
- Persistent storage using Zustand + localStorage
- Robot configurations survive page refresh

#### Connection System
- Manual connection workflow (explicit "Connect" button)
- Connection state machine: disconnected → connecting → online/offline
- Online/offline status badges with visual indicators
- Connection health checks to motor controller
- Retry connection capability
- Detailed offline error messages with troubleshooting checklist

#### Motor Controls
- Four directional movement buttons (forward, back, left, right)
- React Query mutations for command sending
- Loading states during command execution
- Error handling with toast notifications
- Controls only visible when robot status is 'online'
- 5-second timeout for motor commands

#### Camera Stream
- Dual-mode camera display system
- **Full Interface Mode**: ESP-CAM native HTML page embedded in iframe
- **Stream Only Mode**: JavaScript-based polling of /getImage endpoint
- 1-second polling interval for smooth stream
- Image preloading to prevent flicker
- 5-failure retry tolerance with auto-recovery
- Centered stream display
- Fallback error state with diagnostic information
- Mode toggle buttons for easy switching

#### User Interface
- Custom orange/yellow/brown theme
- Brand orange (#f97316) for primary actions
- Accent yellow (#eab308) for highlights
- Brown tones for text and neutrals
- Responsive layout with Chakra UI
- Plus Jakarta Sans for headings
- Inter font for body text
- Custom button hover animations (lift effect)
- Custom scrollbar styling (orange themed)
- Text selection highlighting (yellow)

#### Developer Experience
- TypeScript strict mode
- ESLint configuration
- Vite 6 for fast development
- Hot module replacement (HMR)
- Environment variable support via `.env`
- Component-based architecture
- Comprehensive documentation

### Technical Implementation

#### State Management
- Zustand store with persistence middleware
- Map data structure for robot storage
- Custom serialization for Map ↔ JSON conversion
- Partial state persistence (configs persist, status doesn't)

#### API Communication
- RESTful HTTP service layer (`robotApi.ts`)
- no-cors mode for ESP32 compatibility
- Timeout handling (2s for health checks, 5s for commands)
- Error boundary patterns

#### Form Handling
- React Hook Form integration
- Zod schema validation
- IP address validation with optional port
- Toast feedback for form submissions
- Modal close callback pattern

### Fixed Issues

#### Issue #1: Modal Not Closing
- **Problem**: "Add Robot" dialog stayed open after submission
- **Solution**: Added `onSuccess` callback prop to `AddRobotForm`
- **Files**: `AddRobotForm.tsx`, `RobotControlPage.tsx`

#### Issue #2: Connect Button Not Visible
- **Problem**: Button failed to render for 'disconnected' state
- **Root Cause**: Complex nested ternary operators
- **Solution**: Simplified to explicit single ternary chain
- **Files**: `RobotConnection.tsx:82-136`

#### Issue #3: Camera Stream Errors
- **Problem**: Immediate "No Camera Available" error in Stream Only mode
- **Root Causes**:
  - Pre-flight check failing with no-cors
  - No retry tolerance
  - No auto-recovery
- **Solution**:
  - Removed pre-flight check
  - Implemented 5-failure tolerance
  - Added auto-recovery (failCount resets on success)
  - Image preloading pattern
- **Files**: `CameraStream.tsx:67-111`

#### Issue #4: Stream Left-Aligned
- **Problem**: Camera image displayed left-aligned instead of centered
- **Solution**: Added flex wrapper with `justifyContent: center`
- **Files**: `CameraStream.tsx:151-173`

#### Issue #5: Wrong Button Color
- **Problem**: Form button used old blue theme
- **Solution**: Changed `colorScheme="blue"` to `colorScheme="brand"`
- **Files**: `AddRobotForm.tsx`

### Documentation

Created comprehensive documentation structure:

#### User Documentation
- `README.md` - User guide and installation instructions
- `docs/ESP32_API_Reference.md` - Complete API endpoint documentation
- `docs/Theme_Guide.md` - Visual design guide with color swatches
- `docs/theme-customization.md` - Theme modification guide

#### Developer Documentation
- `DEVELOPMENT.md` - Hub document with progressive disclosure
- `docs/dev/quick-start.md` - 5-minute setup guide
- `docs/dev/architecture.md` - System design and technical decisions
- `docs/dev/problems-solved.md` - Detailed issue reference
- `docs/dev/debugging.md` - Comprehensive troubleshooting guide
- `docs/dev/prompts.md` - AI prompt library (what worked)
- `docs/dev/common-tasks.md` - How-to guides for frequent tasks
- `docs/dev/session-context.md` - Current state for continuity
- `docs/dev/future-improvements.md` - Roadmap and feature ideas
- `docs/dev/changelog.md` - This file

#### AI Context
- `CLAUDE.md` - Instructions for AI assistants
- `Project_Prompt.md` - Original project requirements

### Dependencies

#### Core
- React 18.3.1
- TypeScript 5.6.2
- Vite 6.0.1

#### UI
- @chakra-ui/react 2.10.4
- @chakra-ui/icons 2.2.4
- @emotion/react 11.14.0
- @emotion/styled 11.14.0
- framer-motion 11.15.0

#### State Management
- zustand 5.0.2
- @tanstack/react-query 5.62.11

#### Forms
- react-hook-form 7.54.2
- zod 3.24.1
- @hookform/resolvers 3.9.1

#### Routing
- react-router-dom 7.1.1

#### Dev Tools
- ESLint 9.17.0
- TypeScript ESLint 8.19.1
- Vitest 2.1.8
- @testing-library/react 16.1.0
- Playwright (for E2E)

### Project Structure

```
tumbller-react-webapp/
├── src/
│   ├── components/
│   │   ├── common/
│   │   └── features/
│   │       ├── AddRobotForm.tsx
│   │       ├── CameraStream.tsx
│   │       ├── MotorControls.tsx
│   │       └── RobotConnection.tsx
│   ├── pages/
│   │   └── RobotControlPage.tsx
│   ├── services/
│   │   └── robotApi.ts
│   ├── stores/
│   │   └── robotStore.ts
│   ├── theme/
│   │   └── index.ts
│   ├── types/
│   │   ├── robot.ts
│   │   └── index.ts
│   ├── utils/
│   │   └── env.ts
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── dev/ (9 detailed guides)
│   ├── ESP32_API_Reference.md
│   ├── Theme_Guide.md
│   └── theme-customization.md
├── DEVELOPMENT.md
├── CLAUDE.md
├── README.md
├── .env.example
└── package.json
```

### Configuration Files

- `.env.example` - Environment template
- `tsconfig.json` - TypeScript strict configuration
- `vite.config.ts` - Vite build configuration
- `eslint.config.js` - ESLint rules
- `.gitignore` - Git exclusions

### Known Limitations

1. **CORS**: ESP32 doesn't send CORS headers, requires no-cors mode
2. **Response Reading**: With no-cors, can't read HTTP response bodies
3. **Network Requirement**: Must be on same network as ESP32 devices
4. **Browser Support**: Modern browsers only (ESM, Fetch API)
5. **Polling Overhead**: Camera polling uses more bandwidth than WebSocket would

### Credits

- **Developer**: Anuraj R.
- **AI Assistant**: Claude Sonnet 4.5 via Claude Code
- **Robot Firmware**: [YakRoboticsGarage](https://github.com/YakRoboticsGarage)
- **ESP32 Libraries**: Arduino ESP32, ESP32-CAM

---

## [1.1.0] - 2024-12-26

### Added - Optional Authentication

#### Logto Integration
- Integrated `@logto/react` SDK (v4.0.10) for OAuth 2.0 / OIDC authentication
- Optional authentication system controlled by `VITE_ENABLE_AUTH` environment variable
- When disabled, app functions exactly as before (backward compatible)
- When enabled, requires login before accessing robot control interface

#### Authentication Components
- **AuthProvider**: Conditional wrapper that only loads LogtoProvider when auth is enabled
- **useAuth Hook**: Provides authentication state with mock data when auth is disabled
- **ProtectedRoute**: Route guard component that shows login page when unauthenticated
- **LoginButton**: Triggers OAuth sign-in flow with redirect to Logto
- **LogoutButton**: Signs user out and clears session
- **UserProfile**: Displays user avatar, name, and email after authentication
- **CallbackPage**: Handles OAuth redirect after successful login

#### Environment Variables
- `VITE_ENABLE_AUTH` - Enable/disable authentication (default: false)
- `VITE_LOGTO_ENDPOINT` - Logto cloud endpoint URL
- `VITE_LOGTO_APP_ID` - Logto application ID

#### User Experience
- Login page appears first if auth is enabled
- Smooth OAuth redirect flow to Logto
- After login, redirects to robot control interface
- User profile shows in header with avatar and email
- Logout returns to login page
- No authentication required if VITE_ENABLE_AUTH=false

### Fixed - Authentication Issues

#### Issue #6: Infinite Reload Loop After Login
- **Problem**: Page continuously reloaded after successful Logto authentication
- **Symptom**: "Checking authentication..." spinner appeared repeatedly in infinite loop
- **Root Cause**: Logto's `useLogto()` hook's `isLoading` state oscillated between true/false even after successful auth
- **Investigation Steps**:
  1. Removed trailing slash from endpoint ❌
  2. Added timeout logic ❌
  3. Simplified CallbackPage ❌
  4. Removed React StrictMode ❌
  5. Added error handling in UserProfile ✓ (partial)
  6. Identified `isLoading` oscillation as root cause ✓
- **Solution**: Implemented `hasInitiallyLoaded` latch mechanism in ProtectedRoute
  - Only shows loading spinner on very first load (`!hasInitiallyLoaded && isLoading`)
  - Sets `hasInitiallyLoaded = true` when `isLoading` first becomes false
  - Ignores subsequent `isLoading` toggles (from token refresh, state revalidation)
  - Page stays stable after initial authentication check
- **Files Modified**:
  - `src/components/common/ProtectedRoute.tsx`
  - `src/pages/RobotControlPage.tsx`

#### Double Hook Call Issue
- **Problem**: `useLogto()` was called twice (ProtectedRoute and RobotControlPage)
- **Solution**: Removed redundant `useAuth()` call from RobotControlPage
- **Result**: Simplified component and eliminated unnecessary re-renders

#### Conditional Rendering Cleanup
- **Problem**: Redundant `isAuthenticated` checks after ProtectedRoute already verified auth
- **Solution**: Removed conditional rendering based on `isAuthenticated` in protected pages
- **Result**: Cleaner code, since ProtectedRoute guarantees authentication

### Changed - Application Structure

#### Removed React StrictMode
- Removed `<StrictMode>` wrapper from `src/main.tsx`
- Reason: Double-rendering in development mode can interfere with OAuth libraries
- No impact on production builds

#### Updated App Entry Point
- Added AuthProvider wrapper in `src/main.tsx`
- AuthProvider conditionally wraps app with LogtoProvider based on `VITE_ENABLE_AUTH`

#### New Route
- Added `/callback` route for OAuth redirect handling
- CallbackPage component processes authentication callback and redirects to home

#### Protected Main Route
- Wrapped RobotControlPage with ProtectedRoute component
- Route now requires authentication when enabled

### Technical Implementation

#### Conditional Provider Pattern
```typescript
// Only wraps with LogtoProvider when auth is enabled
if (!isAuthEnabled) {
  return <>{children}</>;
}

return <LogtoProvider config={config}>{children}</LogtoProvider>;
```

#### Latch Mechanism for Stable Auth State
```typescript
const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

useEffect(() => {
  if (!isLoading && !hasInitiallyLoaded) {
    setHasInitiallyLoaded(true);
  }
}, [isLoading, hasInitiallyLoaded]);

// Only show loading on first load, ignore subsequent toggles
if (!hasInitiallyLoaded && isLoading) {
  return <LoadingSpinner />;
}
```

#### Mock Authentication Data
- When auth is disabled, useAuth returns mock data with `isAuthenticated: true`
- Prevents need for conditional logic throughout the app
- Maintains type safety with same return interface

### Dependencies

#### Added
- `@logto/react` 4.0.10 - Logto React SDK for OAuth authentication

### Documentation

#### Updated
- `docs/dev/problems-solved.md` - Added Problem #6 (Logto infinite reload loop)
- `docs/dev/session-context.md` - Updated to v1.1.0 with auth features
- `docs/dev/changelog.md` - This file
- `docs/dev/architecture.md` - Added authentication layer documentation
- `.env.example` - Added Logto configuration template

### Configuration

#### New Files
- `src/providers/AuthProvider.tsx` - Conditional Logto wrapper
- `src/hooks/useAuth.ts` - Authentication hook with conditional logic
- `src/components/common/ProtectedRoute.tsx` - Route guard
- `src/components/common/LoginButton.tsx` - Login button component
- `src/components/common/LogoutButton.tsx` - Logout button component
- `src/components/common/UserProfile.tsx` - User info display
- `src/pages/CallbackPage.tsx` - OAuth callback handler

#### Modified Files
- `src/main.tsx` - Added AuthProvider, removed StrictMode
- `src/App.tsx` - Added /callback route, wrapped home with ProtectedRoute
- `src/pages/RobotControlPage.tsx` - Integrated auth UI components
- `src/vite-env.d.ts` - Added Logto environment variable types
- `.env.example` - Added auth configuration

### Backward Compatibility

- **100% backward compatible** when `VITE_ENABLE_AUTH=false` (default)
- No changes to robot control functionality
- No changes to camera streaming
- No changes to motor controls
- Authentication is purely opt-in feature

### Known Limitations

1. **OAuth Flow**: Requires redirect to external Logto service
2. **Logto Cloud**: Requires Logto account and app configuration
3. **Local Development**: Callback URL must be configured in Logto dashboard
4. **Session Persistence**: Uses Logto's built-in session management

### Migration Guide

To enable authentication in existing installation:

1. Sign up for Logto Cloud account
2. Create application and get endpoint + app ID
3. Configure callback URL: `http://localhost:5173/callback` (development)
4. Update `.env`:
   ```env
   VITE_ENABLE_AUTH=true
   VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
   VITE_LOGTO_APP_ID=your_app_id
   ```
5. Restart development server

To disable authentication:
```env
VITE_ENABLE_AUTH=false
```

---

## [1.2.1] - 2024-12-28

### Fixed - x402 Payment Flow & Transaction Display

#### x402 Client Integration
- Replaced custom EIP-712 signing with official `@x402/fetch`, `@x402/evm`, `@x402/core` packages
- Created ethers.js Signer → x402 `ClientEvmSigner` adapter for browser wallet compatibility
- Uses `ExactEvmSchemeV1` for base-sepolia network (V1 protocol with simple network names)
- `wrapFetchWithPayment()` automatically handles 402 payment flow

#### CORS Fixes for x402
- Fixed 402 responses missing CORS headers (x402 middleware bypasses CORS middleware)
- Wrapped x402 middleware to manually add CORS headers to 402 responses
- Exposed `PAYMENT-REQUIRED` and `X-PAYMENT-RESPONSE` headers in CORS config

#### Transaction Hash Display
- Fixed "Free Session" showing instead of transaction hash after payment
- Transaction hash extracted from `X-PAYMENT-RESPONSE` header (set by x402 facilitator after settlement)
- Uses `decodePaymentResponseHeader()` from `@x402/fetch` to parse response

#### Header Name Corrections
- Fixed `X-Payment-Required` → `PAYMENT-REQUIRED` (correct x402 protocol header)
- Fixed `X-Payment` → `X-PAYMENT` (correct x402 client header)

### Changed

#### Payment Client (`src/services/paymentClient.ts`)
- Complete rewrite using official x402 packages
- Removed custom `parsePaymentRequirements()` and `signPayment()` functions
- Added `createX402Signer()` adapter for ethers.js compatibility

#### Type Fixes
- Fixed `ChainConfig` type to use `satisfies` for proper literal type inference
- Fixed `WalletProvider` address type mismatch (`undefined` vs `null`)

### Dependencies

#### Added
- `@x402/core` 2.1.0 - x402 protocol core types and client
- `@x402/evm` 2.1.0 - EVM payment scheme with EIP-3009
- `@x402/fetch` 2.1.0 - Fetch wrapper with automatic 402 handling

---

## [1.2.0] - 2024-12-28

### Added - x402 Payment Integration & Backend API

#### Wallet Integration
- Integrated ethers.js v6 for Ethereum wallet connectivity
- Support for MetaMask, Coinbase Wallet, and other browser wallets
- Wallet connect/disconnect functionality with address display
- Base Sepolia testnet support for x402 payments
- Chain switching support (auto-prompt to switch to correct network)

#### Session-Based Robot Access
- Session management system integrated with FastAPI backend
- Purchase access flow with configurable duration and pricing
- Session countdown timer with progress bar
- Automatic session status polling (60-second intervals)
- Session recovery on page reload (if wallet reconnects)

#### x402 Payment Protocol
- EIP-712 typed data signing for payment authorization
- Support for both paid (USDC) and free sessions
- Transaction hash display with Base Sepolia explorer link
- Payment verification through x402 facilitator

#### Backend API Integration
- All robot commands now routed through FastAPI backend
- Motor control commands (forward, back, left, right, stop)
- Camera frame fetching through backend proxy
- Session status checking via wallet address header
- Robot status and availability checking

#### New Components
- `WalletButton` - Connect/disconnect wallet with address display
- `SessionStatus` - Session timer, robot host, and transaction link
- `PurchaseAccess` - Purchase flow with dynamic pricing
- `CameraStream` - Manual connect button (no auto-polling)

#### New Providers
- `WalletProvider` - Shared wallet state via context
- `SessionProvider` - Shared session state via context

#### New Hooks
- `useWallet` - Wallet connection state and actions
- `useSession` - Session state with countdown timer
- `usePayment` - Payment flow handling
- `usePaymentConfig` - Fetch session price/duration from backend

#### Environment Configuration
- `VITE_API_URL` - FastAPI backend URL (default: http://localhost:8000)
- Support for Base Sepolia and Base Mainnet chains

### Changed

#### Robot Configuration
- Added optional `motorMdns` and `cameraMdns` fields
- IP address validation now requires actual IP (not hostname)
- mDNS names stored separately for display purposes

#### Robot Connection Flow
- Wallet must be connected before robot can be connected
- Robot automatically disconnects when wallet disconnects
- Connection status resets to 'disconnected' on page reload

#### Camera Stream
- Removed automatic camera polling on mount
- Added "Connect Camera" button for manual activation
- Added "Disconnect" button to stop streaming
- Retry mechanism with max 5 failures before error

#### Motor Controls
- Now require active session to function
- Commands sent through backend API with wallet address header
- Removed direct ESP32 communication

### Fixed

#### Issue #7: Session State Not Shared Across Components
- **Problem**: After purchasing access, controls didn't appear
- **Root Cause**: Each `useSession()` call created independent state
- **Solution**: Created `SessionProvider` context for shared session state
- **Files**: `src/providers/SessionProvider.tsx`, `src/hooks/useSession.ts`

#### Issue #8: Robot Connection Status Not Updating
- **Problem**: Controls section didn't appear after connecting robot
- **Root Cause**: Derived `activeRobot` value didn't trigger re-renders
- **Solution**: Use Zustand selector directly for `activeRobot`
- **Files**: `src/pages/RobotControlPage.tsx`

#### Issue #9: Robot Status Persisting After Reload
- **Problem**: Robot showed "online" after page reload
- **Root Cause**: Zustand persist saved connectionStatus
- **Solution**: Reset connection status in merge function
- **Files**: `src/stores/robotStore.ts`

#### Issue #10: Effect Running on Mount
- **Problem**: Robot disconnected immediately on page load
- **Root Cause**: Disconnect effect ran on initial mount
- **Solution**: Track previous value with useRef
- **Files**: `src/components/features/RobotConnection.tsx`

#### Issue #11: UI Slow After Getting Access
- **Problem**: Long delay before controls appeared
- **Root Cause**: Extra API call, loading states, timer recreation
- **Solution**: Use purchase response data, fix effect dependencies
- **Files**: `src/providers/SessionProvider.tsx`, `src/hooks/usePayment.ts`

### Technical Implementation

#### State Management Architecture
```
WalletProvider (wallet state)
  └── SessionProvider (session state, depends on wallet)
        └── App
              └── RobotControlPage
                    ├── useWallet() - shared wallet state
                    ├── useSession() - shared session state
                    └── useRobotStore() - Zustand for robot configs
```

#### Payment Flow
1. User clicks "Get Access"
2. Frontend calls backend `/api/v1/access/purchase`
3. If payment required (402), sign EIP-712 typed data
4. Retry with X-Payment header containing signature
5. Backend verifies with x402 facilitator
6. Session created, returned in response
7. Frontend updates session state immediately (no extra API call)

#### Session State Sharing
- `SessionProvider` wraps app with shared context
- All components using `useSession()` see same state
- `setSessionDirectly()` updates all consumers immediately

### Dependencies

#### Added
- `ethers` 6.x - Ethereum library for wallet interaction

### Project Structure Updates

```
src/
├── providers/
│   ├── WalletProvider.tsx    # NEW - Wallet context
│   └── SessionProvider.tsx   # NEW - Session context
├── hooks/
│   ├── useWallet.ts          # NEW - Wallet hook
│   ├── useSession.ts         # CHANGED - Now uses context
│   ├── usePayment.ts         # NEW - Payment flow
│   └── usePaymentConfig.ts   # NEW - Fetch config from backend
├── services/
│   ├── robotApi.ts           # CHANGED - Routes through backend
│   ├── accessApi.ts          # NEW - Session management API
│   └── paymentClient.ts      # NEW - x402 payment signing
├── components/
│   ├── common/
│   │   ├── WalletButton.tsx  # NEW
│   │   ├── SessionStatus.tsx # NEW
│   │   └── PurchaseAccess.tsx# NEW
│   └── features/
│       ├── CameraStream.tsx  # CHANGED - Manual connect
│       ├── MotorControls.tsx # CHANGED - Uses wallet address
│       └── RobotConnection.tsx # CHANGED - Requires wallet
├── types/
│   ├── payment.ts            # NEW - Payment types
│   └── robot.ts              # CHANGED - Added mDNS fields
├── config/
│   └── chains.ts             # NEW - Chain configuration
└── main.tsx                  # CHANGED - Added providers
```

### Documentation

#### Added
- `docs/agent-history/problems-solved.md` - Issue solutions reference

### Migration Guide

To use x402 payment integration:

1. Start the FastAPI backend:
   ```bash
   cd backend-fastapi
   uv run uvicorn app.main:app --reload
   ```

2. Configure frontend `.env`:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

3. For free sessions (testing), set in backend `.env`:
   ```env
   PAYMENT_ENABLED=false
   SESSION_DURATION_MINUTES=10
   ```

4. For paid sessions (production), configure x402 in backend

### Known Limitations

1. **Single Chain**: Currently hardcoded to Base Sepolia
2. **No Session Extension**: Cannot extend session, must wait for expiry
3. **Manual Camera**: Camera must be manually connected after each session

---

## [Unreleased]

Ideas for future versions - see [future-improvements.md](future-improvements.md)

### Planned for v1.1.0
- Battery status display
- Speed control (PWM)
- WebSocket communication

### Planned for v1.2.0
- Movement macros
- Sensor data display
- Keyboard controls

### Planned for v2.0.0
- Autonomous mode
- Multi-user support
- Video recording

---

## Version History Summary

| Version | Date | Highlights |
|---------|------|------------|
| 1.2.1 | 2024-12-28 | x402 payment flow fixes, official client packages |
| 1.2.0 | 2024-12-28 | x402 payments, wallet integration, backend API |
| 1.1.0 | 2024-12-26 | Optional Logto authentication |
| 1.0.0 | 2024-12-26 | Initial release with all core features |

---

## Contributing to Changelog

When adding new features or fixing bugs:

1. **Decide version bump**:
   - **Patch (x.x.1)**: Bug fixes, documentation updates
   - **Minor (x.1.0)**: New features, backward compatible
   - **Major (1.x.0)**: Breaking changes

2. **Update [Unreleased] section** with:
   - Feature description
   - Files modified
   - Migration notes if breaking

3. **On release**:
   - Move [Unreleased] items to new version section
   - Add date in YYYY-MM-DD format
   - Update version in `package.json`
   - Create git tag: `git tag -a v1.1.0 -m "Release v1.1.0"`

4. **Categories to use**:
   - **Added** - New features
   - **Changed** - Changes to existing functionality
   - **Deprecated** - Soon-to-be removed features
   - **Removed** - Removed features
   - **Fixed** - Bug fixes
   - **Security** - Security improvements

### Example Entry

```markdown
## [1.1.0] - 2024-01-15

### Added
- Battery status display with visual indicator
- Speed control slider (25-100% PWM)
- WebSocket communication for real-time updates

### Fixed
- Camera stream disconnection after 5 minutes
- Memory leak in polling interval

### Changed
- Polling interval increased to 2 seconds
- Default timeout reduced to 3 seconds
```

---

## Links

[Unreleased]: https://github.com/[username]/[repo]/compare/frontend-react-v1.3.0...HEAD
[1.3.0]: https://github.com/[username]/[repo]/compare/frontend-react-v1.2.1...frontend-react-v1.3.0
[1.2.1]: https://github.com/[username]/[repo]/compare/frontend-react-v1.0.0...frontend-react-v1.2.1
[1.0.0]: https://github.com/[username]/[repo]/releases/tag/frontend-react-v1.0.0

---

**Maintained by:** Development Team
**Last Updated:** December 28, 2024
