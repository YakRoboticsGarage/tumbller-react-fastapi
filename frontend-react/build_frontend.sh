#!/bin/bash
# Build the YakRover frontend Docker image
#
# Environment variables (optional):
#   VITE_API_URL       - Backend API URL (default: http://localhost:8000)
#   VITE_PRIVY_APP_ID  - Privy App ID for wallet auth
#   VITE_X402_NETWORK  - Network for payments (default: base-sepolia)

set -e

echo "Building YakRover frontend Docker image..."
docker compose build
echo "Frontend build complete."
