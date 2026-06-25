#!/bin/bash
# Build the safeclaw image and remove stale container

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="safeclaw"

# === 代理配置 (override via PROXY_HOST / PROXY_PORT env vars) ===
PROXY_HOST="${PROXY_HOST:-127.0.0.1}"
PROXY_PORT="${PROXY_PORT:-7897}"
HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
SOCKS_PROXY="socks5://${PROXY_HOST}:${PROXY_PORT}"

# 检测操作系统，macOS 不支持 --network=host，需用 host.docker.internal
# Only auto-override PROXY_HOST on macOS when not explicitly set
if [[ "$(uname)" == "Darwin" ]]; then
    PROXY_HOST="${PROXY_HOST_OVERRIDE:-host.docker.internal}"
    HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
    SOCKS_PROXY="socks5://${PROXY_HOST}:${PROXY_PORT}"
    NETWORK_FLAG=""
else
    NETWORK_FLAG="--network=host"
fi

# Platform override for cross-architecture builds (e.g. linux/amd64 on Apple Silicon)
PLATFORM_FLAG="${DOCKER_PLATFORM:+--platform ${DOCKER_PLATFORM}}"

echo "Building image (proxy: ${HTTP_PROXY})${DOCKER_PLATFORM:+ (platform: ${DOCKER_PLATFORM})}..."
docker build \
    ${PLATFORM_FLAG} \
    --build-arg TZ=Asia/Shanghai \
    ${NETWORK_FLAG} \
    -t "${IMAGE_TAG:-safeclaw:cc-2.1.80}" "$PROJECT_DIR" || exit 1

# Remove old container so run.sh creates a fresh one from the new image
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing old container..."
    docker rm -f "$CONTAINER_NAME" > /dev/null
fi
