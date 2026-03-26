#!/bin/bash
# Set up Slack integration for SafeClaw
# Uses a single User Token (xoxp-) for both reading and sending messages.

SECRETS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/safeclaw/.secrets"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$SCRIPT_DIR/../setup/slack-manifest.json"

echo ""
echo "=== Slack Setup ==="
echo ""
echo "This sets up a single User Token (xoxp-) for reading AND sending messages."
echo "No bot needed — messages are sent as your Slack account."
echo ""
echo "Setup method:"
echo "  [Q] Quick   - create app from manifest (recommended)"
echo "  [M] Manual  - create app from scratch (more control)"
echo ""
read -p "Choose [Q/m]: " setup_method
echo ""

if [[ "$setup_method" =~ ^[Mm]$ ]]; then
    echo "1. Go to https://api.slack.com/apps"
    echo "2. Click 'Create New App' > 'From scratch'"
    echo "3. Name it (e.g., 'Echoes') and select your workspace"
    echo "4. Go to 'OAuth & Permissions'"
    echo ""
    echo "Add these to 'User Token Scopes':"
    echo "   - channels:read, channels:history (public channels)"
    echo "   - groups:read, groups:history (private channels)"
    echo "   - users:read (user profiles)"
    echo "   - search:read (search messages)"
    echo "   - chat:write (send messages / notifications)"
    echo "   - files:write (upload files, optional)"
    echo "   - (optional) im:read, im:history (DMs)"
    echo "   - (optional) mpim:read, mpim:history (group DMs)"
    echo ""
    echo "5. Left sidebar > 'Install App' > 'Install to Workspace'"
    echo "6. Copy the User OAuth Token (starts with xoxp-)"
else
    echo "1. Go to https://api.slack.com/apps?new_app=1"
    echo "2. Choose 'From a manifest'"
    echo "3. Select your workspace"
    echo "4. Switch to JSON tab and paste this manifest:"
    echo ""
    cat "$MANIFEST"
    echo ""
    echo "5. Click 'Create'"
    echo "6. Go to 'Install App' > 'Install to Workspace'"
    echo "7. Copy the User OAuth Token (starts with xoxp-)"
fi

echo ""
read -p "Paste token (xoxp-...): " slack_token

if [ -z "$slack_token" ]; then
    echo "No token provided, skipping Slack setup."
    exit 0
fi

# Validate token prefix
if [[ ! "$slack_token" =~ ^xoxp- ]]; then
    echo ""
    echo "Warning: Token doesn't start with 'xoxp-'."
    echo "Make sure you copied the User OAuth Token, not the Bot Token."
    read -p "Continue anyway? [y/N]: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

mkdir -p "$SECRETS_DIR"
echo "$slack_token" > "$SECRETS_DIR/SLACK_TOKEN"
chmod 600 "$SECRETS_DIR/SLACK_TOKEN"
echo ""
echo "Saved to $SECRETS_DIR/SLACK_TOKEN"

# === Notification Channel ===
echo ""
echo "=== Notification Channel (optional) ==="
echo ""
echo "To receive task completion notifications on your phone,"
echo "set a default Slack channel for notifications."
echo ""
echo "How to get the Channel ID:"
echo "  1. Open the channel in Slack (e.g., #ai质检)"
echo "  2. Click the channel name at the top"
echo "  3. Channel ID is at the bottom of the popup (e.g., C07XXXXXXXX)"
echo ""
read -p "Notification Channel ID (Enter to skip): " channel_id

if [ -n "$channel_id" ]; then
    echo -n "$channel_id" > "$SECRETS_DIR/SLACK_CHANNEL_ID"
    chmod 600 "$SECRETS_DIR/SLACK_CHANNEL_ID"
    echo "Saved to $SECRETS_DIR/SLACK_CHANNEL_ID"
fi

echo ""
echo "Done. Restart SafeClaw to apply:"
echo "  ./scripts/run.sh"
