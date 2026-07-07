const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Runner] Starting NXBot Unified Services...');

// Resolve directories
const botDir = path.join(__dirname, '..', 'discord-bot');
const webDir = path.join(__dirname, '..', 'web-dashboard');
const dataDir = path.join(__dirname, '..', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to determine executable name based on platform
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Spawn web dashboard (should stay running forever)
console.log('[Runner] Starting Next.js Dashboard...');
const webProcess = spawn(npmCmd, ['run', 'start'], {
  cwd: webDir,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

function logData(prefix, data) {
  const lines = data.toString().trim().split('\n');
  for (const line of lines) {
    if (line) {
      console.log(`${prefix} ${line}`);
    }
  }
}

webProcess.stdout.on('data', (data) => logData('\x1b[36m[Dashboard]\x1b[0m', data));
webProcess.stderr.on('data', (data) => logData('\x1b[31m[Dashboard Error]\x1b[0m', data));

webProcess.on('close', (code) => {
  console.log(`[Runner] Dashboard process exited with code ${code}. Stopping bot...`);
  if (botRestartTimeout) clearTimeout(botRestartTimeout);
  if (botProcess) {
    botProcess.removeAllListeners('close');
    botProcess.kill();
  }
  process.exit(code || 0);
});

// Spawn discord bot with automatic restart logic
let botProcess = null;
let botRestartTimeout = null;

function startBot() {
  if (botRestartTimeout) {
    clearTimeout(botRestartTimeout);
    botRestartTimeout = null;
  }

  console.log('[Runner] Starting Discord Bot...');

  // Write start state to JSON file
  try {
    fs.writeFileSync(path.join(dataDir, 'bot_status.json'), JSON.stringify({
      status: 'starting',
      error: null,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    console.error('[Runner Error] Failed to write status file:', err);
  }

  botProcess = spawn(npmCmd, ['run', 'start'], {
    cwd: botDir,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  botProcess.stdout.on('data', (data) => {
    logData('\x1b[35m[Bot]\x1b[0m', data);
  });

  botProcess.stderr.on('data', (data) => {
    logData('\x1b[31m[Bot Error]\x1b[0m', data);
    
    // Check if stderr contains disallowed intents or similar fatal errors
    const errorStr = data.toString();
    if (errorStr.includes('Used disallowed intents') || errorStr.includes('disallowed intents')) {
      try {
        fs.writeFileSync(path.join(dataDir, 'bot_status.json'), JSON.stringify({
          status: 'error',
          error: 'Disallowed intents: Enable "Message Content Intent" in Discord Developer Portal under Bot settings.',
          updatedAt: new Date().toISOString()
        }, null, 2));
      } catch (err) {
        console.error('[Runner Error] Failed to write status file:', err);
      }
    }
  });

  botProcess.on('close', (code) => {
    console.log(`[Runner] Bot process exited with code ${code}.`);

    // Only overwrite if it wasn't already marked as a specific error
    try {
      let currentStatus = {};
      if (fs.existsSync(path.join(dataDir, 'bot_status.json'))) {
        currentStatus = JSON.parse(fs.readFileSync(path.join(dataDir, 'bot_status.json'), 'utf8'));
      }
      
      if (currentStatus.status !== 'error') {
        fs.writeFileSync(path.join(dataDir, 'bot_status.json'), JSON.stringify({
          status: 'offline',
          error: `Bot process exited with code ${code}`,
          code: code,
          updatedAt: new Date().toISOString()
        }, null, 2));
      }
    } catch (err) {
      console.error('[Runner Error] Failed to write status file:', err);
    }

    console.log('[Runner] Attempting to restart bot in 15 seconds...');
    botRestartTimeout = setTimeout(() => {
      startBot();
    }, 15000);
  });
}

// Start the bot process
startBot();

// Handle termination signals
const handleExit = () => {
  console.log('[Runner] Stopping all processes...');
  if (botRestartTimeout) clearTimeout(botRestartTimeout);
  if (botProcess) {
    botProcess.removeAllListeners('close');
    botProcess.kill();
  }
  if (webProcess) {
    webProcess.removeAllListeners('close');
    webProcess.kill();
  }
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
