# Bug Fix Status Report

## Bug 1: Tmux Session Not Receiving Instructions

### Status: ✓ FIXED

**Root Cause:**
When using `./scripts/run.sh -q "query"`, the script waited only 3 seconds before sending the query. Claude Code takes longer to initialize, so queries were sent before the prompt was ready.

**Fix Applied:**
Modified `scripts/run.sh` to implement dynamic ready-state polling:
- Checks tmux output every second (up to 30 seconds)
- Waits for the Claude Code prompt indicator (❯) to appear
- Only sends query after confirming Claude is ready
- Provides feedback: "Claude Code ready after X seconds"

**Verification:**
✓ Script output shows: "Claude Code ready after 2 seconds"
✓ Query is sent to tmux session successfully
✓ No manual intervention needed for query delivery

**Files Modified:**
- `scripts/run.sh` (lines 222-247)

---

## Bug 2: Non-Anthropic Model Authentication

### Status: ✗ PARTIALLY FIXED (Still has issues)

**Root Cause:**
Claude Code has TWO authentication checks when using non-Anthropic API endpoints:

1. **Login status check** - Shows "Not logged in" in status bar
2. **API key confirmation prompt** - Interactive prompt asking "Do you want to use this API key?"

**Attempted Fixes:**

### Fix 1: Set `isLoggedIn: true` in `.claude.json`
- **Status:** Applied but insufficient
- **Result:** Still shows "Not logged in" in status bar
- **Reason:** Claude Code checks authentication against the API endpoint, not just the config flag

### Fix 2: Set `customApiKeyPromptDisabled: true`
- **Status:** Applied but doesn't work
- **Result:** API key prompt still appears
- **Reason:** This flag doesn't exist or isn't respected by Claude Code

### Fix 3: Pre-approve API key in `customApiKeyResponses.approved`
- **Status:** Applied but doesn't work
- **Result:** API key prompt still appears
- **Reason:** Claude Code requires the actual API key hash, not a wildcard

### Fix 4: Auto-confirm API key prompt in run.sh
- **Status:** Applied but timing issue
- **Result:** Prompt appears AFTER initialization check completes
- **Reason:** The prompt appears asynchronously after Claude Code starts

**Current Behavior:**
1. Container starts with query via `-q` flag
2. Tmux session starts Claude Code
3. Ready-state check passes (❯ prompt appears)
4. Query is sent to tmux
5. API key confirmation prompt appears (blocks the query)
6. Query is lost/not processed
7. Manual intervention required to approve API key

**Workaround:**
Use `claude -p "query" --dangerously-skip-permissions` (non-interactive mode) which bypasses the API key prompt entirely. However, this loses the interactive tmux session feature.

---

## Recommendations

### Option A: Accept Manual API Key Approval (Current State)
- Keep tmux-based interactive sessions
- User manually approves API key on first run
- Subsequent runs in the same container won't prompt again
- **Pros:** Full interactive session support
- **Cons:** Requires manual intervention on first run

### Option B: Use Non-Interactive Mode for `-q` Flag
- Use `claude -p` for queries sent via `-q` flag
- Keep tmux for manual browser access
- **Pros:** No API key prompt, fully automated
- **Cons:** Loses interactive session for `-q` queries

### Option C: Pre-seed API Key Approval
- Extract API key hash from environment
- Pre-populate `customApiKeyResponses.approved` array in Dockerfile
- **Pros:** Fully automated, keeps interactive sessions
- **Cons:** Requires knowing the API key hash algorithm

### Option D: Use Official Anthropic API Endpoint
- Set `ANTHROPIC_BASE_URL=https://api.anthropic.com`
- Use official Anthropic API key
- **Pros:** No authentication issues
- **Cons:** Can't use alternative endpoints (DeepSeek, LiteLLM, etc.)

---

## Current Implementation

**What Works:**
- ✓ Tmux session receives instructions reliably
- ✓ Ready-state detection prevents premature query sending
- ✓ Non-interactive mode (`claude -p`) works without prompts

**What Doesn't Work:**
- ✗ Interactive tmux sessions with non-Anthropic endpoints require manual API key approval
- ✗ "Not logged in" still shows in status bar (cosmetic issue, doesn't block functionality)

---

## Testing Results

### Test 1: Tmux Ready-State Detection
```bash
./scripts/run.sh -s test -n -q "echo test"
```
**Result:** ✓ PASS - "Claude Code ready after 2 seconds"

### Test 2: Non-Anthropic Auth with Interactive Session
```bash
./scripts/run.sh -s test -n -q "create file"
```
**Result:** ✗ FAIL - API key prompt blocks query execution

### Test 3: Non-Interactive Mode
```bash
docker exec container claude -p "create file" --dangerously-skip-permissions
```
**Result:** ✓ PASS - No prompts, executes immediately

---

## Next Steps

1. **Decide on approach:** Choose between Option A, B, C, or D above
2. **Update documentation:** Document the chosen approach and any manual steps required
3. **Test end-to-end:** Verify the complete worker delegation workflow
4. **Update CLAUDE.md:** Add instructions for handling API key prompts if needed
