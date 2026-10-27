# SafeClaw architecture

## Overview

SafeClaw runs Claude Code inside a sandboxed Docker container, accessible via a web terminal. All authentication is handled via environment variables, making it easy to deploy locally or in the cloud.

## Web terminal

The user interacts with Claude Code through a browser, not a local terminal. This gives full access to the native Claude Code UI rather than building a custom one on top of the Agent SDK.

### Current approach: ttyd + tmux

- **ttyd** serves a web terminal over HTTP/WebSocket on port 7681
- **tmux** manages the Claude Code session inside the container
- One port, one ttyd process, one tmux session per container
- Full Claude Code UI - status line, colors, interactive prompts, everything
- No custom UI code needed

## Authentication

All secrets are stored on the host in `~/.config/safeclaw/.secrets/`. Each file becomes an environment variable (filename = env var name).

### How env vars are passed

1. `run.sh` reads all files in `.secrets/` and writes them to `/home/sclaw/.env` inside the container
2. `BASH_ENV=/home/sclaw/.env` (set in the Dockerfile) ensures every bash invocation sources it
3. `.bashrc` also sources `.env` for interactive shells

This means env vars are available everywhere - interactive shells, Claude's bash commands, and `docker exec bash -c` commands.

### Claude Code

Token from `claude setup-token` is stored as `CLAUDE_CODE_OAUTH_TOKEN`. The Dockerfile sets `hasCompletedOnboarding: true` in `.claude.json` to skip the onboarding flow. Without this, interactive mode ignores the token and shows the login screen ([known issue](https://github.com/anthropics/claude-code/issues/8938)).

Known limitation: the token from `setup-token` has limited scopes (`user:inference` only), so `/usage` doesn't work and the status bar shows "Claude API" instead of the subscription name ([#11985](https://github.com/anthropics/claude-code/issues/11985)). Chat works fine.

### GitHub CLI

`GH_TOKEN` is used for GitHub CLI authentication. On container start, `run.sh` also auto-configures git user (name and email) from the GitHub account.

We recommend creating a separate GitHub account for SafeClaw so you can scope its permissions independently.

## Timezone

The container timezone is `America/Los_Angeles`, configured at the system level (`/etc/localtime` and `/etc/timezone`) rather than with a `TZ` environment variable. The Dockerfile bakes it in from the `TZ` build arg, and `run.sh` reapplies it on every start so containers created from older images are covered. Claude Code, Node, `date`, git, and logs all report local Pacific time.

## Outbound proxy

There is no proxy configuration inside the container. Docker Desktop forwards container egress through host-side processes, so the host's routing applies: when Clash Verge runs with TUN mode (virtual network adapter) enabled, all container traffic is captured and routed by Clash. Applications inside the container simply see normal internet access - no proxy environment variables and no per-application proxy settings.

TUN mode also preserves domain-based routing: Clash sees the TLS SNI / HTTP Host of each connection, so rules that match on domain work the same as for host traffic. A container-side transparent redirect based on destination IP cannot do this. Host-local traffic (`127.0.0.1`, `host.docker.internal`, for example LiteLLM on port 4000) does not leave the host and is unaffected.

Requirements: TUN mode enabled in the host proxy client (Clash Verge: Settings -> TUN Mode). No `NET_ADMIN` capability, iptables rules, or in-container proxy daemon are needed.
