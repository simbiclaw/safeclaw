---
name: slack
description: Read Slack messages, send notifications, and upload files. Uses a single User Token.
---

# Slack Tool

Use `~/tools/slack-read.js` for all Slack operations:

## Read

```bash
node ~/tools/slack-read.js channels
node ~/tools/slack-read.js dms
node ~/tools/slack-read.js history <channel_id>
node ~/tools/slack-read.js history <channel_id> 50
node ~/tools/slack-read.js search "keyword"
node ~/tools/slack-read.js search "from:@user in:#channel"
node ~/tools/slack-read.js users
node ~/tools/slack-read.js info <channel_id>
```

## Send messages

```bash
# Send to specific channel
node ~/tools/slack-read.js send <channel_id> "message"

# Send to default notification channel (uses SLACK_CHANNEL_ID)
node ~/tools/slack-read.js send "message"

# Shortcut for notifications
node ~/tools/slack-read.js notify "message"
```

## Upload files

```bash
node ~/tools/slack-read.js upload <channel_id> /path/to/file "comment"
node ~/tools/slack-read.js upload /path/to/file "comment"
```

## Task completion notification

When you finish a task, ALWAYS notify:

```bash
node ~/tools/slack-read.js notify "✅ Done: <one-line summary>"
```

If a task fails:

```bash
node ~/tools/slack-read.js notify "❌ Failed: <error summary>"
```

## Requirements

- `SLACK_TOKEN` env var (User Token, `xoxp-...`)
- `SLACK_CHANNEL_ID` env var (for `send` without channel id and `notify`)
- Run `./scripts/setup-slack.sh` on host to configure
