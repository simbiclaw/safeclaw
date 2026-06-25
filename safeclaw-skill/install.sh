#!/bin/bash

# SafeClaw Skill Installation Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default Claude Code paths
DEFAULT_SKILLS_DIR="$HOME/.claude/skills"
DEFAULT_TOOLS_DIR="$HOME/.claude/tools"

# Allow override via environment variables
SKILLS_DIR="${CLAUDE_SKILLS_DIR:-$DEFAULT_SKILLS_DIR}"
TOOLS_DIR="${CLAUDE_TOOLS_DIR:-$DEFAULT_TOOLS_DIR}"

echo "Installing SafeClaw skill..."
echo "Skills directory: $SKILLS_DIR"
echo "Tools directory: $TOOLS_DIR"

# Create directories if they don't exist
mkdir -p "$SKILLS_DIR"
mkdir -p "$TOOLS_DIR"

# Copy skill files
echo "Copying skill files..."
rm -rf "$SKILLS_DIR/safeclaw-skill"
cp -r "$SCRIPT_DIR" "$SKILLS_DIR/safeclaw-skill"
rm -f "$SKILLS_DIR/safeclaw-skill/install.sh"

# Copy tool script
echo "Copying tool script..."
cp "$SCRIPT_DIR/safeclaw.js" "$TOOLS_DIR/safeclaw.js"

# Make executable
chmod +x "$TOOLS_DIR/safeclaw.js"

# Create symlink for easy access
if [ -d "$HOME/.local/bin" ]; then
    ln -sf "$TOOLS_DIR/safeclaw.js" "$HOME/.local/bin/safeclaw"
    echo "Created symlink: $HOME/.local/bin/safeclaw"
elif [ -d "/usr/local/bin" ] && [ -w "/usr/local/bin" ]; then
    ln -sf "$TOOLS_DIR/safeclaw.js" "/usr/local/bin/safeclaw"
    echo "Created symlink: /usr/local/bin/safeclaw"
else
    echo "Warning: Could not create system symlink. Add $TOOLS_DIR to your PATH."
fi

echo ""
echo "Installation complete!"
echo ""
echo "Usage examples:"
echo "  safeclaw create myproject"
echo "  DOCKER_HOST=tcp://n68:2375 PROXY_HOST=192.168.3.109 PROXY_PORT=7890 safeclaw create research"
echo ""
echo "Make sure Docker is installed and running before using the skill."
