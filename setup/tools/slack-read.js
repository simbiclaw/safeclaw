#!/usr/bin/env node

// Slack Tool - read messages, send notifications, upload files
// Usage: node slack-read.js <command> [args]

const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const path = require('path');

// Get token from env var
function getToken(envVarName = 'SLACK_TOKEN') {
    const token = process.env[envVarName];
    if (!token) {
        console.error(`${envVarName} env var not set.`);
        console.error('Run: ./scripts/setup-slack.sh');
        process.exit(1);
    }
    return token;
}

// Parse --token flag
let tokenEnvVar = 'SLACK_TOKEN';
const rawArgs = process.argv.slice(2);
const tokenFlagIdx = rawArgs.indexOf('--token');
if (tokenFlagIdx !== -1) {
    tokenEnvVar = rawArgs[tokenFlagIdx + 1];
    if (!tokenEnvVar) {
        console.error('--token requires an env var name');
        process.exit(1);
    }
    rawArgs.splice(tokenFlagIdx, 2);
}

const client = new WebClient(getToken(tokenEnvVar));

// Default notification channel from env
function getDefaultChannel() {
    return process.env.SLACK_CHANNEL_ID || null;
}

// Commands
const commands = {
    async channels() {
        const result = await client.conversations.list({ types: 'public_channel,private_channel' });
        for (const ch of result.channels) {
            const type = ch.is_private ? 'private' : 'public';
            console.log(`${ch.id}\t${ch.name}\t(${type})`);
        }
    },

    async dms() {
        const result = await client.conversations.list({ types: 'im,mpim' });
        for (const ch of result.channels) {
            const type = ch.is_mpim ? 'group-dm' : 'dm';
            console.log(`${ch.id}\t${ch.name || ch.user || 'unnamed'}\t(${type})`);
        }
    },

    async history(channelId, limit = 20) {
        if (!channelId) {
            console.error('Usage: slack-read.js history <channel_id> [limit]');
            process.exit(1);
        }
        const result = await client.conversations.history({
            channel: channelId,
            limit: parseInt(limit)
        });
        for (const msg of result.messages.reverse()) {
            const time = new Date(msg.ts * 1000).toISOString();
            const user = msg.user || 'unknown';
            console.log(`[${time}] ${user}: ${msg.text}`);
        }
    },

    async search(query, limit = 20) {
        if (!query) {
            console.error('Usage: slack-read.js search <query> [limit]');
            process.exit(1);
        }
        const result = await client.search.messages({
            query,
            count: parseInt(limit)
        });
        for (const match of result.messages.matches) {
            const time = new Date(match.ts * 1000).toISOString();
            const user = match.user || match.username || 'unknown';
            const channel = match.channel?.name || 'unknown';
            console.log(`[${time}] #${channel} ${user}: ${match.text}`);
            console.log('---');
        }
    },

    async users() {
        const result = await client.users.list();
        for (const user of result.members) {
            if (!user.deleted && !user.is_bot) {
                console.log(`${user.id}\t${user.name}\t${user.real_name || ''}`);
            }
        }
    },

    async info(channelId) {
        if (!channelId) {
            console.error('Usage: slack-read.js info <channel_id>');
            process.exit(1);
        }
        const result = await client.conversations.info({ channel: channelId });
        const ch = result.channel;
        console.log(`Name: ${ch.name}`);
        console.log(`ID: ${ch.id}`);
        console.log(`Type: ${ch.is_private ? 'private' : 'public'}`);
        console.log(`Members: ${ch.num_members || 'unknown'}`);
        console.log(`Topic: ${ch.topic?.value || 'none'}`);
        console.log(`Purpose: ${ch.purpose?.value || 'none'}`);
    },

    async send(channelIdOrMessage, ...messageParts) {
        let channelId, message;

        // If first arg looks like a channel ID (starts with C/G/D), use it
        if (channelIdOrMessage && /^[CGD][A-Z0-9]+$/.test(channelIdOrMessage)) {
            channelId = channelIdOrMessage;
            message = messageParts.join(' ');
        } else {
            // Use default channel, treat all args as message
            channelId = getDefaultChannel();
            message = [channelIdOrMessage, ...messageParts].join(' ');
        }

        if (!channelId) {
            console.error('Usage: slack-read.js send [channel_id] "message"');
            console.error('Or set SLACK_CHANNEL_ID env var for default channel.');
            process.exit(1);
        }
        if (!message) {
            console.error('Usage: slack-read.js send [channel_id] "message"');
            process.exit(1);
        }

        const result = await client.chat.postMessage({
            channel: channelId,
            text: message,
            unfurl_links: false
        });
        console.log(`Sent to ${channelId}: ${result.ts}`);
    },

    async upload(channelIdOrFile, ...rest) {
        let channelId, filePath, comment;

        // If first arg looks like a channel ID
        if (channelIdOrFile && /^[CGD][A-Z0-9]+$/.test(channelIdOrFile)) {
            channelId = channelIdOrFile;
            filePath = rest[0];
            comment = rest.slice(1).join(' ') || 'File upload';
        } else {
            channelId = getDefaultChannel();
            filePath = channelIdOrFile;
            comment = rest.join(' ') || 'File upload';
        }

        if (!channelId || !filePath) {
            console.error('Usage: slack-read.js upload [channel_id] /path/to/file ["comment"]');
            console.error('Or set SLACK_CHANNEL_ID env var for default channel.');
            process.exit(1);
        }

        const result = await client.filesUploadV2({
            channel_id: channelId,
            file: fs.createReadStream(filePath),
            filename: path.basename(filePath),
            initial_comment: comment
        });
        console.log('Uploaded:', result.files?.[0]?.permalink || 'ok');
    },

    async notify(...messageParts) {
        // Shortcut: send to default notification channel
        const channelId = getDefaultChannel();
        if (!channelId) {
            console.error('SLACK_CHANNEL_ID env var not set.');
            console.error('Run: ./scripts/setup-slack.sh');
            process.exit(1);
        }
        const message = messageParts.join(' ');
        if (!message) {
            console.error('Usage: slack-read.js notify "message"');
            process.exit(1);
        }
        await commands.send(channelId, message);
    },

    help() {
        console.log(`Slack Tool - read, send, and upload

Usage: slack-read.js [--token ENV_VAR] <command> [args]

Options:
  --token ENV_VAR       Use a different env var (default: SLACK_TOKEN)

Read commands:
  channels              List all channels (public & private)
  dms                   List DMs and group DMs
  history <id> [n]      Read last n messages from channel (default: 20)
  search <query> [n]    Search messages (default: 20 results)
  users                 List workspace users
  info <id>             Get channel info

Write commands:
  send [id] "msg"       Send message (uses SLACK_CHANNEL_ID if no id given)
  upload [id] file      Upload a file with optional comment
  notify "msg"          Send to default notification channel (SLACK_CHANNEL_ID)

  help                  Show this help
`);
    }
};

// Main
async function main() {
    const [command, ...args] = rawArgs;

    if (!command || !commands[command]) {
        commands.help();
        process.exit(command ? 1 : 0);
    }

    try {
        await commands[command](...args);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
