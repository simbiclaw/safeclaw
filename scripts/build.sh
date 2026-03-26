#!/bin/bash
# Build the safeclaw image and remove stale container

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="safeclaw"

# === 代理配置 ===
PROXY_HOST="127.0.0.1"
PROXY_PORT="7890"
HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
SOCKS_PROXY="socks5://${PROXY_HOST}:${PROXY_PORT}"

# 检测操作系统，macOS 不支持 --network=host，需用 host.docker.internal
if [[ "$(uname)" == "Darwin" ]]; then
    PROXY_HOST="host.docker.internal"
    HTTP_PROXY="http://${PROXY_HOST}:${PROXY_PORT}"
    SOCKS_PROXY="socks5://${PROXY_HOST}:${PROXY_PORT}"
    NETWORK_FLAG=""
else
    NETWORK_FLAG="--network=host"
fi

echo "Building image (proxy: ${HTTP_PROXY})..."
docker build \
    --build-arg http_proxy="${HTTP_PROXY}" \
    --build-arg https_proxy="${HTTP_PROXY}" \
    --build-arg all_proxy="${SOCKS_PROXY}" \
    --build-arg TZ=Asia/Shanghai \
    ${NETWORK_FLAG} \
    -t safeclaw "$PROJECT_DIR" || exit 1

# Remove old container so run.sh creates a fresh one from the new image
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Removing old container..."
    docker rm -f "$CONTAINER_NAME" > /dev/null
fi
