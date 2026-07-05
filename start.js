const { spawn } = require('child_process');
const path = require('path');

console.log('[Runner] Starting NXBot Unified Services...');

// Resolve directories
const botDir = path.join(__dirname, 'discord-bot');
const webDir = path.join(__dirname, 'web-dashboard');

// Helper to determine executable name based on platform
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Spawn discord bot
const botProcess = spawn(npmCmd, ['run', 'start'], {
  cwd: botDir,
  stdio: 'pipe',
  shell: true,
  env: { ...process.env, FORCE_COLOR: '1' }
});

// Spawn web dashboard
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

botProcess.stdout.on('data', (data) => logData('\x1b[35m[Bot]\x1b[0m', data));
botProcess.stderr.on('data', (data) => logData('\x1b[31m[Bot Error]\x1b[0m', data));

webProcess.stdout.on('data', (data) => logData('\x1b[36m[Dashboard]\x1b[0m', data));
webProcess.stderr.on('data', (data) => logData('\x1b[31m[Dashboard Error]\x1b[0m', data));

botProcess.on('close', (code) => {
  console.log(`[Runner] Bot process exited with code ${code}. Stopping web dashboard...`);
  webProcess.kill();
  process.exit(code || 0);
});

webProcess.on('close', (code) => {
  console.log(`[Runner] Dashboard process exited with code ${code}. Stopping bot...`);
  botProcess.kill();
  process.exit(code || 0);
});

// Handle termination signals
const handleExit = () => {
  console.log('[Runner] Stopping all processes...');
  botProcess.kill();
  webProcess.kill();
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
