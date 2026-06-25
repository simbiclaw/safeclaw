#!/bin/bash
# Build the safeclaw image and remove stale container

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="safeclaw"

# macOS doesn't support --network=host
if [[ "$(uname)" == "Darwin" ]]; then
    NETWORK_FLAG=""
else
    NETWORK_FLAG="--network=host"
fi

# Platform override for cross-architecture builds (e.g. linux/amd64 on Apple Silicon)
PLATFORM_FLAG="${DOCKER_PLATFORM:+--platform ${DOCKER_PLATFORM}}"

echo "Building image${DOCKER_PLATFORM:+ (platform: ${DOCKER_PLATFORM})}..."
docker build \
    ${PLATFORM_FLAG} \
    ${NETWORK_FLAG} \
    -t "${IMAGE_TAG:-safeclaw:cc-2.1.80}" "$PROJECT_DIR" || exit 1

# Remove old container so run.sh creates a fresh one from the new image
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing old container..."
    docker rm -f "$CONTAINER_NAME" > /dev/null
fi
