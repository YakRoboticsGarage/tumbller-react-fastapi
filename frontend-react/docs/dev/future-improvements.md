# Future Improvements

Potential enhancements and feature ideas for Tumbller Robot Control.

---

## High Priority

### 1. WebSocket Communication

**Current:** HTTP polling (camera: 1s intervals, status checks on demand)

**Improvement:** WebSocket for bidirectional real-time communication

**Benefits:**
- Lower latency for motor commands
- Real-time robot status updates
- Reduced network overhead
- Battery level streaming
- Sensor data streaming

**Implementation:**

```typescript
// New service: src/services/robotWebSocket.ts
export class RobotWebSocket {
  private ws: WebSocket | null = null

  connect(motorIp: string) {
    this.ws = new WebSocket(`ws://${motorIp}/ws`)

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      // Update Zustand store with real-time data
    }
  }

  sendCommand(command: MotorCommand) {
    this.ws?.send(JSON.stringify({ type: 'motor', command }))
  }
}
```

**ESP32 Firmware:** May need to add WebSocket server support

**Effort:** Medium (2-3 days)

---

### 2. Battery Status Display

**Feature:** Show robot battery level

**UI Design:**
```tsx
<HStack spacing={3}>
  <Icon as={FaBatteryHalf} color="green.500" />
  <Text fontSize="sm">87%</Text>
  <Badge colorScheme={batteryLevel < 20 ? 'red' : 'green'}>
    {batteryLevel < 20 ? 'Low' : 'Good'}
  </Badge>
</HStack>
```

**API Endpoint Needed:** `GET /battery` on ESP32

**Implementation:**
1. Add battery endpoint to ESP32 firmware
2. Create BatteryStatus component
3. Add battery state to robotStore
4. Poll every 30 seconds when connected

**Effort:** Low (4-6 hours)

---

### 3. Speed Control (PWM)

**Current:** Fixed speed motors

**Improvement:** Adjustable speed via PWM duty cycle

**UI Design:**
```tsx
<VStack>
  <Text fontSize="sm">Speed: {speed}%</Text>
  <Slider
    value={speed}
    onChange={setSpeed}
    min={25}
    max={100}
    step={25}
  >
    <SliderTrack bg="brand.100">
      <SliderFilledTrack bg="brand.500" />
    </SliderTrack>
    <SliderThumb />
  </Slider>
</VStack>
```

**API Change:**
```typescript
// Current
GET /motor/forward

// New
GET /motor/forward?speed=75
```

**Implementation:**
1. Add speed parameter to ESP32 endpoints
2. Add speed slider to MotorControls
3. Update sendMotorCommand to include speed

**Effort:** Low (4-6 hours)

---

## Medium Priority

### 4. Movement Macros

**Feature:** Record and replay movement sequences

**Use Cases:**
- Dance routines
- Patrol patterns
- Obstacle avoidance sequences

**UI Design:**
```tsx
<VStack>
  <HStack>
    <Button onClick={startRecording}>Record</Button>
    <Button onClick={stopRecording}>Stop</Button>
    <Button onClick={playMacro}>Play</Button>
  </HStack>
  <List>
    {macroSteps.map((step, i) => (
      <ListItem key={i}>
        {step.command} - {step.duration}ms
      </ListItem>
    ))}
  </List>
</VStack>
```

**Data Structure:**
```typescript
interface MacroStep {
  command: MotorCommand
  duration: number
}

interface Macro {
  id: string
  name: string
  steps: MacroStep[]
}
```

**Implementation:**
1. Add macro recording state
2. Create Macro editor component
3. Persist macros to localStorage
4. Playback engine with timing

**Effort:** Medium (1-2 days)

---

### 5. Multiple Robot Simultaneous Control

**Current:** Control one robot at a time

**Improvement:** Send commands to multiple robots simultaneously

**UI Design:**
```tsx
<Checkbox>Control All Robots</Checkbox>

{/* Or */}
<CheckboxGroup>
  {robots.map(robot => (
    <Checkbox key={robot.id} value={robot.id}>
      {robot.name}
    </Checkbox>
  ))}
</CheckboxGroup>
```

**Implementation:**
1. Add multi-select state to robotStore
2. Modify sendMotorCommand to accept robot array
3. Promise.all() for parallel requests
4. Aggregate status feedback

**Effort:** Low (6-8 hours)

---

### 6. Sensor Data Display

**Feature:** Show ultrasonic distance, line sensors, etc.

**UI Components:**
- Distance gauge
- Line sensor visualization
- Obstacle detection indicator

**Example:**
```tsx
<HStack spacing={4}>
  <VStack>
    <Text fontSize="xs">Distance</Text>
    <CircularProgress
      value={distance}
      max={100}
      color="brand.500"
    >
      <CircularProgressLabel>{distance}cm</CircularProgressLabel>
    </CircularProgress>
  </VStack>

  <VStack>
    <Text fontSize="xs">Line Sensors</Text>
    <HStack>
      {lineSensors.map((value, i) => (
        <Box
          key={i}
          w="20px"
          h="20px"
          bg={value ? 'black' : 'white'}
          borderWidth="1px"
        />
      ))}
    </HStack>
  </VStack>
</HStack>
```

**ESP32 Endpoint:** `GET /sensors` returning JSON

**Effort:** Medium (1-2 days depending on sensors)

---

### 7. Camera Settings Control

**Feature:** Adjust camera resolution, brightness, contrast from React app

**Current Workaround:** Use "Full Interface" mode

**Improvement:** Native controls in React UI

**UI Design:**
```tsx
<VStack>
  <FormControl>
    <FormLabel>Resolution</FormLabel>
    <Select value={resolution} onChange={handleResolutionChange}>
      <option value="VGA">VGA (640x480)</option>
      <option value="SVGA">SVGA (800x600)</option>
      <option value="HD">HD (1280x720)</option>
    </Select>
  </FormControl>

  <FormControl>
    <FormLabel>Brightness: {brightness}</FormLabel>
    <Slider value={brightness} onChange={setBrightness} min={-2} max={2}>
      <SliderTrack><SliderFilledTrack /></SliderTrack>
      <SliderThumb />
    </Slider>
  </FormControl>
</VStack>
```

**ESP32 Endpoints:**
- `GET /camera/control?var=framesize&val=9`
- `GET /camera/control?var=brightness&val=1`

**Effort:** Low (4-6 hours)

---

## Low Priority / Nice to Have

### 8. Keyboard Controls

**Feature:** WASD or arrow keys for motor control

**Implementation:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'w' || e.key === 'ArrowUp') {
      sendCommand('forward')
    }
    // ... other keys
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**UX Considerations:**
- Only when robot card is focused
- Disable when typing in forms
- Visual feedback on key press

**Effort:** Low (2-3 hours)

---

### 9. Gamepad Support

**Feature:** Xbox/PlayStation controller support

**Library:** [react-gamepad](https://github.com/SBRK/react-gamepad)

**Implementation:**
```typescript
<Gamepad
  onButtonDown={(buttonName) => {
    if (buttonName === 'DPadUp') sendCommand('forward')
  }}
>
  <MotorControls robot={robot} />
</Gamepad>
```

**Effort:** Low (4-6 hours)

---

### 10. Dark Mode Toggle

**Feature:** Light/dark theme switch

**Chakra UI Support:** Built-in with `useColorMode`

**Implementation:**
```tsx
const { colorMode, toggleColorMode } = useColorMode()

<IconButton
  icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
  onClick={toggleColorMode}
  aria-label="Toggle theme"
/>
```

**Theme Updates:**
```typescript
// src/theme/index.ts
config: {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

styles: {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'brand.50',
    }
  })
}
```

**Effort:** Low (3-4 hours)

---

### 11. Robot Health Monitoring

**Feature:** Track robot uptime, errors, statistics

**Dashboard:**
- Total runtime
- Commands sent count
- Error rate
- Average battery drain
- Connection stability graph

**Data Storage:** IndexedDB for historical data

**Effort:** High (3-5 days)

---

### 12. Multi-User Support

**Feature:** Multiple users controlling different robots

**Architecture:**
- WebSocket rooms per robot
- User authentication (optional)
- Real-time "user X is controlling Robot Y" indicator

**Use Case:** Classroom or team environments

**Effort:** High (5-7 days)

---

### 13. Autonomous Mode

**Feature:** Pre-programmed autonomous behaviors

**Behaviors:**
- Obstacle avoidance
- Line following
- Patrol mode
- Return to base

**Implementation:**
- ESP32 firmware handles autonomous logic
- React UI just starts/stops modes
- Real-time status updates

**Effort:** High (firmware + UI: 5-7 days)

---

### 14. Video Recording

**Feature:** Record camera stream to file

**Browser API:** MediaRecorder with canvas stream

**Implementation:**
```typescript
const canvas = document.querySelector('canvas')
const stream = canvas.captureStream(30)
const recorder = new MediaRecorder(stream)

recorder.start()
// ... later
recorder.stop()

recorder.ondataavailable = (e) => {
  const blob = new Blob([e.data], { type: 'video/webm' })
  const url = URL.createObjectURL(blob)
  // Download link
}
```

**Effort:** Medium (1-2 days)

---

### 15. Settings Page

**Feature:** Central configuration page

**Settings:**
- Default polling intervals
- Camera quality presets
- API timeout values
- Theme customization
- Export/import robot configurations

**Implementation:**
```typescript
// New page: src/pages/SettingsPage.tsx
<Tabs>
  <TabList>
    <Tab>General</Tab>
    <Tab>Network</Tab>
    <Tab>Camera</Tab>
    <Tab>Theme</Tab>
  </TabList>
  <TabPanels>{/* ... */}</TabPanels>
</Tabs>
```

**Effort:** Medium (2-3 days)

---

## Performance Optimizations

### 16. Component Memoization

**Current:** Some unnecessary re-renders

**Improvement:**
```typescript
export const MotorControls = React.memo(({ robot }: MotorControlsProps) => {
  // ...
}, (prevProps, nextProps) => {
  return prevProps.robot.config.id === nextProps.robot.config.id &&
         prevProps.robot.connectionStatus === nextProps.robot.connectionStatus
})
```

**Effort:** Low (2-3 hours)

---

### 17. Virtual Scrolling for Robot List

**When Needed:** If managing 50+ robots

**Library:** [react-window](https://github.com/bvaughn/react-window)

**Effort:** Low (3-4 hours)

---

## Testing

### 18. Unit Tests

**Coverage Goals:**
- Components: 80%+
- Services: 90%+
- Stores: 100%

**Framework:** Vitest + React Testing Library (already configured)

**Effort:** Medium (3-5 days for comprehensive coverage)

---

### 19. E2E Tests

**Scenarios:**
- Add robot flow
- Connection workflow
- Motor control interaction
- Camera mode switching

**Framework:** Playwright (already configured)

**Effort:** Medium (2-3 days)

---

### 20. Visual Regression Tests

**Tool:** [Percy](https://percy.io/) or [Chromatic](https://www.chromatic.com/)

**Purpose:** Catch unintended UI changes

**Effort:** Low (1 day)

---

## Developer Experience

### 21. Storybook

**Purpose:** Component development and documentation

**Benefit:** Isolated component development

**Effort:** Medium (1-2 days setup + stories)

---

### 22. API Mocking

**Tool:** [MSW](https://mswjs.io/) (Mock Service Worker)

**Purpose:** Develop without physical robot

**Effort:** Medium (1-2 days)

---

## Deployment

### 23. Docker Container

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "preview"]
```

**Effort:** Low (2-3 hours)

---

### 24. CI/CD Pipeline

**Platform:** GitHub Actions

**Workflow:**
- Lint on PR
- Type check on PR
- Run tests on PR
- Deploy to Netlify on merge to main

**Effort:** Low (4-6 hours)

---

## Roadmap Suggestion

### Phase 2 (Next Sprint)

1. Battery Status Display
2. Speed Control
3. WebSocket Communication

**Timeline:** 1-2 weeks

### Phase 3

1. Movement Macros
2. Sensor Data Display
3. Unit Tests

**Timeline:** 2-3 weeks

### Phase 4

1. Autonomous Mode
2. Multi-Robot Control
3. E2E Tests

**Timeline:** 3-4 weeks

---

## Contributing

When implementing these features:

1. **Read existing docs first**
   - [architecture.md](architecture.md) for design patterns
   - [common-tasks.md](common-tasks.md) for how-to guides

2. **Follow conventions**
   - TypeScript strict mode
   - Chakra UI components
   - Brand theme colors

3. **Update docs**
   - Add to this file if you have new ideas
   - Update [changelog.md](changelog.md) when shipping
   - Add examples to [common-tasks.md](common-tasks.md)

4. **Test thoroughly**
   - Manual testing with physical robot
   - Unit tests for logic
   - Update [problems-solved.md](problems-solved.md) if you encounter issues

---

## Request for Features

Have an idea? Add it here with:
- **Feature Name**
- **Description** - What it does
- **Use Case** - Why it's useful
- **Implementation Notes** - How it could work
- **Effort Estimate** - Low/Medium/High

Then discuss with team or implement!

---

**This is a living document** - update as priorities change and features are implemented.
