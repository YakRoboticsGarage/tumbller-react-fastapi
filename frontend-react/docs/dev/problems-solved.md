# Problems Solved

A reference guide of issues encountered during development and their solutions.

---

## Problem 1: Modal Not Closing After Adding Robot

**Symptom:** "Add Robot" dialog stayed open after clicking "Add Robot" button.

**Root Cause:** No callback mechanism to notify parent component when form submission succeeded.

**Investigation:**
1. Checked form submission logic - robot was being added correctly
2. Checked modal state - `isOpen` wasn't being updated
3. Realized AddRobotForm had no way to tell RobotControlPage to close modal

**Solution:**

Added optional `onSuccess` callback prop to `AddRobotForm`:

```typescript
// src/components/features/AddRobotForm.tsx
interface AddRobotFormProps {
  onSuccess?: () => void  // New prop
}

export function AddRobotForm({ onSuccess }: AddRobotFormProps) {
  const onSubmit = async (data: RobotFormData) => {
    // ... add robot logic
    toast({ title: 'Robot added successfully', status: 'success' })
    reset()
    onSuccess?.()  // Call callback to close modal
  }
}
```

```typescript
// src/pages/RobotControlPage.tsx
<AddRobotForm onSuccess={onClose} />
```

**Lesson Learned:** Always consider how child components communicate success/completion back to parents.

**File Modified:** `src/components/features/AddRobotForm.tsx`, `src/pages/RobotControlPage.tsx`

---

## Problem 2: Connect Button Not Visible

**Symptom:** User reported "There is NO button to connect to the robot still. There is Robot status with a dummy button that says not connected but I can't press it."

**Root Cause:** Complex nested ternary operators and conditional rendering logic made the Connect button fail to render for 'disconnected' state.

**Investigation Steps:**

1. Added debug console.log:
```typescript
console.log('Robot connection status:', robot.connectionStatus)
```

2. Discovered button wasn't rendering for `disconnected` state

3. Original problematic code:
```typescript
// BUGGY - Complex nested conditions
<HStack spacing={2}>
  {(robot.connectionStatus === 'disconnected' ||
    robot.connectionStatus === 'offline') && (
    <Button>Connect</Button>
  )}
  {robot.connectionStatus === 'online' && (
    <Button>Disconnect</Button>
  )}
  {robot.connectionStatus === 'connecting' && (
    <Button isLoading>Connecting...</Button>
  )}
</HStack>
```

**Solution:**

Simplified to explicit ternary with clear state handling:

```typescript
// src/components/features/RobotConnection.tsx
<Box>
  {robot.connectionStatus === 'online' ? (
    <Button
      colorScheme="red"
      variant="outline"
      onClick={handleDisconnect}
    >
      Disconnect
    </Button>
  ) : robot.connectionStatus === 'connecting' ? (
    <Button
      colorScheme="brand"
      isLoading={true}
      loadingText="Connecting..."
    >
      Connecting...
    </Button>
  ) : (
    <Button
      colorScheme="brand"
      onClick={handleConnect}
      isLoading={isChecking}
    >
      {robot.connectionStatus === 'offline' ? 'Retry Connection' : 'Connect to Robot'}
    </Button>
  )}
</Box>
```

**Why This Works:**
- Single ternary chain covers all states explicitly
- Each state has clear button rendering
- No complex boolean logic that might short-circuit

**Lesson Learned:**
- Prefer simple, explicit conditionals over compound boolean logic
- Debug with console.log to verify state values
- When user says "there is NO button", believe them - it's not rendering

**File Modified:** `src/components/features/RobotConnection.tsx:82-136`

---

## Problem 3: Camera Stream Not Working (Stream Only Mode)

**Symptom:** Switching to "Stream Only" tab immediately showed error: "No Camera Available, Unable to connect to camera at 192.168.1.101"

**Root Cause:** Multiple issues:
1. Pre-flight camera check using fetch() with no-cors failed silently
2. Image onError fired immediately when element created
3. No retry tolerance for network hiccups
4. Error state persisted with no recovery mechanism

**Investigation:**

Examined ESP-CAM firmware source code from GitHub:
```javascript
// ESP-CAM stream.js implementation
function updateImage() {
  fetch('/getImage')
    .then(response => response.blob())
    .then(blob => {
      img.src = URL.createObjectURL(blob);
    });
}
setInterval(updateImage, 1000);  // Poll every second
```

**Key Discovery:** ESP-CAM /stream endpoint serves an HTML page with JavaScript, not a raw MJPEG stream. The JavaScript polls /getImage every 1 second.

**Solution:**

Implemented robust polling with preloading and retry tolerance:

```typescript
// src/components/features/CameraStream.tsx
function PollingCameraStream({ cameraIp }: { cameraIp: string }) {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [failCount, setFailCount] = useState(0)
  const [hasError, setHasError] = useState(false)
  const maxFails = 5  // Tolerance for network issues

  useEffect(() => {
    // Reset on camera IP change
    setHasError(false)
    setFailCount(0)
    setImageUrl('')

    const fetchImage = () => {
      const url = `${robotApi.getCameraImageUrl(cameraIp)}?t=${Date.now()}`

      // Preload image before displaying
      const img = new Image()

      img.onload = () => {
        setImageUrl(url)
        setFailCount(0)      // Reset on success - auto recovery!
        setHasError(false)
      }

      img.onerror = () => {
        setFailCount((prev) => {
          const newCount = prev + 1
          if (newCount >= maxFails) {
            setHasError(true)  // Only after 5 consecutive failures
          }
          return newCount
        })
      }

      img.src = url
    }

    fetchImage()  // Immediate first fetch
    const interval = setInterval(fetchImage, 1000)
    return () => clearInterval(interval)
  }, [cameraIp])

  // ... render logic
}
```

**Why This Works:**
1. **Preloading:** Image() object loads in background before display - no flicker
2. **Retry Tolerance:** Allows 5 consecutive failures before showing error
3. **Auto Recovery:** failCount resets to 0 on successful load
4. **Timestamp Cache Busting:** `?t=${Date.now()}` prevents browser cache
5. **Cleanup:** Clears interval on unmount

**Lesson Learned:**
- Don't trust pre-flight checks with no-cors mode
- Build tolerance for transient network issues
- Always implement auto-recovery mechanisms
- Read the actual ESP32 firmware source code to understand behavior

**File Modified:** `src/components/features/CameraStream.tsx:67-111`

---

## Problem 4: Stream Image Left-Aligned

**Symptom:** Camera stream in "Stream Only" mode displayed left-aligned instead of centered.

**Root Cause:** Image container lacked horizontal centering layout.

**Solution:**

Added flex wrapper with `justifyContent: center`:

```typescript
// src/components/features/CameraStream.tsx
return (
  <Box
    display="flex"
    justifyContent="center"  // Horizontal centering
    width="100%"
  >
    <Box
      position="relative"
      maxW="800px"
      bg="black"
      borderRadius="md"
      overflow="hidden"
    >
      <Box
        as="img"
        src={imageUrl}
        alt="Robot camera stream"
        width="100%"
        height="auto"
        display="block"
      />
    </Box>
  </Box>
)
```

**Why This Works:**
- Outer Box with `display: flex` and `justifyContent: center` centers child
- Inner Box constrains max width to 800px
- Image maintains aspect ratio with `width: 100%` and `height: auto`

**Lesson Learned:** Use flex layout for centering, not margins or text-align.

**File Modified:** `src/components/features/CameraStream.tsx:151-173`

---

## Problem 5: Wrong Button Color Scheme

**Symptom:** "Add Robot" button in form still used blue instead of brand orange theme.

**Root Cause:** Forgot to update colorScheme after theme customization.

**Solution:**

Changed `colorScheme="blue"` to `colorScheme="brand"`:

```typescript
// src/components/features/AddRobotForm.tsx
<Button
  type="submit"
  colorScheme="brand"  // Was "blue"
  isLoading={isSubmitting}
>
  Add Robot
</Button>
```

**Lesson Learned:** After theme changes, grep codebase for old color schemes:
```bash
grep -r 'colorScheme="blue"' src/
```

**File Modified:** `src/components/features/AddRobotForm.tsx`

---

## Problem 6: Logto Authentication Infinite Reload Loop

**Symptom:** After successful login via Logto, the robot control page continuously reloaded, showing "Checking authentication..." spinner repeatedly. Clearing localStorage temporarily stopped the loop.

**Root Cause:** Logto's `useLogto()` hook's `isLoading` state oscillates between `true` and `false` even after successful authentication, causing ProtectedRoute to repeatedly switch between loading spinner and rendered content.

**Console Pattern:**
```
[ProtectedRoute] Auth state: { isLoading: false, isAuthenticated: true }
[ProtectedRoute] Auth state: { isLoading: true, isAuthenticated: true }
[ProtectedRoute] Auth state: { isLoading: false, isAuthenticated: true }
(repeats infinitely)
```

**Investigation:**

1. **Initial attempts:**
   - Removed trailing slash from Logto endpoint ❌
   - Added 10-second timeout in ProtectedRoute ❌
   - Simplified CallbackPage to match official sample ❌
   - Removed React StrictMode (double-renders) ❌
   - Added error handling in UserProfile ✓ (helped but didn't solve)

2. **Key discovery:**
   - `useLogto()` hook was being called in BOTH ProtectedRoute AND RobotControlPage
   - Double hook invocation caused state oscillation
   - Removing one call helped but loop persisted

3. **Root cause identified:**
   - OAuth/OIDC SDKs (Auth0, Logto) toggle `isLoading` during token refresh and state revalidation
   - ProtectedRoute was **too reactive** to these transient loading states
   - Needed to ignore `isLoading` changes after initial authentication check

**Solution:**

Implemented a "latch" mechanism using `hasInitiallyLoaded` state:

```typescript
// src/components/common/ProtectedRoute.tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, error } = useAuth();
  const isAuthEnabled = useAuthEnabled();
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Track when we've completed the initial load
  useEffect(() => {
    if (!isLoading && !hasInitiallyLoaded) {
      console.log('[ProtectedRoute] Initial load complete');
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, hasInitiallyLoaded]);

  // Show loading spinner ONLY on the very first load
  if (!hasInitiallyLoaded && isLoading) {
    return <LoadingSpinner />;
  }

  // After initial load, ignore isLoading toggles
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // User is authenticated, render protected content
  // Even if isLoading toggles afterward, we stay on this page
  return <>{children}</>;
}
```

**Why This Works:**
1. On first render: `hasInitiallyLoaded = false`, so we respect `isLoading`
2. When `isLoading` first becomes `false`: Set `hasInitiallyLoaded = true`
3. After that: Even if `isLoading` toggles, we ignore it because `hasInitiallyLoaded = true`
4. The authenticated page stays rendered, unaffected by background state changes

**Additional Cleanup:**
- Removed redundant `useAuth()` call from RobotControlPage (already inside ProtectedRoute)
- Removed conditional `isAuthenticated` rendering since ProtectedRoute guarantees auth
- Simplified header to show UserProfile and LogoutButton without checks

**Lesson Learned:**
- OAuth SDKs perform background operations (token refresh, state sync) that toggle loading states
- Components should only react to `isLoading` during **initial** authentication check
- After authentication is confirmed, ignore transient loading states
- Don't call authentication hooks multiple times in the component tree

**File Modified:**
- `src/components/common/ProtectedRoute.tsx`
- `src/pages/RobotControlPage.tsx`

---

## Common Debugging Patterns

### 1. Connection Issues

```typescript
// Add debug logging
console.log('Robot connection status:', robot.connectionStatus)
console.log('Attempting connection to:', robot.config.motorIp)

// Test endpoint manually
curl http://192.168.1.100/motor/stop

// Check network
ping 192.168.1.100
```

### 2. Component Not Rendering

```typescript
// Log render conditions
console.log('Render condition:', robot.connectionStatus === 'online')

// Check state
console.log('Active robot:', activeRobot)

// Verify component tree
<React.StrictMode>  // Helps catch issues
```

### 3. State Not Updating

```typescript
// Log state changes
useEffect(() => {
  console.log('Robot state changed:', robot)
}, [robot])

// Check Zustand store
const robots = useRobotStore((state) => state.robots)
console.log('All robots:', Array.from(robots.values()))
```

### 4. Form Validation Errors

```typescript
// Log validation errors
const { formState: { errors } } = useForm()
console.log('Form errors:', errors)

// Test Zod schema directly
const result = robotFormSchema.safeParse(data)
if (!result.success) {
  console.log('Validation errors:', result.error.issues)
}
```

---

## Resources

- [debugging.md](debugging.md) - Full troubleshooting guide
- [ESP32_API_Reference.md](../ESP32_API_Reference.md) - API endpoint documentation
- [architecture.md](architecture.md) - System design overview
