import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use same DB path as configured or fallback
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
    
    // Auto-create tables if they don't exist
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  // Check if system_settings table exists
  const tableExists = database.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'"
  ).get();

  if (!tableExists) {
    // Try to load schema from db/schema.sql
    const schemaPath = path.join(process.cwd(), '../db/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      database.exec(schema);
      console.log('[Dashboard DB] Initialized schema from schema.sql');
    } else {
      // Inline schema fallback
      database.exec(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO system_settings (key, value) VALUES ('is_setup', 'false');

        CREATE TABLE IF NOT EXISTS guilds (
          id TEXT PRIMARY KEY,
          guild_name TEXT NOT NULL,
          supabase_url TEXT NOT NULL,
          supabase_anon_key TEXT NOT NULL,
          supabase_login_email TEXT DEFAULT NULL,
          supabase_login_password TEXT DEFAULT NULL,
          channel_firstblood TEXT DEFAULT NULL,
          channel_scoreboard TEXT DEFAULT NULL,
          channel_announcements TEXT DEFAULT NULL,
          channel_ticket_category TEXT DEFAULT NULL,
          channel_ticket_logs TEXT DEFAULT NULL,
          channel_ticket_panel TEXT DEFAULT NULL,
          ticket_ping_roles TEXT DEFAULT NULL,
          ticket_required_roles TEXT DEFAULT NULL,
          ticket_welcome_message TEXT DEFAULT NULL,
          enable_firstblood INTEGER DEFAULT 1,
          enable_scoreboard INTEGER DEFAULT 1,
          enable_tickets INTEGER DEFAULT 1,
          enable_realtime INTEGER DEFAULT 1,
          active_event_id TEXT DEFAULT NULL,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          username TEXT DEFAULT NULL,
          subject TEXT NOT NULL,
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
          assigned_to TEXT DEFAULT NULL,
          closed_by TEXT DEFAULT NULL,
          closed_at DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS firstblood_cache (
          guild_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL,
          solver_user_id TEXT DEFAULT NULL,
          solver_username TEXT DEFAULT NULL,
          challenge_title TEXT DEFAULT NULL,
          challenge_category TEXT DEFAULT NULL,
          challenge_points INTEGER DEFAULT NULL,
          notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (guild_id, challenge_id)
        );
        CREATE TABLE IF NOT EXISTS bot_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guild_id TEXT DEFAULT NULL,
          level TEXT DEFAULT 'info',
          event_type TEXT NOT NULL,
          message TEXT NOT NULL,
          metadata TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('[Dashboard DB] Initialized fallback inline schema');
    }
  }
  
  // Always run migrations to ensure columns exist on startup
  runMigrations(database);
}

function runMigrations(database: Database.Database): void {
  try {
    const columns = database.prepare("PRAGMA table_info(guilds)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    
    const migrations = [
      { name: 'channel_ticket_panel', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_ping_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_required_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_welcome_message', type: 'TEXT DEFAULT NULL' },
    ];
    
    for (const m of migrations) {
      if (!colNames.includes(m.name)) {
        database.exec(`ALTER TABLE guilds ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to guilds table`);
      }
    }
  } catch (err) {
    console.error('[DB Migration] Error checking/running migrations:', err);
  }
}
