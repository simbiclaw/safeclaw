#!/bin/bash
# Create a new session (called from dashboard UI)
# Checks for required tokens before calling run.sh

SECRETS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/safeclaw/.secrets"

# Check for required API key
if [ ! -f "$SECRETS_DIR/ANTHROPIC_API_KEY" ]; then
    echo "ERROR: No LiteLLM virtual key found." >&2
    echo "Run ./scripts/run.sh first to set up authentication." >&2
    exit 1
fi

# Pass all arguments to run.sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/run.sh" "$@"
