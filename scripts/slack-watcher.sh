#!/bin/bash
# Watch Slack channel for new tasks, dispatch to SafeClaw worker

SECRETS_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/safeclaw/.secrets"
CHANNEL_ID=$(cat "$SECRETS_DIR/SLACK_CHANNEL_ID")
SLACK_TOKEN=$(cat "$SECRETS_DIR/SLACK_TOKEN")
POLL_INTERVAL=10
LAST_TS=""

echo "Watching Slack channel $CHANNEL_ID for tasks..."

while true; do
    # Get latest message
    RESPONSE=$(curl -s -H "Authorization: Bearer $SLACK_TOKEN" \
        "https://slack.com/api/conversations.history?channel=$CHANNEL_ID&limit=1")

    TEXT=$(echo "$RESPONSE" | jq -r '.messages[0].text // empty')
    TS=$(echo "$RESPONSE" | jq -r '.messages[0].ts // empty')
    USER=$(echo "$RESPONSE" | jq -r '.messages[0].user // empty')
    BOT_ID=$(echo "$RESPONSE" | jq -r '.messages[0].bot_id // empty')

    # Skip bot messages (our own notifications) and already-processed messages
    if [ -n "$TEXT" ] && [ "$TS" != "$LAST_TS" ] && [ -z "$BOT_ID" ]; then
        LAST_TS="$TS"
        echo "[$(date)] New task: $TEXT"

        # Acknowledge
        curl -s -X POST -H "Authorization: Bearer $SLACK_TOKEN" \
            -H "Content-type: application/json" \
            --data "{\"channel\":\"$CHANNEL_ID\",\"text\":\"🔄 Received, starting worker...\"}" \
            https://slack.com/api/chat.postMessage > /dev/null

        # Dispatch to worker
        ./scripts/run.sh -s worker -n -q "$TEXT"
    fi

    sleep "$POLL_INTERVAL"
done
