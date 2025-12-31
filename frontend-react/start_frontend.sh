#!/bin/bash
# Start the YakRover frontend in detached mode
#
# Environment variables (optional):
#   DOMAIN       - Your domain (default: yakrover.com)
#   BACKEND_URL  - Backend API URL (default: http://yakrover_backend:8000)
#   ADMIN_EMAIL  - Email for TLS certificates

set -e

# Create the shared network if it doesn't exist
docker network create yakrover_network 2>/dev/null || true

echo "Starting YakRover frontend..."
docker compose up -d

echo "Frontend started."
echo "Your application should be available at https://${DOMAIN:-yakrover.com}"
echo "Use 'docker compose logs -f' to see live logs."
