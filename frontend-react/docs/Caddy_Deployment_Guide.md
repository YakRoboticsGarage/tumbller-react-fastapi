# Caddy Deployment Guide

How to serve the Tumbller Robot Control web app with Caddy so multiple people can access it from different browsers.

## Overview

Caddy is a modern web server with automatic HTTPS. We'll use it to:
- Serve the production build of your React app
- Enable multi-user access on your local network
- Optionally expose it to the internet with HTTPS

---

## Prerequisites

1. **Build the app** (already done):
   ```bash
   pnpm build
   # Creates dist/ folder with production files
   ```

2. **Install Caddy**:

   **Linux/macOS:**
   ```bash
   # Debian/Ubuntu
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy

   # Or use the official install script
   curl -fsSL https://getcaddy.com | bash
   ```

   **macOS (Homebrew):**
   ```bash
   brew install caddy
   ```

---

## Deployment Options

### Option 1: Local Network Only (Recommended for Most Users)

**Use case**: Multiple people on the same WiFi/LAN accessing the robot control interface.

1. **Find your machine's local IP address**:
   ```bash
   # Linux
   hostname -I | awk '{print $1}'

   # macOS
   ipconfig getifaddr en0

   # Should output something like: 192.168.1.50
   ```

2. **Edit Caddyfile**:
   The default Caddyfile in the project root is already configured for `:8080` (all interfaces).

   To bind to a specific IP, edit `Caddyfile`:
   ```
   http://192.168.1.50:8080 {
       root * /home/anurajen/source/ghub/tumbller-react-webapp/dist
       encode gzip
       try_files {path} /index.html
       file_server
   }
   ```
   Replace `192.168.1.50` with your actual IP and update the path if needed.

3. **Start Caddy**:
   ```bash
   cd /home/anurajen/source/ghub/tumbller-react-webapp
   caddy run
   ```

   Or run in background:
   ```bash
   caddy start
   ```

4. **Access from other devices**:
   - From any device on the same network, open a browser
   - Go to: `http://192.168.1.50:8080` (replace with your IP)
   - Multiple people can now access the robot control interface

5. **Configure Logto callback** (if using authentication):
   Update your `.env` and Logto dashboard:
   ```env
   VITE_LOGTO_ENDPOINT=https://your-tenant.logto.app
   VITE_LOGTO_APP_ID=your_app_id
   ```

   In Logto dashboard, add redirect URI:
   ```
   http://192.168.1.50:8080/callback
   ```

---

### Option 2: Public Internet with Domain (HTTPS)

**Use case**: Access robots from anywhere on the internet with automatic SSL certificates.

**Requirements**:
- A domain name (e.g., `robots.example.com`)
- Domain DNS points to your public IP
- Port 80 and 443 open on your router/firewall

1. **Edit Caddyfile**:
   ```
   robots.example.com {
       root * /home/anurajen/source/ghub/tumbller-react-webapp/dist
       encode gzip
       try_files {path} /index.html
       file_server
   }
   ```

2. **Start Caddy**:
   ```bash
   cd /home/anurajen/source/ghub/tumbller-react-webapp
   sudo caddy run
   ```

   Caddy will automatically:
   - Obtain Let's Encrypt SSL certificate
   - Redirect HTTP → HTTPS
   - Auto-renew certificates

3. **Configure Logto callback**:
   Update Logto dashboard redirect URI:
   ```
   https://robots.example.com/callback
   ```

4. **Access from anywhere**:
   ```
   https://robots.example.com
   ```

---

## Caddyfile Explained

```caddyfile
:8080 {                                              # Listen on port 8080 (all interfaces)
    root * /path/to/dist                             # Serve files from dist/ folder
    encode gzip                                       # Compress responses
    try_files {path} /index.html                     # SPA routing - all routes → index.html
    file_server                                       # Enable static file serving
}
```

**Key directives**:
- `root`: Directory containing built files
- `encode gzip`: Compresses responses (faster loading)
- `try_files {path} /index.html`: Makes React Router work (SPA fallback)
- `file_server`: Serves static files

---

## Managing Caddy

### Start Caddy (foreground)
```bash
cd /home/anurajen/source/ghub/tumbller-react-webapp
caddy run
```

### Start Caddy (background)
```bash
caddy start
```

### Stop Caddy
```bash
caddy stop
```

### Reload configuration
```bash
caddy reload
```

### Check status
```bash
caddy list-modules
```

### Run as systemd service (Linux)

1. Create service file `/etc/systemd/system/tumbller-caddy.service`:
   ```ini
   [Unit]
   Description=Caddy web server for Tumbller Robot Control
   After=network.target

   [Service]
   Type=notify
   User=anurajen
   Group=anurajen
   WorkingDirectory=/home/anurajen/source/ghub/tumbller-react-webapp
   ExecStart=/usr/bin/caddy run --config /home/anurajen/source/ghub/tumbller-react-webapp/Caddyfile
   ExecReload=/usr/bin/caddy reload --config /home/anurajen/source/ghub/tumbller-react-webapp/Caddyfile
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

2. Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable tumbller-caddy
   sudo systemctl start tumbller-caddy
   ```

3. Check status:
   ```bash
   sudo systemctl status tumbller-caddy
   ```

---

## Troubleshooting

### Port already in use
```bash
# Find what's using port 8080
sudo lsof -i :8080
# Or
sudo netstat -tulpn | grep 8080

# Kill the process or change port in Caddyfile
```

### Permission denied (port 80/443)
```bash
# Ports < 1024 require sudo
sudo caddy run

# Or use port 8080 instead (no sudo needed)
```

### Can't access from other devices
1. Check firewall:
   ```bash
   # Linux (UFW)
   sudo ufw allow 8080/tcp

   # Linux (firewalld)
   sudo firewall-cmd --add-port=8080/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. Verify Caddy is listening:
   ```bash
   sudo netstat -tulpn | grep caddy
   ```

3. Test from same machine:
   ```bash
   curl http://localhost:8080
   ```

### Robot commands not working
Remember: The React app running on your server needs to communicate with ESP32 devices that might be on different IPs. Make sure:
- ESP32 devices are on the same network
- Browser can reach ESP32 IPs (no CORS issues)
- Update robot IP addresses in the web UI for each user's setup

---

## Security Considerations

### For Local Network Deployment

1. **Firewall**: Only allow access from local network
   ```bash
   # Linux UFW - allow from local network only
   sudo ufw allow from 192.168.1.0/24 to any port 8080
   ```

2. **Authentication**: Enable Logto authentication
   ```env
   VITE_ENABLE_AUTH=true
   ```

3. **Network Isolation**: Keep robot control network separate from guest WiFi

### For Public Internet Deployment

1. **ALWAYS use HTTPS** (Caddy does this automatically with a domain)

2. **ALWAYS enable authentication**:
   ```env
   VITE_ENABLE_AUTH=true
   ```

3. **Consider rate limiting** in Caddyfile:
   ```caddyfile
   robots.example.com {
       rate_limit {
           zone dynamic {
               key {remote_host}
               events 100
               window 1m
           }
       }
       # ... rest of config
   }
   ```

4. **Monitor access logs**:
   ```bash
   caddy run --watch
   ```

---

## Updating the App

When you make changes to the React app:

1. **Rebuild**:
   ```bash
   pnpm build
   ```

2. **Reload Caddy** (if running as service):
   ```bash
   sudo systemctl reload tumbller-caddy
   ```

   Or (if running manually):
   ```bash
   caddy reload
   ```

3. **Clear browser cache** on client devices:
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Firefox: `Ctrl+F5` or `Cmd+Shift+R`

---

## Performance Tips

1. **Enable HTTP/2** (automatic with HTTPS)

2. **Add caching headers** in Caddyfile:
   ```caddyfile
   :8080 {
       root * /path/to/dist
       encode gzip

       @static {
           path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg *.woff *.woff2
       }
       header @static Cache-Control "public, max-age=31536000, immutable"

       try_files {path} /index.html
       file_server
   }
   ```

3. **Use Brotli compression** (better than gzip):
   ```caddyfile
   encode zstd gzip
   ```

---

## Example Network Setup

```
Internet
    ↓
WiFi Router (192.168.1.1)
    ├── Your Server (192.168.1.50:8080) ← Caddy serves React app
    ├── ESP32 Motor (192.168.1.100)
    ├── ESP-CAM (192.168.1.101)
    ├── User's Phone (192.168.1.105) → http://192.168.1.50:8080
    ├── User's Laptop (192.168.1.106) → http://192.168.1.50:8080
    └── User's Tablet (192.168.1.107) → http://192.168.1.50:8080
```

All devices access the same React app hosted on your server, and can control the robots if they have permission (authentication).

---

## Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Caddyfile Syntax](https://caddyserver.com/docs/caddyfile)
- [Caddy API](https://caddyserver.com/docs/api)
- [Let's Encrypt](https://letsencrypt.org/)

---

## Quick Start Checklist

- [ ] Build the React app: `pnpm build`
- [ ] Install Caddy
- [ ] Find your local IP address
- [ ] Edit Caddyfile with correct IP and path
- [ ] Start Caddy: `caddy run`
- [ ] Test from your browser: `http://YOUR_IP:8080`
- [ ] Test from another device on the network
- [ ] Configure Logto callback URL (if using auth)
- [ ] Set up firewall rules (if needed)
- [ ] Optional: Set up systemd service for auto-start

---

**You're ready to serve your robot control app to multiple users!** 🎉
