# Debugging Guide

Troubleshooting common issues with Tumbller Robot Control.

---

## Connection Issues

### Robot Won't Connect (Status: Offline)

**Check List:**

1. **Robot Power**
   ```bash
   # Verify ESP32S3 has power LED on
   # Check power supply voltage (5V recommended)
   ```

2. **Network Connectivity**
   ```bash
   # Ping motor controller
   ping 192.168.1.100

   # If unreachable, check:
   # - Robot is on same WiFi network
   # - IP address is correct
   # - Router hasn't reassigned IP (DHCP)
   ```

3. **ESP32 Web Server Running**
   ```bash
   # Test endpoint directly
   curl http://192.168.1.100/motor/stop

   # Should return immediately (no-cors, can't read response)
   # If timeout or connection refused, ESP32 server isn't running
   ```

4. **Firewall/Network Restrictions**
   ```bash
   # Check browser console for CORS errors
   # Try from different device on same network
   # Disable VPN if active
   ```

**Common Fixes:**
- Power cycle the robot (ESP32 boot takes ~5-10 seconds)
- Check ESP32 serial monitor for WiFi connection logs
- Verify WiFi credentials in ESP32 firmware
- Set static IP on router for robot

---

## Camera Issues

### Camera Shows "No Camera Available"

**Diagnosis Steps:**

1. **Test Camera Endpoint Directly**
   ```bash
   # In browser, open:
   http://192.168.1.101/stream

   # Should show ESP-CAM web interface
   # If this works, app should work too
   ```

2. **Check Stream Only Mode Retry Logic**
   - Open browser DevTools Console (F12)
   - Switch to "Stream Only" tab
   - Watch for repeated errors
   - If errors persist after 5+ attempts, camera is truly offline

3. **ESP-CAM Initialization Time**
   - ESP-CAM can take 10-20 seconds after power-on to start streaming
   - Wait, then click "Retry Connection" or refresh page

4. **Camera IP Address**
   ```bash
   # Verify camera IP
   ping 192.168.1.101

   # Test image endpoint
   curl -I http://192.168.1.101/getImage
   # Should return HTTP headers with image/jpeg content-type
   ```

**Common Fixes:**
- Wait 20 seconds after ESP-CAM power-on
- Power cycle ESP-CAM module
- Try "Full Interface" mode - embeds camera's native webpage
- Check ESP-CAM has sufficient power (brown-out can cause camera failure)
- Verify camera ribbon cable is properly seated

### Camera Feed is Choppy/Laggy

**Causes:**
- WiFi signal strength
- Network congestion
- ESP-CAM CPU overload

**Solutions:**
```javascript
// Reduce polling frequency (edit CameraStream.tsx)
const interval = setInterval(fetchImage, 2000)  // Was 1000ms

// Or switch to Full Interface mode (uses camera's native implementation)
```

**Network Optimization:**
- Move robot closer to WiFi router
- Use 2.4GHz WiFi (better range than 5GHz)
- Reduce camera resolution in Full Interface mode

### Camera Shows Old/Frozen Frame

**Cause:** Browser caching image responses

**Fix:** Already implemented - timestamp cache busting
```typescript
const url = `${robotApi.getCameraImageUrl(cameraIp)}?t=${Date.now()}`
```

If still happening, hard refresh browser (Ctrl+Shift+R)

---

## Motor Control Issues

### Buttons Don't Respond

**Check:**

1. **Connection Status Must Be "Online"**
   - Motor controls only render when `connectionStatus === 'online'`
   - If status is "Not Connected" or "Offline", Connect button must be clicked first

2. **Network Request Succeeds**
   ```bash
   # Open DevTools Network tab
   # Click a motor button
   # Should see request to http://{motorIp}/motor/forward
   # Status might show "(failed)" due to no-cors, that's OK
   ```

3. **ESP32 Serial Monitor**
   ```bash
   # Connect ESP32S3 to computer via USB
   # Open serial monitor (115200 baud)
   # Click motor button in app
   # Should see log: "Received command: forward"
   ```

**Common Fixes:**
- Ensure robot is connected (green "Connected" badge)
- Check motor power supply (motors need separate 5V+ power)
- Verify motor driver connections to ESP32 GPIO pins
- Test motor endpoints with curl to isolate app vs firmware issue

### Motors Move But Wrong Direction

**Cause:** Motor wiring or firmware GPIO configuration

**Fix:** Update ESP32 firmware motor pin mappings, not a webapp issue

---

## Development Issues

### Build Fails

**TypeScript Errors:**
```bash
pnpm typecheck

# Common fixes:
# - Missing type imports
# - Incorrect prop types
# - Check tsconfig.json strict mode
```

**ESLint Errors:**
```bash
pnpm lint

# Auto-fix:
pnpm lint --fix
```

**Dependency Issues:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Hot Module Replacement (HMR) Not Working

```bash
# Restart dev server
# Ctrl+C, then:
pnpm dev

# If still broken:
# Delete .vite cache
rm -rf node_modules/.vite
pnpm dev
```

### Environment Variables Not Loading

**Check:**
1. `.env` file exists in project root (not `src/`)
2. Variable names start with `VITE_`
3. Restart dev server after changing .env
4. Verify in code:
   ```typescript
   console.log('Motor IP:', import.meta.env.VITE_DEFAULT_MOTOR_IP)
   ```

---

## State/UI Issues

### Robot Selection Dropdown Empty

**Diagnosis:**
```typescript
// Add to RobotControlPage.tsx
useEffect(() => {
  console.log('All robots:', Array.from(robots.values()))
}, [robots])
```

**Causes:**
- No robots added yet - click "Add Robot"
- localStorage corrupted - clear storage:
  ```javascript
  // In browser console:
  localStorage.removeItem('tumbller-robot-storage')
  location.reload()
  ```

### Changes Don't Persist After Refresh

**Check:**
1. **Zustand Persist Middleware Configured**
   ```typescript
   // Should see in robotStore.ts:
   persist(
     (set, get) => ({ /* ... */ }),
     { name: 'tumbller-robot-storage' }
   )
   ```

2. **localStorage Working**
   ```javascript
   // Browser console:
   localStorage.getItem('tumbller-robot-storage')
   // Should return JSON string
   ```

3. **Private/Incognito Mode**
   - localStorage disabled in some browser modes
   - Use normal browser window

### Modal Won't Close

**Fixed in v1.0.0** - See [problems-solved.md](problems-solved.md#problem-1-modal-not-closing-after-adding-robot)

If issue persists:
```typescript
// Verify onSuccess callback exists
<AddRobotForm onSuccess={onClose} />
```

---

## Browser Console Errors

### "Failed to fetch" / Network Errors

**Expected when using no-cors mode:**
```
GET http://192.168.1.100/motor/forward net::ERR_FAILED
```

This is NORMAL and does NOT indicate failure. The request succeeds, but browser can't read response due to CORS policy.

**To verify actual success:**
- Check ESP32 serial monitor
- Watch robot physical movement
- Use Network tab instead of Console

### "Cannot read property of undefined"

**Cause:** Robot state not loaded yet

**Fix:** Add optional chaining:
```typescript
// Bad
<Text>{robot.config.name}</Text>

// Good
<Text>{robot?.config?.name ?? 'Loading...'}</Text>
```

### React Hook Errors

```
Warning: Cannot update a component while rendering a different component
```

**Cause:** State update during render

**Fix:** Move state updates to event handlers or useEffect:
```typescript
// Bad - state update during render
if (condition) setCount(count + 1)

// Good - state update in effect
useEffect(() => {
  if (condition) setCount(count + 1)
}, [condition])
```

---

## Performance Issues

### App Feels Slow

**Diagnosis:**
```bash
# Enable React DevTools Profiler
# Record interaction
# Check for unnecessary re-renders
```

**Common Causes:**
- Camera polling too frequent (reduce from 1000ms)
- Large state objects causing re-renders
- Missing React.memo on expensive components

**Optimization:**
```typescript
// Memoize expensive components
export const MotorControls = React.memo(({ robot }: MotorControlsProps) => {
  // ...
})
```

### localStorage Quota Exceeded

**Cause:** Too many robots or large data

**Fix:**
```javascript
// Browser console - clear old data
localStorage.clear()

// Or implement storage limit in robotStore
const MAX_ROBOTS = 10
```

---

## Debugging Tools

### Browser DevTools

**Console:** Logs, errors, warnings
- Check for red errors
- Network issues show here
- Use `console.log()` liberally

**Network Tab:**
- See all HTTP requests
- Check request URLs
- Verify no-cors mode requests

**Application → Local Storage:**
- View persisted Zustand state
- Edit or clear manually

**React DevTools:**
- Inspect component tree
- View props and state
- Profile performance

### Zustand DevTools

```typescript
// Add to robotStore.ts for debugging
import { devtools } from 'zustand/middleware'

export const useRobotStore = create<RobotStore>()(
  devtools(
    persist(/* ... */),
    { name: 'RobotStore' }
  )
)
```

Install Redux DevTools browser extension to inspect Zustand state.

### ESP32 Serial Monitor

**PlatformIO:**
```bash
pio device monitor -b 115200
```

**Arduino IDE:**
- Tools → Serial Monitor
- Set baud rate to 115200

**Logs to watch for:**
- WiFi connection status
- IP address assignment
- HTTP request received
- Motor command execution

---

## Getting Help

1. **Check existing issues:** [problems-solved.md](problems-solved.md)
2. **Review architecture:** [architecture.md](architecture.md)
3. **ESP32 API reference:** [ESP32_API_Reference.md](../ESP32_API_Reference.md)
4. **GitHub Issues:** Check ESP32 firmware repository for similar issues

**When Reporting Issues:**

Include:
- Browser console errors (full stack trace)
- Network tab showing failed requests
- ESP32 serial monitor output
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
