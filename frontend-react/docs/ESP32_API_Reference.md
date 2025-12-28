# ESP32 API Reference

This document compares the different ESP32-CAM implementations and documents the Tumbller robot API endpoints.

## Tumbller ESP32S3 (Motor Controller)

**Repository**: https://github.com/YakRoboticsGarage/tumbller-esp32s3

**Port**: 80 (HTTP)

### Motor Control Endpoints

All motor endpoints use **GET** requests and return HTTP 200 with HTML content-type.

| Endpoint | Function | Duration | Speed |
|----------|----------|----------|-------|
| `/motor/forward` | Move forward | 2 seconds | 60 |
| `/motor/back` | Move backward | 2 seconds | 60 |
| `/motor/left` | Turn left | 1 second | 60 |
| `/motor/right` | Turn right | 1 second | 60 |
| `/motor/stop` | Stop all motors | Immediate | - |

**Note**: Motor commands automatically stop after their preset duration via internal timer.

### Sensor Endpoints

| Endpoint | Function | Response Type |
|----------|----------|---------------|
| `/sensor/ht` | Get temperature and humidity | JSON |

**Example Response**:
```json
{
  "temperature": 25.5,
  "humidity": 60.2
}
```

## Tumbller ESP-CAM (Camera Module)

**Repository**: https://github.com/YakRoboticsGarage/tumbller-esp-cam

**Port**: 80 (HTTP)

### Camera Endpoints

All camera endpoints use **GET** requests.

| Endpoint | Function | Response Type |
|----------|----------|---------------|
| `/` | Redirect to `/stream` | 302 Redirect |
| `/stream` | Main web interface with live stream | HTML |
| `/getImage` | Get single JPEG frame | image/jpeg |
| `/setResolution?size=<value>` | Change camera resolution | HTML |
| `/rotate?degrees=<value>` | Rotate camera image | HTML |

### Resolution Options

Valid values for `/setResolution?size=<value>`:
- `SVGA` - 800x600
- `XGA` - 1024x768
- `HD` - 1280x720
- `SXGA` - 1280x1024
- `UXGA` - 1600x1200

### Rotation Options

Valid values for `/rotate?degrees=<value>`:
- `0` - No rotation
- `90` - Rotate 90° clockwise
- `180` - Rotate 180°
- `270` - Rotate 270° clockwise (90° counter-clockwise)

### Stream Implementation

The `/stream` endpoint serves an HTML page that implements streaming via JavaScript:
- Polls `/getImage` every 1 second
- Automatic retry logic (max 3 attempts on failure)
- Client-side image display

**Important**: The `/stream` endpoint does NOT serve a raw MJPEG stream. To display the camera feed in a React app, you must poll the `/getImage` endpoint yourself.

## iMata ESP32-CAM (Photo Capture System)

**Repository**: https://github.com/andypmw/imata/tree/main/imata-device-esp32cam

**Port**: Not specified

**Purpose**: Photo capture and storage system (NOT real-time streaming)

### Endpoints

| Endpoint | Method | Function |
|----------|--------|----------|
| `/sessions` | GET | List captured photo sessions |
| `/session?folder=<name>` | GET | List photos in a session |
| `/photo-download?name=<name>` | GET | Download JPEG file |
| `/capture-status` | GET | Check if actively capturing |
| `/start-stop-capture` | POST | Toggle photo capture on/off |

**Key Differences**:
- Focuses on photo capture, not streaming
- Saves images to MicroSD card
- Designed for React Native app integration
- REST API for session/photo management

## React App Implementation

### Camera Stream

The React app implements camera streaming by:

1. Polling `/getImage` endpoint every 1 second
2. Adding timestamp parameter to prevent caching: `/getImage?t={timestamp}`
3. Preloading images using JavaScript `Image` object before display
4. Retry logic with max 3 attempts
5. Automatic cleanup on component unmount

### Motor Commands

Motor commands are sent as simple GET requests:
- No request body required
- Response is ignored (no-cors mode)
- Commands auto-stop after preset duration on ESP32 side

### Error Handling

- Network timeouts: 5 seconds for motor commands, 3 seconds for camera checks
- CORS mode: `no-cors` to support ESP32 devices without CORS headers
- Retry logic: 3 attempts for camera stream before showing error
- User feedback: Toast notifications for motor command failures

## Network Configuration

### Same Network Requirement

All devices must be on the same local network:
- React app (running on development machine)
- ESP32S3 motor controller
- ESP-CAM camera module

### IP Address Format

IP addresses can include optional port numbers:
- `192.168.1.100` - Default port 80
- `192.168.1.101:81` - Custom port 81

### Firewall Considerations

Ensure local firewall allows:
- Outbound HTTP requests from browser
- Connections to ESP32 devices on local network
