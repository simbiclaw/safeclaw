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

Target a remote Docker daemon by setting `DOCKER_HOST`. The CLI automatically uses the remote hostname in access URLs instead of `localhost`.

### Direct TCP (preferred)

If the remote Docker daemon is exposed via TCP and has the SafeClaw image loaded:

```bash
DOCKER_HOST="tcp://n68:2375" safeclaw list
DOCKER_HOST="tcp://n68:2375" safeclaw create research --image safeclaw-linux:cc-2.1.80 --no-build
```

### SSH tunnel (private daemon)

If the remote has a private Docker daemon (e.g. non-standard socket), tunnel it over SSH:

```bash
# Tunnel the remote Docker socket to local port 2376
ssh -fNL 2376:/home/user/.docker-private/docker.sock n68

# Then use localhost:2376 as the Docker host
DOCKER_HOST="tcp://localhost:2376" safeclaw list
```

For web terminal access, add a second tunnel:

```bash
ssh -fNL 17681:127.0.0.1:7681 n68   # ttyd (one per session if on different ports)
```

### Image tags per architecture

When building for different CPU architectures, use distinct image tags:

| Host | Arch | Image tag |
|------|------|-----------|
| Local Mac | ARM64 | `safeclaw:cc-2.1.80` |
| n68 (Linux) | x86_64 | `safeclaw-linux:cc-2.1.80` |
| ultra3 (Mac) | ARM64 | `safeclaw:cc-2.1.80` |

Build for Linux x86_64 from a Mac:

```bash
DOCKER_PLATFORM=linux/amd64 IMAGE_TAG=safeclaw-linux:cc-2.1.80 ./scripts/build.sh
```

Transfer to the remote host:

```bash
docker save safeclaw-linux:cc-2.1.80 | gzip > /tmp/safeclaw-linux.tar.gz
scp /tmp/safeclaw-linux.tar.gz n68:/tmp/
ssh n68 "gunzip -c /tmp/safeclaw-linux.tar.gz | docker load"
```

## Proxy Configuration

Control the build proxy via environment variables (defaults: `127.0.0.1:7897`):

```bash
# Create a session on remote host with custom proxy
DOCKER_HOST="tcp://n68:2375" PROXY_HOST=192.168.3.109 PROXY_PORT=7890 safeclaw create research
```