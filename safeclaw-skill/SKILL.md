# SafeClaw Skill

## Description
Complete container lifecycle management for SafeClaw - sandboxed Docker containers running Claude Code with web terminal access.

## Usage

### Session Management
```bash
# Create a new session
safeclaw create <name> [-v <volume>]

# Start an existing session
safeclaw start <name>

# Stop a running session
safeclaw stop <name>

# Delete a session
safeclaw delete <name>

# List all sessions
safeclaw list

# Check session status
safeclaw status <name>
```

### Command Execution
```bash
# Execute a command in the container
safeclaw exec <name> "<command>"

# Send a query to Claude Code
safeclaw query <name> "<query>"
```

### Examples
```bash
# Create a new session
safeclaw create myproject

# Create with volume mount
safeclaw create myproject -v /path/to/project:/home/sclaw/myproject

# Send a query to Claude Code
safeclaw query myproject "What is the capital of France?"

# Execute a shell command
safeclaw exec myproject "ls -la"

# List all sessions
safeclaw list

# Check if session is running
safeclaw status myproject
```

## Features
- Automatic container lifecycle management
- Persistent session data in `~/.config/safeclaw/sessions/`
- Volume mounting support for project access
- Command execution with output capture
- Direct Claude Code query interface
- Error handling and retry mechanisms

## Requirements
- Docker installed and running
- SafeClaw project cloned at `~/workspace/best-practice/2026/safeclaw` or set via `SAFECLAW_PATH`

## Remote Docker Host

Target a remote Docker daemon by setting `DOCKER_HOST`:

```bash
DOCKER_HOST="tcp://n68:2375" safeclaw list
DOCKER_HOST="tcp://n68:2375" safeclaw create research
```

The CLI automatically uses the remote hostname in access URLs instead of `localhost`.

## Proxy Configuration

Control the build proxy via environment variables (defaults: `127.0.0.1:7897`):

```bash
# Create a session on remote host with custom proxy
DOCKER_HOST="tcp://n68:2375" PROXY_HOST=192.168.3.109 PROXY_PORT=7890 safeclaw create research
```