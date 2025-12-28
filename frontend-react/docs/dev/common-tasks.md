# Common Tasks

How-to guides for frequent development tasks.

---

## Adding a New Robot (User Flow)

1. Click "Add Robot" button in top right
2. Fill in form:
   - **Name:** Friendly identifier (e.g., "Tumbller-2")
   - **Motor IP:** ESP32S3 address (e.g., `192.168.1.100`)
   - **Camera IP:** ESP-CAM address (e.g., `192.168.1.101`)
3. Click "Add Robot"
4. Robot appears in dropdown
5. Select from dropdown
6. Click "Connect to Robot"

**Persistence:** Robot configs saved to localStorage automatically

---

## Modifying Theme Colors

### Changing Primary Brand Color

Edit `src/theme/index.ts`:

```typescript
colors: {
  brand: {
    50: '#fff7ed',   // Lightest - backgrounds
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',  // ← Main brand color - CHANGE THIS
    600: '#ea580c',  // ← Hover state
    700: '#c2410c',  // ← Active state
    800: '#9a3412',
    900: '#7c2d12',  // Darkest
  },
}
```

**Regenerate shade variations:**
Use tool like [UI Colors](https://uicolors.app/) or [Tailwind Shades](https://www.tails-ui.com/color-generator)

### Adding New Color Palette

```typescript
colors: {
  brand: { /* existing */ },
  accent: { /* existing */ },
  brown: { /* existing */ },

  // New palette
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    // ... complete 50-900 scale
    500: '#a855f7',  // Main shade
    // ...
    900: '#581c87',
  },
}
```

**Using new palette:**
```tsx
<Button colorScheme="purple">Purple Button</Button>
<Box bg="purple.50" color="purple.700">Content</Box>
```

### Updating Component Styles

Example: Change button border radius:

```typescript
// src/theme/index.ts
components: {
  Button: {
    baseStyle: {
      borderRadius: '2xl',  // Was 'lg'
      fontWeight: 'semibold',
    },
  },
}
```

**Hot reload:** Changes apply immediately in dev server

See [docs/theme-customization.md](../theme-customization.md) for full guide.

---

## Adding a New Motor Command

### 1. Update Type Definition

```typescript
// src/types/robot.ts
export type MotorCommand =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'spin'    // ← New command
```

### 2. Add Button to MotorControls

```typescript
// src/components/features/MotorControls.tsx
<Grid templateColumns="repeat(3, 1fr)" gap={3}>
  {/* ... existing buttons ... */}

  <Button
    colorScheme="brand"
    onClick={() => handleCommand('spin')}
    isLoading={motorMutation.isPending}
  >
    Spin
  </Button>
</Grid>
```

### 3. Verify ESP32 Endpoint Exists

Ensure ESP32S3 firmware handles `/motor/spin` endpoint.

If not, update firmware first.

### 4. Test

```bash
# Manual test
curl http://192.168.1.100/motor/spin

# App test
pnpm dev
# Click new button, watch robot and console
```

---

## Adding New Component

### 1. Create Component File

```bash
# For feature-specific component
touch src/components/features/BatteryStatus.tsx

# For reusable common component
touch src/components/common/StatusBadge.tsx
```

### 2. Component Template

```typescript
// src/components/features/BatteryStatus.tsx
import { Box, Text, HStack } from '@chakra-ui/react'
import type { RobotState } from '../../types'

interface BatteryStatusProps {
  robot: RobotState
}

export function BatteryStatus({ robot }: BatteryStatusProps) {
  return (
    <HStack spacing={3}>
      <Text fontSize="sm" fontWeight="medium">
        Battery:
      </Text>
      <Box
        px={3}
        py={1}
        bg="green.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="green.200"
      >
        <Text fontSize="sm" color="green.700">
          87%
        </Text>
      </Box>
    </HStack>
  )
}
```

### 3. Add to Parent Component

```typescript
// src/pages/RobotControlPage.tsx
import { BatteryStatus } from '../components/features/BatteryStatus'

// In render:
<VStack spacing={6}>
  <RobotConnection robot={activeRobot} />
  <BatteryStatus robot={activeRobot} />  {/* ← New component */}
  <CameraStream robot={activeRobot} />
</VStack>
```

### 4. Type Check and Lint

```bash
pnpm typecheck
pnpm lint
```

---

## Adding State to Zustand Store

### 1. Update Store Interface

```typescript
// src/stores/robotStore.ts
interface RobotStore {
  // ... existing state ...

  batteryLevel: number                    // ← New state
  setBatteryLevel: (level: number) => void  // ← New action
}
```

### 2. Implement State and Action

```typescript
export const useRobotStore = create<RobotStore>()(
  persist(
    (set) => ({
      // ... existing state ...

      batteryLevel: 100,

      setBatteryLevel: (level) =>
        set({ batteryLevel: level }),
    }),
    {
      name: 'tumbller-robot-storage',
      partialize: (state) => ({
        // ... existing persisted state ...
        batteryLevel: state.batteryLevel,  // ← Persist this
      }),
    }
  )
)
```

### 3. Use in Component

```typescript
// src/components/features/BatteryStatus.tsx
import { useRobotStore } from '../../stores/robotStore'

export function BatteryStatus() {
  const batteryLevel = useRobotStore((state) => state.batteryLevel)
  const setBatteryLevel = useRobotStore((state) => state.setBatteryLevel)

  return (
    <Text>{batteryLevel}%</Text>
  )
}
```

**Note:** Only subscribe to state you actually use to prevent unnecessary re-renders.

---

## Adding API Endpoint

### 1. Update robotApi Service

```typescript
// src/services/robotApi.ts
export const robotApi = {
  // ... existing methods ...

  async getBatteryLevel(motorIp: string): Promise<number> {
    const url = `http://${motorIp}/battery`

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: AbortSignal.timeout(5000),
      })

      // With no-cors, can't read response
      // Need different approach if you need response data
      return 0
    } catch (error) {
      console.error('Failed to fetch battery level:', error)
      throw error
    }
  },
}
```

### 2. Use React Query

```typescript
// In component
import { useQuery } from '@tanstack/react-query'
import { robotApi } from '../../services/robotApi'

export function BatteryStatus({ robot }: BatteryStatusProps) {
  const { data: batteryLevel } = useQuery({
    queryKey: ['battery', robot.config.motorIp],
    queryFn: () => robotApi.getBatteryLevel(robot.config.motorIp),
    refetchInterval: 10000,  // Poll every 10 seconds
    enabled: robot.connectionStatus === 'online',
  })

  return <Text>{batteryLevel ?? 'Unknown'}%</Text>
}
```

**CORS Limitation:** With `no-cors` mode, you can't read response body.

**Solutions:**
- Add CORS headers to ESP32 firmware
- Use WebSocket for bidirectional communication
- Poll a /status endpoint that returns JSON

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage report
pnpm test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm e2e

# Interactive mode
pnpm e2e --ui

# Specific browser
pnpm e2e --project=chromium
```

### Writing a Component Test

```typescript
// src/components/features/__tests__/MotorControls.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MotorControls } from '../MotorControls'
import type { RobotState } from '../../../types'

describe('MotorControls', () => {
  const mockRobot: RobotState = {
    config: {
      id: '1',
      name: 'Test Robot',
      motorIp: '192.168.1.100',
      cameraIp: '192.168.1.101',
      createdAt: new Date(),
    },
    connectionStatus: 'online',
    cameraStatus: 'connected',
  }

  it('renders all direction buttons', () => {
    render(<MotorControls robot={mockRobot} />)

    expect(screen.getByText('Forward')).toBeInTheDocument()
    expect(screen.getByText('Back')).toBeInTheDocument()
    expect(screen.getByText('Left')).toBeInTheDocument()
    expect(screen.getByText('Right')).toBeInTheDocument()
  })

  it('calls sendMotorCommand on button click', async () => {
    const user = userEvent.setup()
    render(<MotorControls robot={mockRobot} />)

    const forwardButton = screen.getByText('Forward')
    await user.click(forwardButton)

    // Assert mutation was called (requires mock setup)
  })
})
```

---

## Updating Environment Variables

### 1. Add to .env

```env
# .env
VITE_DEFAULT_ROBOT_NAME=Tumbller-1
VITE_DEFAULT_MOTOR_IP=192.168.1.100
VITE_DEFAULT_CAMERA_IP=192.168.1.101
VITE_API_TIMEOUT=5000  # ← New variable
```

### 2. Update env.ts

```typescript
// src/utils/env.ts
export const env = {
  defaultRobotName: import.meta.env.VITE_DEFAULT_ROBOT_NAME,
  defaultMotorIp: import.meta.env.VITE_DEFAULT_MOTOR_IP,
  defaultCameraIp: import.meta.env.VITE_DEFAULT_CAMERA_IP,
  apiTimeout: import.meta.env.VITE_API_TIMEOUT || '5000',  // ← New
}
```

### 3. Use in Code

```typescript
// src/services/robotApi.ts
import { env } from '../utils/env'

const timeout = parseInt(env.apiTimeout)
signal: AbortSignal.timeout(timeout)
```

### 4. Restart Dev Server

Environment variables are loaded at build time, not runtime.

```bash
# Ctrl+C to stop
pnpm dev
```

---

## Debugging State Issues

### 1. Add Zustand Devtools

```typescript
// src/stores/robotStore.ts
import { devtools } from 'zustand/middleware'

export const useRobotStore = create<RobotStore>()(
  devtools(
    persist(/* ... */),
    { name: 'RobotStore' }
  )
)
```

Install Redux DevTools browser extension.

### 2. Log State Changes

```typescript
// In component
useEffect(() => {
  console.log('Robot state changed:', robot)
}, [robot])
```

### 3. Inspect localStorage

```javascript
// Browser console
JSON.parse(localStorage.getItem('tumbller-robot-storage'))
```

### 4. Clear Persisted State

```javascript
// Browser console
localStorage.removeItem('tumbller-robot-storage')
location.reload()
```

---

## Deployment

### Build for Production

```bash
# Create optimized build
pnpm build

# Output in dist/ folder
ls dist/
```

### Preview Production Build

```bash
pnpm preview
# Opens at http://localhost:4173
```

### Deploy to Static Hosting

**GitHub Pages:**
```bash
# Install gh-pages
pnpm add -D gh-pages

# Add to package.json scripts:
"deploy": "pnpm build && gh-pages -d dist"

# Deploy
pnpm deploy
```

**Netlify:**
- Connect GitHub repository
- Build command: `pnpm build`
- Publish directory: `dist`

**Vercel:**
- Import Git repository
- Framework: Vite
- Build command: `pnpm build`
- Output directory: `dist`

**Note:** Robot control requires being on same network as ESP32 devices.

---

## Upgrading Dependencies

### Check for Updates

```bash
pnpm outdated
```

### Update All Dependencies

```bash
pnpm update --latest
```

### Update Specific Package

```bash
pnpm update @chakra-ui/react --latest
```

### After Updating

```bash
# Type check
pnpm typecheck

# Run tests
pnpm test

# Manual testing
pnpm dev
```

---

## Git Workflow

### Create Feature Branch

```bash
git checkout -b feature/battery-status
```

### Commit Changes

```bash
git add .
git commit -m "feat: add battery status display

- Add BatteryStatus component
- Add battery API endpoint
- Update robotStore with battery state

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Push and Create PR

```bash
git push -u origin feature/battery-status

# Create PR with gh CLI
gh pr create --title "Add battery status display" --body "..."
```

---

## Quick Reference Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm preview          # Preview build

# Quality checks
pnpm lint             # ESLint
pnpm typecheck        # TypeScript
pnpm test             # Run tests
pnpm check            # All checks

# Cleanup
rm -rf node_modules pnpm-lock.yaml
pnpm install          # Fresh install
```

---

## Next Steps

- **New feature?** Read [architecture.md](architecture.md) first
- **Bug?** Check [debugging.md](debugging.md)
- **Understanding codebase?** See [quick-start.md](quick-start.md)
