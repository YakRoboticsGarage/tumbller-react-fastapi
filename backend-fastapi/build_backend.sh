#!/bin/bash
# Build the YakRover backend Docker image

set -e

echo "Building YakRover backend Docker image..."
docker compose build
echo "Backend build complete."
