# Architecture Overview

How the Tumbller Robot Control application is structured.

## System Architecture

```
┌─────────────────────────────────────────────┐
│         React Web Application              │
│         (Browser: localhost:5173)           │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │    Auth Layer (Optional - Logto)     │  │
│  │    - AuthProvider                    │  │
│  │    - ProtectedRoute                  │  │
│  └──────────────────────────────────────┘  │
│         │                                   │
│         ↓                                   │
│  ┌──────────────┐      ┌──────────────┐    │
│  │  UI Layer    │      │  State Layer │    │
│  │  (Chakra UI) │ ←──→ │  (Zustand)   │    │
│  └──────────────┘      └──────────────┘    │
│         │                      │            │
│         ↓                      ↓            │
│  ┌──────────────────────────────────────┐  │
│  │      Services Layer (robotApi)       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                  │
                  ↓ (HTTP)
    ┌─────────────────────────────┐
    │     Physical Robot          │
    │                             │
    │  ┌──────────────────────┐   │
    │  │  ESP32S3             │   │
    │  │  Motor Controller    │   │
    │  │  (192.168.1.100)     │   │
    │  └──────────────────────┘   │
    │           │                 │
    │           ↓                 │
    │  ┌──────────────────────┐   │
    │  │  Motors              │   │
    │  │  (4 directional)     │   │
    │  └──────────────────────┘   │
    │                             │
    │  ┌──────────────────────┐   │
    │  │  ESP-CAM             │   │
    │  │  Camera Module       │   │
    │  │  (192.168.1.101)     │   │
    │  └──────────────────────┘   │
    └─────────────────────────────┘
```

## Key Design Decisions

### 1. Optional Authentication with Logto

**Decision:** Authentication is completely optional, controlled by environment variable.

**Rationale:**
- Not all users need authentication (single-user local networks)
- Reduces complexity for basic use cases
- Allows progressive enhancement (add auth when needed)
- No breaking changes to existing setups

**Implementation:**
```typescript
// Auth is opt-in via environment variable
const isAuthEnabled = String(import.meta.env.VITE_ENABLE_AUTH) === 'true';

// AuthProvider conditionally wraps app
if (!isAuthEnabled) {
  return <>{children}</>;  // No auth overhead
}

return <LogtoProvider config={config}>{children}</LogtoProvider>;
```

**When to Enable:**
- Multi-user environments
- Public-facing deployments
- Shared robot access
- Compliance requirements

**Infinite Loop Prevention:**
- OAuth SDKs (Logto, Auth0) toggle `isLoading` during token refresh
- Solution: "Latch" mechanism with `hasInitiallyLoaded` state
- Only show loading spinner on initial check, ignore subsequent toggles
- Prevents reload loops while maintaining proper loading UX

### 2. Separation of Motor and Camera IPs

**Why:** ESP32S3 and ESP-CAM are separate microcontrollers with independent network interfaces.

**Impact:**
- More flexible - can use different camera types
- Each controller can restart independently
- Easier debugging - isolate motor vs camera issues

### 3. Manual Connection Workflow

**Decision:** Explicit "Connect" button instead of auto-connect on robot selection.

**Rationale:**
- User control over when connection attempts happen
- Prevents unnecessary network requests
- Clear connection state feedback

**State Machine:**
```
disconnected → [Connect button] → connecting
                                      ↓
                              ┌───────┴───────┐
                              ↓               ↓
                           online          offline
                              │               │
                              ↓               ↓
                       [Disconnect]    [Retry Connection]
                              ↓               ↓
                        disconnected     connecting
```

### 4. Dual Camera Modes

**Full Interface Mode:**
- Embeds ESP-CAM's /stream HTML page in iframe
- Shows all ESP-CAM controls (resolution, rotation, LED, etc.)
- Uses ESP-CAM's native JavaScript implementation

**Stream Only Mode:**
- Polls /getImage endpoint every 1 second
- Displays just the video feed
- Cleaner, centered display
- Custom retry logic with tolerance

**Why Both?**
- Full Interface: For advanced users who want camera settings
- Stream Only: For focused robot control experience

### 5. State Management: Zustand + Persistence

**Why Zustand over Redux?**
- Less boilerplate (no actions, reducers)
- Simple API with hooks
- Built-in middleware for persistence
- Sufficient for client-side state

**Persistence Strategy:**
```typescript
persist(
  (set, get) => ({ /* store */ }),
  {
    name: 'tumbller-robot-storage',
    storage: createJSONStorage(() => localStorage),
  }
)
```

**What persists:**
- Robot configurations (name, IPs, IDs)
- Active robot selection

**What doesn't persist:**
- Connection status (revalidated on load)
- Camera status
- Last motor command

### 6. no-cors Mode for ESP32

**Problem:** ESP32 firmware doesn't send CORS headers.

**Solution:** Use `mode: 'no-cors'` in fetch requests.

**Trade-off:** Can't read response body, but motor commands are GET requests that succeed/fail regardless.

```typescript
await fetch(url, {
  method: 'GET',
  mode: 'no-cors',
  signal: AbortSignal.timeout(5000),
})
```

## Project Structure

```
src/
├── components/
│   ├── common/              # Reusable UI components
│   │   ├── LoginButton.tsx       # Logto login trigger
│   │   ├── LogoutButton.tsx      # Logto logout button
│   │   ├── UserProfile.tsx       # User avatar/info display
│   │   └── ProtectedRoute.tsx    # Auth route guard
│   └── features/            # Feature-specific components
│       ├── AddRobotForm.tsx      # Robot configuration form
│       ├── CameraStream.tsx      # Dual-mode camera display
│       ├── MotorControls.tsx     # Directional control buttons
│       └── RobotConnection.tsx   # Connection management
│
├── pages/
│   ├── RobotControlPage.tsx # Main application page
│   └── CallbackPage.tsx     # OAuth callback handler
│
├── providers/
│   └── AuthProvider.tsx     # Conditional Logto wrapper
│
├── hooks/
│   └── useAuth.ts           # Conditional auth hook
│
├── stores/
│   └── robotStore.ts        # Zustand store with persistence
│
├── services/
│   └── robotApi.ts          # ESP32 communication layer
│
├── theme/
│   └── index.ts             # Chakra UI theme (orange/yellow/brown)
│
├── types/
│   ├── robot.ts             # Core type definitions
│   └── index.ts             # Type exports
│
├── utils/
│   └── env.ts               # Environment variable access
│
├── App.tsx                  # Root component with routing
└── main.tsx                 # Entry point (AuthProvider wrapper)
```

## Data Flow

### Authentication Flow (When Enabled)

```
User visits "/" → ProtectedRoute checks auth
    ↓
isAuthEnabled? → NO → Render children (no auth needed)
    ↓ YES
isAuthenticated? → NO → Show login page with LoginButton
    ↓ YES
hasInitiallyLoaded? → NO → Show loading spinner (first load only)
    ↓ YES
Render protected children (RobotControlPage)
    ↓
User clicks "Log In" → signIn(callbackUrl)
    ↓
Redirect to Logto → User enters credentials
    ↓
Logto redirects to /callback → CallbackPage
    ↓
useHandleSignInCallback() → Process OAuth response
    ↓
navigate('/') → Return to home page
    ↓
ProtectedRoute: isAuthenticated = true → Render app
    ↓
UserProfile fetches user info → Display avatar/name/email
```

**Key Points:**
- `hasInitiallyLoaded` prevents reload loops from `isLoading` oscillation
- After first auth check, page stays stable even if `isLoading` toggles
- CallbackPage handles OAuth redirect transparently
- UserProfile only fetches once, handles errors gracefully

### Adding a Robot

```
User fills form → Zod validation → UUID generated
    ↓
RobotConfig created → addRobot() → Zustand store updates
    ↓
localStorage synced ← persist middleware ← store change
    ↓
UI re-renders ← useRobotStore hook ← store subscription
```

### Connecting to Robot

```
User clicks "Connect" → updateRobotStatus('connecting')
    ↓
robotApi.checkMotorControllerOnline(motorIp) → HTTP GET /motor/stop
    ↓
Response received (2s timeout) → isOnline: true/false
    ↓
updateRobotStatus('online' | 'offline')
    ↓
UI shows camera/controls if 'online' ← conditional render
```

### Sending Motor Command

```
User clicks "Forward" → motorMutation.mutate('forward')
    ↓
React Query mutation → robotApi.sendMotorCommand()
    ↓
HTTP GET http://{motorIp}/motor/forward (no-cors, 5s timeout)
    ↓
Success → updateRobotStatus({ lastCommand: 'forward' })
    ↓
Error → toast notification ← React Query onError
```

### Camera Stream (Stream Only Mode)

```
Component mounts → useEffect triggers
    ↓
setInterval 1000ms → fetchImage() every second
    ↓
Create Image() → preload → img.src = /getImage?t={timestamp}
    ↓
img.onload → setImageUrl() → display image → reset failCount
    ↓
img.onerror → increment failCount → if >= 5 → show error
```

## Technology Choices

| Layer | Technology | Why? |
|-------|-----------|------|
| Framework | React 18 | Industry standard, hooks, concurrent features |
| Build | Vite 6 | Fast HMR, ESM-native, simple config |
| UI Library | Chakra UI v2 | Accessible, themeable, composable |
| State | Zustand | Simple, performant, less boilerplate than Redux |
| Server State | React Query | Caching, retry logic, mutations |
| Forms | React Hook Form + Zod | Type-safe validation, good DX |
| Routing | React Router v6 | Standard, supports future multi-page growth |
| Language | TypeScript | Type safety, autocomplete, refactoring |

## ESP32 API Communication

### Motor Controller (ESP32S3)

**Endpoints:**
- `GET /motor/forward` - Move forward
- `GET /motor/back` - Move backward
- `GET /motor/left` - Turn left
- `GET /motor/right` - Turn right
- `GET /motor/stop` - Stop all motors

**Protocol:** HTTP GET, no authentication, no CORS headers

### Camera Module (ESP-CAM)

**Endpoints:**
- `GET /stream` - HTML page with JavaScript camera interface
- `GET /getImage` - Single JPEG frame (used for polling)

**Stream Implementation:**
- ESP-CAM /stream serves HTML with embedded JavaScript
- JavaScript polls /getImage every 1 second
- Displays frame using canvas or img element
- NOT an MJPEG stream (common misconception)

**Our Implementation:**
- Mode 1: Embed /stream HTML in iframe
- Mode 2: Poll /getImage directly from React

## Theme System

Chakra UI theme customization in `src/theme/index.ts`:

```typescript
colors: {
  brand: { 500: '#f97316' },  // Main orange
  accent: { 500: '#eab308' }, // Yellow highlights
  brown: { 800: '#292524' },  // Text color
}

components: {
  Button: {
    variants: {
      solid: {
        bg: 'brand.500',
        _hover: { bg: 'brand.600', transform: 'translateY(-2px)' },
      }
    }
  }
}
```

See [Theme_Guide.md](../Theme_Guide.md) for full color palette.

## Future Scalability

**Multi-Robot Support:**
- Map data structure in Zustand scales to many robots
- Each robot maintains independent connection state
- Can control multiple robots simultaneously (future feature)

**WebSocket Migration:**
- Current polling can be replaced with WebSocket for real-time updates
- ESP32 WebSocket server already exists in some firmwares
- Would reduce latency and network overhead

**Command Queue:**
- Could add command queuing for complex movement sequences
- Macro recording (record then replay movements)
- Autonomous navigation routines

## Error Handling Strategy

1. **Network Errors:** 5-second timeout on all requests
2. **Camera Errors:** 5-failure tolerance before showing error state
3. **Form Validation:** Zod schemas with user-friendly messages
4. **State Validation:** TypeScript ensures valid state transitions
5. **User Feedback:** Toast notifications for actions, inline errors for forms
