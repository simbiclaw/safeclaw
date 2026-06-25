#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const SAFECLAW_PATH = process.env.SAFECLAW_PATH || path.join(os.homedir(), 'workspace/best-practice/2026/safeclaw');
const SESSIONS_DIR = path.join(os.homedir(), '.config/safeclaw/sessions');
const DEFAULT_IMAGE = process.env.SAFECLAW_IMAGE || 'safeclaw:cc-2.1.80';

// Detect remote Docker host for URL display
function getDockerHost() {
    const host = process.env.DOCKER_HOST || '';
    // tcp://n68:2375 -> n68
    const m = host.match(/tcp:\/\/([^:]+)/);
    return m ? m[1] : (host.match(/ssh:\/\/([^:]+)/) || [])[1] || 'localhost';
}

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Helper functions
function log(message) {
    console.error(`[safeclaw] ${message}`);
}

function error(message) {
    console.error(`[safeclaw] Error: ${message}`);
    process.exit(1);
}

function exec(command, options = {}) {
    try {
        return execSync(command, { encoding: 'utf8', ...options });
    } catch (e) {
        if (options.ignoreErrors) {
            return null;
        }
        throw e;
    }
}

function containerExists(name) {
    try {
        const containers = exec(`docker ps -a --format '{{.Names}}'`, { ignoreErrors: true }) || '';
        return containers.split('\n').includes(name);
    } catch {
        return false;
    }
}

function isContainerRunning(name) {
    try {
        const output = exec(`docker ps --format '{{.Names}}' --filter "status=running"`, { ignoreErrors: true }) || '';
        return output.split('\n').includes(name);
    } catch {
        return false;
    }
}

function getContainerStatus(name) {
    if (!containerExists(name)) {
        return 'not found';
    }
    if (isContainerRunning(name)) {
        return 'running';
    }
    return 'stopped';
}

function waitForContainer(name, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        if (isContainerRunning(name)) {
            return true;
        }
        execSync('sleep 1');
    }
    return false;
}

function waitForTtyd(name, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const output = exec(`docker exec ${name} tmux capture-pane -t main -p`, { ignoreErrors: true }) || '';
            if (output.includes('❯')) {
                return true;
            }
        } catch {}
        execSync('sleep 1');
    }
    return false;
}

function sendCommand(name, command, waitForOutput = true) {
    // Send the command (no C-c — it kills Claude Code)
    exec(`docker exec ${name} tmux send-keys -t main '${command}' Enter`);

    if (!waitForOutput) {
        return '';
    }

    // Wait a bit for command to execute
    execSync('sleep 2');

    // Try to capture output
    let attempts = 0;
    let output = '';

    while (attempts < 5) {
        try {
            output = exec(`docker exec ${name} tmux capture-pane -t main -p`) || '';

            // Check if command was submitted (prompt appears after command)
            if (output.includes('❯') && output.indexOf(command) < output.lastIndexOf('❯')) {
                // Extract output between command and final prompt
                const lines = output.split('\n');
                const cmdIndex = lines.findIndex(line => line.includes(command));
                const promptIndex = lines.findIndex((line, i) => i > cmdIndex && line.includes('❯'));

                if (cmdIndex !== -1 && promptIndex !== -1) {
                    const relevantLines = lines.slice(cmdIndex + 1, promptIndex);

                    // Clean up the output
                    return relevantLines
                        .filter(line => !line.includes('tmux') && !line.includes('docker'))
                        .map(line => line.replace(/^\s*[│├└]/, '').trim())
                        .filter(line => line.length > 0)
                        .join('\n');
                }
            }
        } catch {}

        attempts++;
        execSync('sleep 1');
    }

    return output;
}

// Command handlers
async function createSession(name, volume, opts = {}) {
    const { image, noBuild, dashboardPort } = opts;
    const containerName = `safeclaw-${name}`;

    if (containerExists(containerName)) {
        error(`Session '${name}' already exists. Use 'safeclaw start ${name}' or delete it first.`);
    }

    log(`Creating session '${name}'...`);

    // Build the container (skip with --no-build if image already loaded)
    if (!noBuild) {
        const imageTag = image || DEFAULT_IMAGE;
        log(`Building image ${imageTag}...`);
        try {
            exec(`cd ${SAFECLAW_PATH} && IMAGE_TAG=${imageTag} ./scripts/build.sh`);
        } catch (e) {
            error(`Failed to build container: ${e.message}`);
        }
    } else {
        log(`Skipping build (using existing image: ${image || DEFAULT_IMAGE})`);
    }

    // Prepare volume mount if specified
    let volumeArg = '';
    if (volume) {
        volumeArg = `-v ${volume}`;
        log(`Mounting volume: ${volume}`);
    }

    // Run the container
    const imageTag = opts.image || DEFAULT_IMAGE;
    const extraEnv = [];
    if (opts.dashboardPort) {
        extraEnv.push(`DASHBOARD_PORT=${opts.dashboardPort}`);
    }
    const envPrefix = extraEnv.length > 0 ? extraEnv.join(' ') + ' ' : '';
    try {
        exec(`cd ${SAFECLAW_PATH} && ${envPrefix}IMAGE_TAG=${imageTag} ./scripts/run.sh -s ${name} -n ${volumeArg}`);
    } catch (e) {
        error(`Failed to start container: ${e.message}`);
    }

    // Wait for container to be ready
    log('Waiting for container to start...');
    if (!waitForContainer(containerName, 30000)) {
        error('Container failed to start within 30 seconds');
    }

    // Start tmux and Claude Code (ttyd only spawns them on browser connect)
    log('Starting Claude Code...');
    exec(`docker exec ${containerName} bash -c '
        if ! tmux has-session -t main 2>/dev/null; then
            tmux -f /dev/null new -d -s main
            tmux set -t main status off
            tmux set -t main mouse on
            tmux send-keys -t main "claude --dangerously-skip-permissions" Enter
            # Auto-accept bypass permissions warning (newer Claude Code versions)
            sleep 3
            tmux send-keys -t main "2" Enter
        fi
    '`);

    // Wait for ttyd/tmux to be ready
    if (!waitForTtyd(containerName, 30000)) {
        error('Claude Code failed to initialize within 30 seconds');
    }

    const host = getDockerHost();
    const port = exec(`docker port ${containerName} 7681 | cut -d: -f2`, { ignoreErrors: true })?.trim() || '7681';
    log(`Session '${name}' created and started successfully!`);
    log(`Access it at: http://${host}:${port}`);
}

async function startSession(name) {
    const containerName = `safeclaw-${name}`;

    if (!containerExists(containerName)) {
        error(`Session '${name}' does not exist. Create it first with: safeclaw create ${name}`);
    }

    if (isContainerRunning(containerName)) {
        log(`Session '${name}' is already running`);
        return;
    }

    log(`Starting session '${name}'...`);

    try {
        exec(`docker start ${containerName}`);

        // Wait for container to be ready
        if (!waitForContainer(containerName, 30000)) {
            error('Container failed to start within 30 seconds');
        }

        // Wait for ttyd
        if (!waitForTtyd(containerName, 30000)) {
            error('ttyd failed to start within 30 seconds');
        }

        const host2 = getDockerHost();
        const port2 = exec(`docker port ${containerName} 7681 | cut -d: -f2`, { ignoreErrors: true })?.trim() || '7681';
        log(`Session '${name}' started successfully!`);
        log(`Access it at: http://${host2}:${port2}`);
    } catch (e) {
        error(`Failed to start session: ${e.message}`);
    }
}

async function stopSession(name) {
    const containerName = `safeclaw-${name}`;

    if (!containerExists(containerName)) {
        error(`Session '${name}' does not exist`);
    }

    if (!isContainerRunning(containerName)) {
        log(`Session '${name}' is not running`);
        return;
    }

    log(`Stopping session '${name}'...`);

    try {
        exec(`docker stop ${containerName}`);
        log(`Session '${name}' stopped`);
    } catch (e) {
        error(`Failed to stop session: ${e.message}`);
    }
}

async function deleteSession(name) {
    const containerName = `safeclaw-${name}`;

    if (!containerExists(containerName)) {
        error(`Session '${name}' does not exist`);
    }

    // Stop if running
    if (isContainerRunning(containerName)) {
        log(`Stopping session '${name}' first...`);
        exec(`docker stop ${containerName}`);
    }

    log(`Deleting session '${name}'...`);

    try {
        exec(`docker rm ${containerName}`);
        log(`Session '${name}' deleted`);
    } catch (e) {
        error(`Failed to delete session: ${e.message}`);
    }
}

async function listSessions() {
    try {
        const containers = exec(`docker ps -a --format '{{.Names}}\t{{.Status}}' --filter "name=safeclaw-"`, { ignoreErrors: true }) || '';

        if (!containers.trim()) {
            log('No sessions found');
            return;
        }

        console.log('\nSessions:');
        console.log('---------');

        containers.split('\n').forEach(line => {
            if (line.trim()) {
                const [name, status] = line.split('\t');
                const sessionName = name.replace('safeclaw-', '');
                console.log(`${sessionName.padEnd(20)} ${status}`);
            }
        });

        console.log('');
    } catch (e) {
        error(`Failed to list sessions: ${e.message}`);
    }
}

async function getStatus(name) {
    const containerName = `safeclaw-${name}`;
    const status = getContainerStatus(containerName);

    if (status === 'not found') {
        error(`Session '${name}' does not exist`);
    }

    console.log(`Session: ${name}`);
    console.log(`Status: ${status}`);

    if (status === 'running') {
        try {
            const port = exec(`docker port ${containerName} 7681 | cut -d: -f2`, { ignoreErrors: true })?.trim();
            if (port) {
                console.log(`URL: http://${getDockerHost()}:${port}`);
            }
        } catch {}
    }
}

async function execCommand(name, command) {
    const containerName = `safeclaw-${name}`;

    if (!containerExists(containerName)) {
        error(`Session '${name}' does not exist`);
    }

    if (!isContainerRunning(containerName)) {
        error(`Session '${name}' is not running. Start it first with: safeclaw start ${name}`);
    }

    log(`Executing command in session '${name}'...`);

    try {
        const output = sendCommand(containerName, command);
        if (output) {
            console.log(output);
        }
    } catch (e) {
        error(`Failed to execute command: ${e.message}`);
    }
}

async function sendQuery(name, query) {
    const containerName = `safeclaw-${name}`;

    if (!containerExists(containerName)) {
        error(`Session '${name}' does not exist`);
    }

    if (!isContainerRunning(containerName)) {
        error(`Session '${name}' is not running. Start it first with: safeclaw start ${name}`);
    }

    log(`Sending query to Claude Code in session '${name}'...`);

    try {
        const output = sendCommand(containerName, query);
        if (output) {
            console.log('\n' + output);
        } else {
            log('No output captured — check http://localhost:17681');
        }
    } catch (e) {
        error(`Failed to send query: ${e.message}`);
    }
}

// Main CLI handler
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: safeclaw <command> [options]');
        console.log('\nCommands:');
        console.log('  create <name> [-v <volume>] [--image <tag>] [--no-build]  Create a new session');
        console.log('  start <name>                 Start an existing session');
        console.log('  stop <name>                  Stop a running session');
        console.log('  delete <name>                Delete a session');
        console.log('  list                         List all sessions');
        console.log('  status <name>                Check session status');
        console.log('  exec <name> "<command>"      Execute a command');
        console.log('  query <name> "<query>"       Send a query to Claude Code');
        console.log('\nEnvironment variables:');
        console.log('  DOCKER_HOST       Remote Docker daemon (e.g. tcp://n68:2375)');
        console.log('  PROXY_HOST        Build proxy host (default: 127.0.0.1)');
        console.log('  PROXY_PORT        Build proxy port (default: 7897)');
        console.log('  SAFECLAW_PATH     Project directory (default: ~/workspace/best-practice/2026/safeclaw)');
        console.log('\nExamples:');
        console.log('  safeclaw create myproject');
        console.log('  safeclaw create myproject -v /path/to/project:/home/sclaw/myproject');
        console.log('  DOCKER_HOST="tcp://n68:2375" safeclaw create research --image safeclaw-linux:cc-2.1.80 --no-build');
        process.exit(0);
    }

    const command = args[0];

    try {
        switch (command) {
            case 'create': {
                if (args.length < 2) {
                    error('Usage: safeclaw create <name> [-v <volume>] [--image <tag>] [--no-build]');
                }
                const name = args[1];
                let volume = null;
                let image = null;
                let noBuild = false;
                let dashboardPort = null;

                // Parse options
                for (let i = 2; i < args.length; i++) {
                    if (args[i] === '-v' && i + 1 < args.length) {
                        volume = args[++i];
                    } else if (args[i] === '--image' && i + 1 < args.length) {
                        image = args[++i];
                    } else if (args[i] === '--no-build') {
                        noBuild = true;
                    } else if (args[i] === '--dashboard-port' && i + 1 < args.length) {
                        dashboardPort = args[++i];
                    }
                }

                await createSession(name, volume, { image, noBuild, dashboardPort });
                break;
            }

            case 'start': {
                if (args.length < 2) {
                    error('Usage: safeclaw start <name>');
                }
                await startSession(args[1]);
                break;
            }

            case 'stop': {
                if (args.length < 2) {
                    error('Usage: safeclaw stop <name>');
                }
                await stopSession(args[1]);
                break;
            }

            case 'delete': {
                if (args.length < 2) {
                    error('Usage: safeclaw delete <name>');
                }
                await deleteSession(args[1]);
                break;
            }

            case 'list': {
                await listSessions();
                break;
            }

            case 'status': {
                if (args.length < 2) {
                    error('Usage: safeclaw status <name>');
                }
                await getStatus(args[1]);
                break;
            }

            case 'exec': {
                if (args.length < 3) {
                    error('Usage: safeclaw exec <name> "<command>"');
                }
                await execCommand(args[1], args.slice(2).join(' '));
                break;
            }

            case 'query': {
                if (args.length < 3) {
                    error('Usage: safeclaw query <name> "<query>"');
                }
                await sendQuery(args[1], args.slice(2).join(' '));
                break;
            }

            default:
                error(`Unknown command: ${command}`);
        }
    } catch (e) {
        error(e.message);
    }
}

// Run the CLI
if (require.main === module) {
    main().catch(error);
}

module.exports = {
    createSession,
    startSession,
    stopSession,
    deleteSession,
    listSessions,
    getStatus,
    execCommand,
    sendQuery
};