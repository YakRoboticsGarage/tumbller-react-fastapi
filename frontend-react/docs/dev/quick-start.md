# Quick Start Guide

Get up and running with Tumbller Robot Control in 5 minutes.

## Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- Your Tumbller robot powered on and connected to WiFi
- Robot IP addresses (ESP32S3 motor controller + ESP-CAM)

## Installation

```bash
# Clone repository
cd tumbller-react-webapp

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
```

## Configuration

Edit `.env` with your robot's IP addresses:

```env
VITE_DEFAULT_ROBOT_NAME=Tumbller-1
VITE_DEFAULT_MOTOR_IP=192.168.1.100
VITE_DEFAULT_CAMERA_IP=192.168.1.101
```

**Finding IP Addresses:**
- Check your router's DHCP client list
- Use ESP32 serial monitor output on boot
- Use network scanning tools like `nmap` or `arp-scan`

## Start Development Server

```bash
pnpm dev
```

Application opens at `http://localhost:5173`

## First Use

1. **Default Robot Loads** - If `.env` is configured, default robot appears in dropdown
2. **Select Robot** - Choose from dropdown
3. **Connect** - Click "Connect to Robot" button
4. **Control** - Once online, camera stream and motor controls appear

## Adding More Robots

Click "Add Robot" button and enter:
- Robot name (e.g., "Tumbller-2")
- Motor controller IP (e.g., `192.168.1.100`)
- Camera IP (e.g., `192.168.1.101`)

IPs can include ports: `192.168.1.100:80`

## Troubleshooting

**Can't connect?**
- Verify robot is powered on
- Check ESP32S3 is on same network
- Ping motor IP: `ping 192.168.1.100`
- Check browser console for errors

**Camera not showing?**
- Try "Full Interface" mode instead of "Stream Only"
- Verify camera IP in browser: `http://192.168.1.101/stream`
- ESP-CAM may take 10-20 seconds to initialize after power-on

**See [debugging.md](debugging.md) for more troubleshooting**

## Next Steps

- Read [architecture.md](architecture.md) to understand how it works
- Check [common-tasks.md](common-tasks.md) for feature additions
- Review [problems-solved.md](problems-solved.md) to learn from past issues
