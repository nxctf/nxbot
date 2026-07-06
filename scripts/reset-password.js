#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

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

const db = new Database(DB_PATH);
const setupRow = db.prepare("SELECT value FROM system_settings WHERE key = 'is_setup'").get();
if (!setupRow || setupRow.value !== 'true') {
  console.error('[ERROR] Setup not completed yet. Run ./nxbot setup first.');
  process.exit(1);
}

const password = fs.readFileSync(0, 'utf8').trim();
if (password.length < 6) {
  console.error('[ERROR] Password must be at least 6 characters.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('admin_password_hash', ?, CURRENT_TIMESTAMP)").run(hash);
db.close();

console.log('Admin password updated successfully.');
