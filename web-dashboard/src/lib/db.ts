import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), '../data/nxbot.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  const tableExists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'"
  ).get();

  if (!tableExists) {
    const schemaPath = path.join(process.cwd(), '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      database.exec(schema);
      console.log('[Dashboard DB] Initialized schema from schema.sql');
    } else {
      console.error('[Dashboard DB] schema.sql not found at', schemaPath);
      throw new Error('schema.sql not found - database cannot be initialized');
    }
  }

  migrateGuildSettings(database);
}

function migrateGuildSettings(database: Database.Database): void {
  const columns = database.prepare('PRAGMA table_info(guilds)').all() as { name: string }[];
  const existing = new Set(columns.map((column) => column.name));
  const migrations = [
    ['firstblood_ping_roles', 'TEXT DEFAULT NULL'],
    ['firstblood_ping_users', 'TEXT DEFAULT NULL'],
    ['firstblood_mention_solver', 'INTEGER DEFAULT 1'],
    ['firstblood_ping_everyone', 'INTEGER DEFAULT 0'],
    ['announcement_ping_roles', 'TEXT DEFAULT NULL'],
    ['announcement_ping_users', 'TEXT DEFAULT NULL'],
    ['announcement_ping_everyone', 'INTEGER DEFAULT 0'],
    ['scoreboard_update_interval_seconds', 'INTEGER DEFAULT 600'],
    ['scoreboard_update_on_solve', 'INTEGER DEFAULT 0'],
  ];

  for (const [column, definition] of migrations) {
    if (!existing.has(column)) {
      database.exec(`ALTER TABLE guilds ADD COLUMN ${column} ${definition}`);
      console.log(`[Dashboard DB] Added guilds.${column}`);
    }
  }
}
