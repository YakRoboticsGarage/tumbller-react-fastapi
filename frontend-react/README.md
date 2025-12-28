# Tumbller Robot Control Web App

A React web application for controlling Tumbller robots that run on ESP32S3 (motor control) and ESP-CAM (camera streaming).

## Features

- **Multi-Robot Support**: Control multiple robots from a single interface
- **Motor Controls**: Four-directional movement controls (Forward, Back, Left, Right)
- **Live Camera Stream**: Real-time video feed from ESP-CAM
- **Persistent Storage**: Robot configurations saved in browser local storage
- **Optional Authentication**: Logto integration (enable when needed)
- **Modern UI**: Built with Chakra UI for a clean, responsive interface

## Tech Stack

- React 18 + TypeScript
- Vite 6 (build tool)
- Chakra UI (component library)
- React Query (server state)
- Zustand (client state with persistence)
- React Hook Form + Zod (form validation)
- React Router (routing)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Configure default robot (optional)
cp .env.example .env
# Edit .env and set your robot IPs

# Start development server
pnpm dev
```

The app will be available at http://localhost:5173/

### Environment Configuration

You can optionally configure a default robot that will be loaded automatically on first startup:

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set your robot's IP addresses:
   ```env
   VITE_DEFAULT_ROBOT_NAME=Tumbller-1
   VITE_DEFAULT_MOTOR_IP=192.168.1.100
   VITE_DEFAULT_CAMERA_IP=192.168.1.101
   ```

3. The robot will be automatically added when you first open the app

**Note**: If you skip this step, you can still add robots manually through the UI.

### Optional: Enable Authentication

By default, the app runs without authentication. To enable Logto:

1. Set up a Logto application (see [Logto Integration Guide](docs/Logto_Integration_Guide.md))
2. Update `.env`:
   ```env
   VITE_ENABLE_AUTH=true
   VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
   VITE_LOGTO_APP_ID=your-app-id
   ```
3. Restart the dev server

See [docs/Logto_Integration_Guide.md](docs/Logto_Integration_Guide.md) for detailed setup.

### Other Commands

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Testing
pnpm test
pnpm test:coverage

# Production build
pnpm build
pnpm preview

# Run all checks
pnpm check
```

## Usage

### Adding a Robot

1. Click the "Add Robot" button
2. Enter:
   - Robot name (e.g., "Robot 1")
   - Motor Controller IP (ESP32S3 IP address, e.g., `192.168.1.100`)
   - Camera IP (ESP-CAM IP address, e.g., `192.168.1.101`)
3. Click "Add Robot"

### Controlling a Robot

1. Select a robot from the dropdown
2. The camera interface will appear with two display modes:
   - **Full Interface** (default): Shows the complete ESP-CAM web interface with resolution controls, rotation buttons, and stream
   - **Stream Only**: Shows just the camera feed with automatic 1-second polling
3. Use the directional buttons to control the robot:
   - **Forward**: Move forward
   - **Back**: Move backward
   - **Left**: Turn left
   - **Right**: Turn right

### Managing Robots

- Switch between robots using the dropdown selector
- Remove a robot using the "Remove Robot" button
- Robot configurations persist across browser sessions

## Robot API Endpoints

### ESP32S3 Motor Controller

The application sends GET requests to these endpoints:

- `GET /motor/forward` - Move forward (2 seconds, speed 60)
- `GET /motor/back` - Move backward (2 seconds, speed 60)
- `GET /motor/left` - Turn left (1 second, speed 60)
- `GET /motor/right` - Turn right (1 second, speed 60)
- `GET /motor/stop` - Stop all motors immediately

Motor commands automatically stop after their preset duration.

### ESP-CAM Camera Module

The ESP-CAM firmware exposes these endpoints:

- `GET /getImage` - Get single JPEG frame (polled every 1 second by React app)
- `GET /stream` - Web interface (HTML page, not used by React app)
- `GET /setResolution?size=<value>` - Change resolution (SVGA, XGA, HD, SXGA, UXGA)
- `GET /rotate?degrees=<value>` - Rotate image (0, 90, 180, 270)

**Note**: The camera stream is implemented by polling `/getImage` every 1 second, similar to the ESP-CAM's own web interface. This is NOT an MJPEG stream.

For detailed API documentation, see [docs/ESP32_API_Reference.md](docs/ESP32_API_Reference.md).

## Network Configuration

### CORS Considerations

The app uses `mode: 'no-cors'` for fetch requests to accommodate ESP32 devices that may not support CORS. This means:

- Motor commands are sent but responses cannot be read
- Success is assumed if no network error occurs
- Camera images are loaded and displayed successfully

### Camera Stream Implementation

The camera feed is created by:
1. Polling `/getImage` endpoint every 1 second
2. Adding timestamp to prevent caching: `/getImage?t={timestamp}`
3. Preloading each frame before display for smooth transitions
4. Retry logic with max 3 attempts before showing error

### Timeout Settings

- Motor commands: 5 second timeout
- Camera image fetch: No explicit timeout (relies on browser defaults)
- Retry attempts: 3 failed fetches before showing "No Camera Available"

## Project Structure

```
src/
├── components/
│   └── features/
│       ├── AddRobotForm.tsx      # Form to add new robots
│       ├── CameraStream.tsx      # Camera stream display
│       └── MotorControls.tsx     # Movement control buttons
├── pages/
│   └── RobotControlPage.tsx      # Main control page
├── services/
│   └── robotApi.ts               # Robot API client
├── stores/
│   └── robotStore.ts             # Zustand store for robot state
├── theme/
│   └── index.ts                  # Chakra UI theme
├── types/
│   └── robot.ts                  # TypeScript interfaces
├── App.tsx                       # Root component
└── main.tsx                      # Entry point
```

## Development

### Adding New Features

Follow the patterns established in:
- `docs/component-patterns.md` - Component architecture
- `docs/api-integration.md` - React Query patterns
- `docs/testing-guide.md` - Testing conventions

### Code Quality

- TypeScript strict mode enabled
- ESLint configured for React + TypeScript
- Run `pnpm check` before committing

## Troubleshooting

### Camera Stream Not Working

- Verify ESP-CAM is powered on and accessible
- Check camera IP address is correct
- Test the camera directly by visiting `http://<camera-ip>/getImage` in your browser
- Ensure ESP-CAM firmware is from the Tumbller repository (exposes `/getImage`)
- Check browser console for network errors
- Verify you're on the same network as the ESP-CAM

### Motor Commands Not Working

- Verify ESP32S3 is powered on and accessible
- Check motor controller IP address is correct
- Ensure endpoints match `/motor/{command}` pattern
- Check robot firmware logs for errors

### Network Issues

- Ensure your computer is on the same network as the robots
- Check firewall settings aren't blocking requests
- Try accessing robot IPs directly in browser (e.g., `http://192.168.1.100/motor/forward`)

## License

Apache 2.0 - See LICENSE file for details

## Related Repositories

- [Tumbller ESP32S3 Firmware](https://github.com/YakRoboticsGarage/tumbller-esp32s3)
- [Tumbller ESP-CAM Firmware](https://github.com/YakRoboticsGarage/tumbller-esp-cam)
