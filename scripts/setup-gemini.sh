#!/bin/bash
# Set up Gemini CLI API key for SafeClaw

SECRETS_DIR="$HOME/.config/safeclaw/.secrets"
TOKEN_FILE="$SECRETS_DIR/GEMINI_API_KEY"
DEFAULT_PROXY="http://host.docker.internal:7890"
DEFAULT_MODEL="gemini-2.5-pro"

mkdir -p "$SECRETS_DIR"

echo "Gemini CLI Setup"
echo "================"
# ------API Key-----
echo ""
echo "Get your API key from: https://aistudio.google.com/apikey"
echo ""
read -p "Paste your Gemini API key: " api_key

if [ -z "$api_key" ]; then
    echo "No key provided. Aborting."
    exit 1
fi

echo -n "$api_key" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

echo ""
echo "Saved to $TOKEN_FILE"

# === Proxy ===
echo ""
echo "Proxy for Gemini CLI (to access Google services)."
echo ""
read -p "Proxy address (default: $DEFAULT_PROXY): " proxy_addr

proxy_addr="${proxy_addr:-$DEFAULT_PROXY}"

echo -n "$proxy_addr" > "$SECRETS_DIR/GEMINI_PROXY"
chmod 600 "$SECRETS_DIR/GEMINI_PROXY"
echo "Saved.$proxy_addr"

# === Default Model ===
echo ""
echo "Default model for Gemini CLI."
echo "Examples: gemini-2.5-pro, gemini-2.5-flash, gemini-3.1-pro-preview"
echo ""
read -p "Model (default: $DEFAULT_MODEL): " model_name

model_name="${model_name:-$DEFAULT_MODEL}"
echo -n "$model_name" > "$SECRETS_DIR/GEMINI_MODEL"
chmod 600 "$SECRETS_DIR/GEMINI_MODEL"
echo "Saved: $model_name"

echo ""
echo "Done. Restart the container to apply:"
echo "  ./scripts/run.sh -s <session>"

echo "Stop and start the container from the dashboard to apply."
