#!/bin/bash

# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Stop all containers and remove them along with volumes
docker-compose -f "$DIR/docker-compose.yml" down --volumes

# Remove any dangling images
docker image prune -f

# Optional: Remove all unused volumes
docker volume prune -f

echo "Environment has been shut down and cleaned up successfully."
exit 0 