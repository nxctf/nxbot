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

        CREATE TABLE IF NOT EXISTS supabase_connections (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          supabase_url TEXT NOT NULL,
          supabase_anon_key TEXT NOT NULL,
          supabase_login_email TEXT DEFAULT NULL,
          supabase_login_password TEXT DEFAULT NULL,
          supabase_access_token TEXT DEFAULT NULL,
          supabase_refresh_token TEXT DEFAULT NULL,
          supabase_turnstile_site_key TEXT DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS guilds (
          id TEXT PRIMARY KEY,
          guild_name TEXT NOT NULL,
          supabase_connection_id TEXT REFERENCES supabase_connections(id) ON DELETE SET NULL,
          channel_firstblood TEXT DEFAULT NULL,
          channel_scoreboard TEXT DEFAULT NULL,
          channel_announcements TEXT DEFAULT NULL,
          channel_ticket_category TEXT DEFAULT NULL,
          channel_ticket_logs TEXT DEFAULT NULL,
          channel_ticket_panel TEXT DEFAULT NULL,
          ticket_ping_roles TEXT DEFAULT NULL,
          ticket_required_roles TEXT DEFAULT NULL,
          ticket_welcome_message TEXT DEFAULT NULL,
          scoreboard_message_id TEXT DEFAULT NULL,
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
          closed_by_username TEXT DEFAULT NULL,
          closed_by_avatar TEXT DEFAULT NULL,
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
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          avatar_url TEXT DEFAULT NULL,
          message_content TEXT DEFAULT NULL,
          attachment_filename TEXT DEFAULT NULL,
          attachment_original_name TEXT DEFAULT NULL,
          attachment_size INTEGER DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS bot_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'failed')),
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
    // 1. Create supabase_connections table
    database.exec(`
      CREATE TABLE IF NOT EXISTS supabase_connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        supabase_url TEXT NOT NULL,
        supabase_anon_key TEXT NOT NULL,
        supabase_login_email TEXT DEFAULT NULL,
        supabase_login_password TEXT DEFAULT NULL,
        supabase_access_token TEXT DEFAULT NULL,
        supabase_refresh_token TEXT DEFAULT NULL,
        supabase_turnstile_site_key TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create ticket_messages table
    database.exec(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        avatar_url TEXT DEFAULT NULL,
        message_content TEXT DEFAULT NULL,
        attachment_filename TEXT DEFAULT NULL,
        attachment_original_name TEXT DEFAULT NULL,
        attachment_size INTEGER DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2d. Create bot_actions table if not exists
    database.exec(`
      CREATE TABLE IF NOT EXISTS bot_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add columns to guilds table
    const columns = database.prepare("PRAGMA table_info(guilds)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);

    const migrations = [
      { name: 'channel_ticket_panel', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_ping_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_required_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_welcome_message', type: 'TEXT DEFAULT NULL' },
      { name: 'scoreboard_message_id', type: 'TEXT DEFAULT NULL' },
      { name: 'supabase_access_token', type: 'TEXT DEFAULT NULL' },
      { name: 'supabase_refresh_token', type: 'TEXT DEFAULT NULL' },
      { name: 'supabase_turnstile_site_key', type: 'TEXT DEFAULT NULL' },
      { name: 'guild_id', type: 'TEXT DEFAULT NULL' },
      { name: 'supabase_connection_id', type: 'TEXT DEFAULT NULL' },
    ];

    for (const m of migrations) {
      if (!colNames.includes(m.name)) {
        database.exec(`ALTER TABLE guilds ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to guilds table`);
        if (m.name === 'guild_id') {
          database.exec('UPDATE guilds SET guild_id = id WHERE guild_id IS NULL');
        }
      }
    }

    // 2b. Migrate ticket_messages table columns (for existing DBs)
    const tmCols = database.prepare("PRAGMA table_info(ticket_messages)").all() as { name: string }[];
    const tmColNames = tmCols.map(c => c.name);
    const tmMigrations = [
      { name: 'attachment_filename', type: 'TEXT DEFAULT NULL' },
      { name: 'attachment_original_name', type: 'TEXT DEFAULT NULL' },
      { name: 'attachment_size', type: 'INTEGER DEFAULT NULL' },
    ];
    for (const m of tmMigrations) {
      if (!tmColNames.includes(m.name)) {
        database.exec(`ALTER TABLE ticket_messages ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to ticket_messages table`);
      }
    }

    // 2c. Migrate tickets table columns (for existing DBs)
    const tCols = database.prepare("PRAGMA table_info(tickets)").all() as { name: string }[];
    const tColNames = tCols.map(c => c.name);
    const ticketMigrations = [
      { name: 'closed_by_username', type: 'TEXT DEFAULT NULL' },
      { name: 'closed_by_avatar', type: 'TEXT DEFAULT NULL' },
    ];
    for (const m of ticketMigrations) {
      if (!tColNames.includes(m.name)) {
        database.exec(`ALTER TABLE tickets ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to tickets table`);
      }
    }

    // 3. Migrate existing guild credentials to supabase_connections table
    const guilds = database.prepare('SELECT * FROM guilds WHERE supabase_connection_id IS NULL').all() as any[];
    for (const g of guilds) {
      if (g.supabase_url && g.supabase_anon_key) {
        const connId = `conn_${g.id}`;
        // Insert connection record if not exists
        const exists = database.prepare('SELECT id FROM supabase_connections WHERE id = ?').get(connId);
        if (!exists) {
          database.prepare(`
            INSERT INTO supabase_connections (
              id, name, supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password,
              supabase_access_token, supabase_refresh_token, supabase_turnstile_site_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            connId,
            `${g.guild_name} Supabase`,
            g.supabase_url,
            g.supabase_anon_key,
            g.supabase_login_email || null,
            g.supabase_login_password || null,
            g.supabase_access_token || null,
            g.supabase_refresh_token || null,
            g.supabase_turnstile_site_key || null
          );
          console.log(`[DB Migration] Created supabase_connection record ${connId} for guild ${g.guild_name}`);
        }
        // Link guild to connection
        database.prepare('UPDATE guilds SET supabase_connection_id = ? WHERE id = ?').run(connId, g.id);
        console.log(`[DB Migration] Linked guild ${g.guild_name} to supabase_connection ${connId}`);
      }
    }
  } catch (err) {
    console.error('[DB Migration] Error checking/running migrations:', err);
  }
}
