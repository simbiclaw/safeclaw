# SafeClaw Skill

A complete Claude Code skill for managing SafeClaw containers - sandboxed Docker environments running Claude Code with web terminal access.

## Installation

1. Copy the skill files to your Claude Code skills directory:
```bash
cp -r setup/skills/safeclaw /path/to/claude/code/skills/
cp setup/tools/safeclaw.js /path/to/claude/code/tools/
```

2. Make the tool executable:
```bash
chmod +x /path/to/claude/code/tools/safeclaw.js
```

3. Ensure Docker is installed and running on your system.

## Usage

The safeclaw skill provides a complete command-line interface for managing SafeClaw sessions:

### Session Management

```bash
# Create a new session
safeclaw create myproject

# Create with volume mount
safeclaw create myproject -v /path/to/project:/home/sclaw/myproject

# Start an existing session
safeclaw start myproject

# Stop a running session
safeclaw stop myproject

# Delete a session
safeclaw delete myproject

# List all sessions
safeclaw list

# Check session status
safeclaw status myproject
```

### Command Execution

```bash
# Execute a command in the container
safeclaw exec myproject "ls -la"

# Send a query to Claude Code
safeclaw query myproject "What is the capital of France?"
```

## Features

- **Session Lifecycle Management**: Create, start, stop, and delete SafeClaw sessions
- **Volume Mounting**: Mount local directories into containers for project access
- **Command Execution**: Run shell commands inside containers
- **Query Interface**: Send queries directly to Claude Code
- **Status Monitoring**: Check container status and access URLs
- **Error Handling**: Automatic retry mechanisms and clear error messages
- **Persistent Storage**: Session data persists in `~/.config/safeclaw/sessions/`

## Configuration

- `SAFECLAW_PATH`: Environment variable to specify SafeClaw project location (default: `~/workspace/best-practice/2026/safeclaw`)
- Sessions are stored in `~/.config/safeclaw/sessions/<session-name>/`

## Examples

```bash
# Create a session for a specific project
safeclaw create webapp -v ~/projects/webapp:/home/sclaw/webapp

# Start coding session
safeclaw start webapp

# Ask Claude Code to analyze code
safeclaw query webapp "Analyze the authentication system in this project"

# Run tests
safeclaw exec webapp "npm test"

# List all active sessions
safeclaw list

# Clean up when done
safeclaw stop webapp
safeclaw delete webapp
```

## Architecture

The skill consists of:
- `SKILL.md`: Skill documentation and usage examples
- `safeclaw.js`: Main implementation with Docker API integration
- Session management with persistent storage
- Tmux integration for command execution and output capture

## Troubleshooting

If a session fails to start:
1. Check Docker is running: `docker ps`
2. Verify SafeClaw path exists
3. Check container logs: `docker logs safeclaw-<name>`
4. Ensure port 7681 is available

For command execution issues:
1. Verify session is running: `safeclaw status <name>`
2. Check tmux session: `docker exec safeclaw-<name> tmux ls`
3. Try restarting the session