---
name: draft-pr-workflow
description: Automated Draft PR workflow with multi-dimensional verification. Use when creating PRs.
---

# Draft PR Workflow

When asked to create a PR or submit changes, follow this complete workflow.

## 0. Pre-flight checks

Before starting, verify the environment:

```bash
# Check remote names (might be origin, fork, upstream, etc.)
git remote -v

# Check if CI workflows exist
ls .github/workflows/ 2>/dev/null || echo "WARNING: No CI workflows found"

# Check branch protection rules that might block direct push
# If push is rejected with GH013, the ruleset needs to allow pushes to feature branches
```

**Common issues:**
- Remote might be `fork` instead of `origin` (forked repos)
- Repository rulesets may block direct push — ensure feature branches are not protected, only `main`
- If no `.github/workflows/` exists, CI won't run — set it up first before relying on step 3

## 1. Branch & Implement

```bash
git checkout -b <branch-name>
# Make changes
# Write tests if applicable
# Run tests locally
```

## 2. Create Draft PR

```bash
git add -A
git commit -m "<conventional commit message>"

# Determine remote name
REMOTE=$(git remote | head -1)  # or specify explicitly: origin, fork, etc.
git push -u $REMOTE <branch-name>

# For forked repos, specify --repo to target upstream
gh pr create --draft \
  --repo <owner>/<repo> \
  --head <branch-name> \
  --base main \
  --title "<title>" \
  --body "<body with self-check list>"
```

Always include a self-check list in the PR body:
- [ ] Tests pass locally
- [ ] No secrets or credentials in code
- [ ] Backward compatible with existing behavior
- [ ] Edge cases handled (empty input, missing env vars, etc.)
- [ ] Code is clean and well-named

## 3. Wait for CI (exponential backoff)

```bash
RUN_ID=$(gh run list --repo <owner>/<repo> --branch <branch> --limit 1 --json databaseId -q '.[0].databaseId')

# If RUN_ID is empty, CI was not triggered — check if workflows exist
if [ -z "$RUN_ID" ]; then
  echo "No CI run found. Check .github/workflows/ and branch trigger rules."
else
  sleep 60  && gh run view $RUN_ID --repo <owner>/<repo> | grep -E "✓|X|·|completed|in_progress"
  sleep 120 && gh run view $RUN_ID --repo <owner>/<repo> | grep -E "✓|X|·|completed|in_progress"
  sleep 240 && gh run view $RUN_ID --repo <owner>/<repo> | grep -E "✓|X|·|completed|in_progress"
fi
```

If CI fails: `gh run view $RUN_ID --log-failed` → diagnose → fix → amend → force push → re-check.

**If push is rejected (GH013 repository rule violation):**
- Check ruleset at `Settings > Rules` in the repo
- Ensure feature branches are excluded from "require PR" rules
- Or add yourself to the bypass list

## 4. Self-review the diff

```bash
gh pr diff --repo <owner>/<repo>
```

Check every change for:
1. **Security** - no leaked secrets, proper file permissions (chmod 600 for tokens)
2. **Compatibility** - existing behavior unchanged
3. **Edge cases** - empty inputs, missing config, error paths
4. **Code quality** - no dead code, clear naming, DRY

Then self-reflect — ask yourself:

> "Double check everything, every single claim and change. At the end make a verification table."

Output a verification table:

| Check | File | Status | Note |
|-------|------|--------|------|
| ... | ... | ✅/❌ | ... |

If any ❌: fix → amend → force push → back to step 3.

## 5. Mark ready & deliver

Only after ALL checks pass:

```bash
gh pr ready --repo <owner>/<repo>
```

Human does final review → merge.

## 6. Clean up after merge

```bash
git checkout main
git pull
git branch -d <branch-name>
git push $REMOTE --delete <branch-name>
```

## Rules

- NEVER skip the self-review step (step 4)
- NEVER mark ready without CI passing
- ALWAYS check remote name before pushing (don't assume `origin`)
- ALWAYS verify CI workflows exist before expecting CI to run
- If in doubt, keep it as draft and ask the user
