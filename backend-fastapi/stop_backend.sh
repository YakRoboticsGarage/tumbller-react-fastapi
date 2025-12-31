#!/bin/bash
# Stop the YakRover backend
#
# Usage:
#   ./stop.sh           # Stop and remove containers only
#   ./stop.sh --clean   # Also remove images, volumes, and orphans

echo "Stopping YakRover backend..."

if [[ "$1" == "--clean" ]]; then
    echo "Removing containers, images, and volumes..."
    docker compose down --rmi local --volumes --remove-orphans
    echo "Backend fully cleaned up (containers, images, volumes removed)."
else
    docker compose down
    echo "Backend stopped (containers removed, images and volumes kept)."
fi
