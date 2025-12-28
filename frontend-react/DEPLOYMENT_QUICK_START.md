# Quick Deployment Guide

Fast setup for serving the Tumbller Robot Control app with Caddy.

## 30-Second Setup (Local Network)

```bash
# 1. Build the app
pnpm build

# 2. Install Caddy (if not installed)
# Linux/Debian:
sudo apt install caddy
# macOS:
brew install caddy

# 3. Find your local IP
hostname -I | awk '{print $1}'  # Linux
# Or
ipconfig getifaddr en0          # macOS
# Example output: 192.168.1.50

# 4. Start Caddy
caddy run
```

## Access the App

From any device on your network:
- Open browser
- Go to: `http://YOUR_IP:8080`
- Example: `http://192.168.1.50:8080`

Multiple people can now access and control robots!

## Configuration

The included `Caddyfile` is pre-configured for port 8080.

**To customize**:
1. Edit `Caddyfile`
2. Change IP/port if needed
3. Reload: `caddy reload`

## With Authentication

If using Logto auth (`VITE_ENABLE_AUTH=true`):

1. Rebuild after setting auth vars in `.env`:
   ```bash
   pnpm build
   ```

2. Add callback URL in Logto dashboard:
   ```
   http://YOUR_IP:8080/callback
   ```

3. Restart Caddy:
   ```bash
   caddy stop
   caddy run
   ```

## Troubleshooting

### Can't access from other devices?

**Check firewall**:
```bash
# Allow port 8080
sudo ufw allow 8080/tcp
```

### Port 8080 already in use?

**Change port in Caddyfile**:
```
:3000 {
    # ... config
}
```

## Full Documentation

See [`docs/Caddy_Deployment_Guide.md`](docs/Caddy_Deployment_Guide.md) for:
- Public internet deployment with HTTPS
- Systemd service setup
- Security configuration
- Performance tuning
- Complete troubleshooting guide

---

**That's it!** Your robot control interface is now accessible to multiple users. 🚀
