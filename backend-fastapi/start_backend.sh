#!/bin/bash
# Start the YakRover backend in detached mode

set -e

# Create the shared network if it doesn't exist
docker network create yakrover_network 2>/dev/null || true

echo "Starting YakRover backend..."
docker compose up -d

echo "Backend started."
echo "API available at http://localhost:8000"
echo "Use 'docker compose logs -f' to see live logs."
