# Session Context

Current state of the project for continuing development.

**Last Updated:** December 26, 2024 (v1.1.0)

---

## Project Status

✅ **v1.1.0 Complete** - Core features + Optional Authentication

**Completed Features:**
- Multi-robot management with persistent storage
- Manual connection workflow (explicit Connect button)
- Motor controls (forward/back/left/right)
- Dual-mode camera display (iframe + stream only)
- **Optional Logto authentication** (new in v1.1.0)
- Custom orange/yellow/brown theme
- Environment variable configuration
- Comprehensive documentation

---

## Known Working State

### What Works

1. **Robot Management**
   - Add/remove robots via UI
   - Default robot loads from .env
   - Robot configurations persist to localStorage
   - Dropdown selection

2. **Connection**
   - Manual connection via "Connect to Robot" button
   - Connection status: disconnected → connecting → online/offline
   - Offline state shows helpful error message with checklist

3. **Camera Stream**
   - **Full Interface Mode:** Embeds ESP-CAM /stream HTML in iframe
   - **Stream Only Mode:** Polls /getImage every 1 second with retry tolerance
   - Auto-recovery after transient network errors (5-failure tolerance)
   - Centered display

4. **Motor Controls**
   - Four directional buttons (forward/back/left/right)
   - Only visible when connection status is 'online'
   - React Query mutations with error handling

5. **Theme**
   - Brand orange (#f97316) for primary actions
   - Accent yellow (#eab308) for highlights
   - Brown tones for text and neutrals
   - Custom button hover animations (lift effect)
   - Custom scrollbar styling

### Verified Functionality

- ✅ Modal closes after adding robot
- ✅ Connect button visible for disconnected state
- ✅ Camera stream works in both modes
- ✅ Stream image centered
- ✅ Retry tolerance prevents immediate errors
- ✅ Theme consistent across all components
- ✅ Optional Logto authentication works without reload loops
- ✅ Login flow redirects correctly
- ✅ User profile displays after authentication
- ✅ Logout functionality works

---

## Current Architecture

```
Tech Stack:
- React 18 + TypeScript (strict mode)
- Vite 6 (build tool)
- Chakra UI v2 (component library)
- Zustand (state management with persistence)
- React Query (server state)
- React Hook Form + Zod (form validation)
```

**Key Files:**
- `src/stores/robotStore.ts` - State management
- `src/services/robotApi.ts` - ESP32 communication
- `src/theme/index.ts` - Theme customization
- `src/pages/RobotControlPage.tsx` - Main page
- `src/components/features/` - Feature components

See [architecture.md](architecture.md) for detailed system design.

---

## No Known Issues

All issues from development have been resolved:
- ✅ Modal not closing → Fixed with onSuccess callback
- ✅ Connect button not visible → Fixed with simplified conditionals
- ✅ Camera stream errors → Fixed with retry tolerance and preloading
- ✅ Stream left-aligned → Fixed with flex centering
- ✅ Wrong button colors → Fixed colorScheme usage
- ✅ Logto infinite reload loop → Fixed with hasInitiallyLoaded latch mechanism

---

## Development Environment

### Prerequisites Installed

- Node.js 18+
- pnpm 8+
- Git

### Commands Available

```bash
pnpm dev              # Development server
pnpm build            # Production build
pnpm preview          # Preview build
pnpm lint             # ESLint check
pnpm typecheck        # TypeScript check
pnpm test             # Run tests
pnpm check            # All quality checks
```

### Environment Configuration

`.env` file contains:
```env
VITE_DEFAULT_ROBOT_NAME=Tumbller-1
VITE_DEFAULT_MOTOR_IP=192.168.1.100
VITE_DEFAULT_CAMERA_IP=192.168.1.101

# Optional Logto Authentication
VITE_ENABLE_AUTH=false
VITE_LOGTO_ENDPOINT=
VITE_LOGTO_APP_ID=
```

---

## What's Ready for Next Session

### Immediate Next Steps (Optional)

1. **Testing**
   - Add unit tests for components
   - Add E2E tests with Playwright
   - Test coverage reporting

2. **WebSocket Migration**
   - Replace camera polling with WebSocket
   - Real-time motor feedback
   - Battery level updates

3. **Enhanced Features**
   - Battery status display
   - Speed control (PWM)
   - Autonomous movement macros
   - Multi-robot simultaneous control

See [future-improvements.md](future-improvements.md) for detailed roadmap.

### No Blockers

- All dependencies installed
- No build errors
- No TypeScript errors
- No linting errors
- All features functional

---

## How to Continue Development

### For New AI Session

**Start with:**
```
Read DEVELOPMENT.md and docs/dev/session-context.md to understand current project state
```

This gives progressive context disclosure:
1. Hub document (DEVELOPMENT.md) for overview
2. This file (session-context.md) for current state
3. Detailed docs as needed

### For New Developer

1. Read [quick-start.md](quick-start.md) - 5 minutes
2. Run `pnpm dev` and test basic functionality
3. Review [architecture.md](architecture.md) to understand design
4. Check [problems-solved.md](problems-solved.md) to learn from past issues

### For Specific Tasks

- **Add feature** → [common-tasks.md](common-tasks.md)
- **Fix bug** → [debugging.md](debugging.md)
- **Change theme** → [theme-customization.md](../theme-customization.md)
- **Understand prompts** → [prompts.md](prompts.md)

---

## Recent Changes (v1.1.0)

**Latest Development Session (December 26, 2024):**

### Added Features
1. **Optional Logto Authentication Integration**
   - Integrated `@logto/react` SDK for OAuth authentication
   - Created AuthProvider with conditional wrapping (enabled via env var)
   - Implemented useAuth hook with mock data when auth disabled
   - Added ProtectedRoute component for route protection
   - Created CallbackPage for OAuth redirect handling
   - Added LoginButton, LogoutButton, and UserProfile components

### Fixed Issues
2. **Logto Infinite Reload Loop**
   - Problem: `isLoading` state oscillating after successful login
   - Solution: Implemented `hasInitiallyLoaded` latch mechanism
   - Result: Page loads once and stays stable

3. **Documentation Updates**
   - Updated problems-solved.md with Logto integration issue
   - Updated session-context.md (this file)
   - Updated changelog.md with v1.1.0 changes
   - Updated architecture.md with authentication layer

**Code Changes:**
- New: `src/providers/AuthProvider.tsx`
- New: `src/hooks/useAuth.ts`
- New: `src/components/common/ProtectedRoute.tsx`
- New: `src/components/common/LoginButton.tsx`
- New: `src/components/common/LogoutButton.tsx`
- New: `src/components/common/UserProfile.tsx`
- New: `src/pages/CallbackPage.tsx`
- Modified: `src/main.tsx` (removed StrictMode, added AuthProvider)
- Modified: `src/App.tsx` (added /callback route, ProtectedRoute wrapper)
- Modified: `src/pages/RobotControlPage.tsx` (integrated auth UI)
- Modified: `src/vite-env.d.ts` (added Logto env vars)
- Modified: `.env.example` (added Logto configuration)

---

## State Management Details

### Zustand Store Structure

```typescript
interface RobotStore {
  robots: Map<string, RobotState>
  activeRobotId: string | null
  initialized: boolean

  addRobot(config: RobotConfig): void
  removeRobot(id: string): void
  setActiveRobot(id: string | null): void
  updateRobotStatus(id: string, updates: Partial<RobotState>): void
  initializeDefaultRobot(): void
}
```

**Persisted to localStorage:**
- Robot configurations (name, IPs, ID, createdAt)
- Active robot selection

**Not persisted (revalidated on load):**
- Connection status
- Camera status
- Last command

### Current Store State (Typical)

```typescript
{
  robots: Map {
    "uuid-1" => {
      config: {
        id: "uuid-1",
        name: "Tumbller-1",
        motorIp: "192.168.1.100",
        cameraIp: "192.168.1.101",
        createdAt: Date
      },
      connectionStatus: "online",
      cameraStatus: "connected"
    }
  },
  activeRobotId: "uuid-1",
  initialized: true
}
```

---

## ESP32 Communication

### Motor Controller (ESP32S3)

**Working Endpoints:**
- `GET /motor/forward`
- `GET /motor/back`
- `GET /motor/left`
- `GET /motor/right`
- `GET /motor/stop`

**Configuration:**
- Default IP: `192.168.1.100`
- Protocol: HTTP GET
- Mode: no-cors (ESP32 doesn't send CORS headers)
- Timeout: 5 seconds

### Camera Module (ESP-CAM)

**Working Endpoints:**
- `GET /stream` - HTML page with JavaScript interface
- `GET /getImage` - Single JPEG frame

**Configuration:**
- Default IP: `192.168.1.101`
- Polling interval: 1000ms (1 second)
- Retry tolerance: 5 failures
- Auto-recovery: Yes

**Implementation Notes:**
- /stream is NOT raw MJPEG - it's an HTML page
- Polling /getImage mimics ESP-CAM's native JavaScript
- Timestamp query param prevents caching: `?t=${Date.now()}`

---

## Git Repository State

**Branch:** master (default)
**Last Commit:** Initial commit with all v1.0.0 features

**Commit Format:**
```
<type>: <description>

<body>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Remote:** Not yet pushed (local only)

---

## Documentation Structure

```
docs/
├── dev/
│   ├── quick-start.md          ✅ Setup guide (5 min)
│   ├── architecture.md         ✅ System design
│   ├── problems-solved.md      ✅ Issue reference
│   ├── debugging.md            ✅ Troubleshooting
│   ├── prompts.md              ✅ AI prompt library
│   ├── common-tasks.md         ✅ How-to guides
│   ├── session-context.md      ✅ This file
│   ├── future-improvements.md  ⏳ Next (see below)
│   └── changelog.md            ⏳ Next (see below)
│
├── ESP32_API_Reference.md      ✅ API endpoints
├── Theme_Guide.md              ✅ Visual design
└── theme-customization.md      ✅ Theme how-to

DEVELOPMENT.md                  ✅ Hub/index document
```

All documentation complete except:
- future-improvements.md (being created next)
- changelog.md (being created next)

---

## For Next Session

### Context to Provide AI

```
The project is at v1.0.0 with all core features complete and working.
No known issues. Documentation is comprehensive.

If you want to add features, see docs/dev/future-improvements.md
If you want to debug, see docs/dev/debugging.md
If you want to understand the codebase, see docs/dev/architecture.md
```

### Expected State

- Development server starts without errors
- All robots in localStorage remain
- Theme looks correct (orange/yellow/brown)
- Connection workflow functions properly
- Camera streams in both modes

### No Manual Setup Required

Everything should "just work" after `pnpm install && pnpm dev`

---

## Resources

- [Quick Start](quick-start.md) - Get running in 5 minutes
- [Architecture](architecture.md) - Understand the design
- [Common Tasks](common-tasks.md) - How to do common things
- [Prompts Library](prompts.md) - Effective AI prompts
- [Problems Solved](problems-solved.md) - Learn from past issues
- [Debugging Guide](debugging.md) - Troubleshoot issues
- [Future Improvements](future-improvements.md) - Roadmap

---

**Ready for continued development!** 🎉
