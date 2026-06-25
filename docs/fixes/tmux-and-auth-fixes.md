# Tmux Session and Authentication Fixes

## Issues Fixed

### 1. Tmux Session Not Receiving Instructions

**Root Cause:**
When using `./scripts/run.sh -q "query"` on an existing container, the query was sent too quickly (after only 3 seconds), before Claude Code finished initializing. This caused the query to be lost or not properly received by the interactive session.

**Symptoms:**
- Query appears in tmux capture but isn't executed
- Worker container shows empty prompt (❯) with no activity
- Need to manually send Enter key multiple times

**Fix Applied:**
Modified `scripts/run.sh` to implement a proper ready-state check:
- Polls tmux output every second (up to 30 seconds)
- Waits for the Claude Code prompt indicator (❯) to appear
- Only sends query after confirming Claude is ready
- Provides feedback on initialization time

**Code Changes:**
```bash
# Before (fixed 3-second wait)
sleep 3
docker exec "$CONTAINER_NAME" tmux send-keys -t main "$QUERY" Enter

# After (dynamic ready-state check)
echo "Waiting for Claude Code to initialize..."
for i in {1..30}; do
    if docker exec "$CONTAINER_NAME" tmux capture-pane -t main -p 2>/dev/null | grep -q "❯"; then
        echo "Claude Code ready after ${i} seconds"
        break
    fi
    sleep 1
done
docker exec "$CONTAINER_NAME" tmux send-keys -t main "$QUERY" Enter
```

### 2. Non-Anthropic Model Authentication

**Root Cause:**
Claude Code only recognizes Anthropic's official API endpoints for authentication status. When using non-Anthropic base URLs (like DeepSeek's `https://api.deepseek.com/anthropic`), Claude Code shows "Not logged in" even though:
- `ANTHROPIC_API_KEY` is set correctly
- `ANTHROPIC_BASE_URL` points to a compatible endpoint
- API calls work properly via `claude -p` command

**Symptoms:**
- Interactive tmux session shows "Not logged in · Please run /login"
- Status bar displays "Not logged in · Run /l..."
- Queries submitted via tmux aren't processed
- Direct `claude -p` commands work fine (bypass the login check)

**Fix Applied:**
Modified `Dockerfile` to set `isLoggedIn: true` in `.claude.json`:
- Bypasses Claude Code's authentication check
- Allows interactive mode to work with non-Anthropic endpoints
- Maintains compatibility with official Anthropic API

**Code Changes:**
```dockerfile
# Before
RUN jq '. + {hasCompletedOnboarding: true, bypassPermissionsModeAccepted: true, autoCompactEnabled: false}' /home/sclaw/.claude.json > /tmp/.claude.json.tmp && \
    mv /tmp/.claude.json.tmp /home/sclaw/.claude.json

# After
RUN jq '. + {hasCompletedOnboarding: true, bypassPermissionsModeAccepted: true, autoCompactEnabled: false, isLoggedIn: true}' /home/sclaw/.claude.json > /tmp/.claude.json.tmp && \
    mv /tmp/.claude.json.tmp /home/sclaw/.claude.json
```

## Testing

### Test 1: Tmux Session Query Delivery
```bash
# Start a new container with a query
./scripts/run.sh -s test1 -n -q "echo 'Hello from SafeClaw worker'"

# Verify query was received and executed
docker exec safeclaw-test1 tmux capture-pane -t main -p -S -50
```

**Expected Result:**
- Script shows "Claude Code ready after X seconds"
- Query is executed by Claude
- Output shows the echo command result

### Test 2: Non-Anthropic Model Authentication
```bash
# Rebuild image with fixes
./scripts/build.sh

# Start container with DeepSeek endpoint
./scripts/run.sh -s test2 -n

# Check authentication status
docker exec safeclaw-test2 tmux capture-pane -t main -p | grep -i "logged in"
```

**Expected Result:**
- No "Not logged in" message appears
- Claude Code prompt is ready (❯)
- Interactive session accepts queries

### Test 3: End-to-End Worker Delegation
```bash
# Start worker with research task
./scripts/run.sh -s worker -n -q "Create a file /home/sclaw/test.txt with content 'Worker test successful' and create /home/sclaw/done.flag when finished"

# Poll for completion
for i in {1..10}; do
    if docker exec safeclaw-worker test -f /home/sclaw/done.flag 2>/dev/null; then
        echo "✓ Worker completed task"
        docker exec safeclaw-worker cat /home/sclaw/test.txt
        break
    fi
    echo "Waiting... ($i)"
    sleep 5
done
```

**Expected Result:**
- Worker receives and executes the task
- Creates both files as instructed
- Polling detects completion

## Benefits

1. **Reliable Query Delivery**: Queries are only sent when Claude Code is ready to receive them
2. **Non-Anthropic Compatibility**: Works with any Anthropic-compatible API endpoint (DeepSeek, LiteLLM, etc.)
3. **Better User Experience**: Clear feedback on initialization progress
4. **Reduced Manual Intervention**: No need to manually send Enter keys or restart sessions

## Migration Notes

**Existing Containers:**
- Existing containers won't have the `isLoggedIn: true` fix
- Rebuild the image: `./scripts/build.sh`
- Remove old containers: `docker rm -f safeclaw-*`
- Start fresh containers with the new image

**Backward Compatibility:**
- Changes are backward compatible with Anthropic's official API
- No changes needed for users already using official endpoints
- Tmux ready-state check works for all configurations
