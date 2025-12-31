#!/bin/bash
# Stop the YakRover frontend
#
# Usage:
#   ./stop.sh           # Stop and remove containers only (keeps TLS certs)
#   ./stop.sh --clean   # Also remove images, volumes (including TLS certs), and orphans

echo "Stopping YakRover frontend..."

if [[ "$1" == "--clean" ]]; then
    echo "Removing containers, images, and volumes..."
    docker compose down --rmi local --volumes --remove-orphans
    echo "Frontend fully cleaned up (containers, images, volumes removed)."
    echo "Note: TLS certificates were removed. Caddy will obtain new ones on next start."
else
    docker compose down
    echo "Frontend stopped (containers removed, images and TLS certificates kept)."
fi
