#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SCRIPT_DIR = path.resolve(__dirname);
const PROJECT_DIR = path.resolve(SCRIPT_DIR, '..');
const DB_PATH = path.join(PROJECT_DIR, 'data', 'nxbot.db');

// Try to find bcryptjs and better-sqlite3
const searchPaths = [
  path.join(PROJECT_DIR, 'web-dashboard', 'node_modules'),
  path.join(PROJECT_DIR, 'discord-bot', 'node_modules'),
  path.join(PROJECT_DIR, 'node_modules'),
];

let bcrypt, Database;
for (const p of searchPaths) {
  try {
    if (!bcrypt) bcrypt = require(path.join(p, 'bcryptjs'));
    if (!Database) Database = require(path.join(p, 'better-sqlite3'));
  } catch (_) {}
}

if (!bcrypt || !Database) {
  console.error('[ERROR] Required dependencies not found. Run:');
  console.error('  cd web-dashboard && npm install');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error('[ERROR] Database not found. Run ./nxbot setup first.');
  process.exit(1);
}

const input = fs.readFileSync(0, 'utf8').split('\n');
const username = input[0]?.trim();
const password = input[1]?.trim();

if (!username || username.length < 3) {
  console.error('[ERROR] Username must be at least 3 characters.');
  process.exit(1);
}

if (!password || password.length < 6) {
  console.error('[ERROR] Password must be at least 6 characters.');
  process.exit(1);
}

const db = new Database(DB_PATH);
const hash = bcrypt.hashSync(password, 10);
const jwtSecret = crypto.randomBytes(32).toString('hex');

const runSetup = db.transaction(() => {
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('admin_username', ?, CURRENT_TIMESTAMP)").run(username);
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('admin_password_hash', ?, CURRENT_TIMESTAMP)").run(hash);
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('jwt_secret', ?, CURRENT_TIMESTAMP)").run(jwtSecret);
  db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('is_setup', 'true', CURRENT_TIMESTAMP)").run();
});

runSetup();
db.close();

console.log('Credentials configured successfully.');
