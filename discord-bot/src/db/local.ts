import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Local SQLite database access layer.
 * Shared between discord-bot and web-dashboard via Docker volume.
 */

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/nxbot.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize schema if tables don't exist
    initSchema();
  }
  return db;
}

function initSchema(): void {
  const schemaPath = path.join(__dirname, '../../../db/schema.sql');

  // Check if system_settings table exists (indicator of initialized DB)
  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'"
  ).get();

  if (!tableExists) {
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      console.log('[DB] Schema initialized from schema.sql');
    } else {
      // Inline fallback schema for containerized environment
      console.warn('[DB] schema.sql not found, using inline schema');
      createInlineSchema();
    }
  }
  // Always run migrations
  runMigrations();
}

function createInlineSchema(): void {
  db.exec(`
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
}

function runMigrations(): void {
  try {
    // 1. Create supabase_connections table
    db.exec(`
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
    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        avatar_url TEXT DEFAULT NULL,
        message_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Add columns to guilds table
    const columns = db.prepare("PRAGMA table_info(guilds)").all() as { name: string }[];
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
        db.exec(`ALTER TABLE guilds ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to guilds table`);
        if (m.name === 'guild_id') {
          db.exec('UPDATE guilds SET guild_id = id WHERE guild_id IS NULL');
        }
      }
    }

    // 2b. Migrate ticket_messages table columns
    const tmCols = db.prepare("PRAGMA table_info(ticket_messages)").all() as { name: string }[];
    const tmColNames = tmCols.map(c => c.name);
    const tmMigrations = [
      { name: 'attachment_filename', type: 'TEXT DEFAULT NULL' },
      { name: 'attachment_original_name', type: 'TEXT DEFAULT NULL' },
      { name: 'attachment_size', type: 'INTEGER DEFAULT NULL' },
    ];
    for (const m of tmMigrations) {
      if (!tmColNames.includes(m.name)) {
        db.exec(`ALTER TABLE ticket_messages ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to ticket_messages table`);
      }
    }

    // 2c. Migrate tickets table columns
    const tCols = db.prepare("PRAGMA table_info(tickets)").all() as { name: string }[];
    const tColNames = tCols.map(c => c.name);
    const ticketMigrations = [
      { name: 'closed_by_username', type: 'TEXT DEFAULT NULL' },
      { name: 'closed_by_avatar', type: 'TEXT DEFAULT NULL' },
    ];
    for (const m of ticketMigrations) {
      if (!tColNames.includes(m.name)) {
        db.exec(`ALTER TABLE tickets ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to tickets table`);
      }
    }

    // 2d. Create bot_actions table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS bot_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'failed')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Migrate existing guild credentials to supabase_connections table
    const guilds = db.prepare('SELECT * FROM guilds WHERE supabase_connection_id IS NULL').all() as any[];
    for (const g of guilds) {
      if (g.supabase_url && g.supabase_anon_key) {
        const connId = `conn_${g.id}`;
        // Insert connection record if not exists
        const exists = db.prepare('SELECT id FROM supabase_connections WHERE id = ?').get(connId);
        if (!exists) {
          db.prepare(`
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
        db.prepare('UPDATE guilds SET supabase_connection_id = ? WHERE id = ?').run(connId, g.id);
        console.log(`[DB Migration] Linked guild ${g.guild_name} to supabase_connection ${connId}`);
      }
    }
  } catch (err) {
    console.error('[DB Migration] Error:', err);
  }
}

// ---- System Settings ----

export function getSetting(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM system_settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb().prepare(
    'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).run(key, value);
}

export function isSetup(): boolean {
  return getSetting('is_setup') === 'true';
}

// ---- Guild Operations ----

export interface GuildConfig {
  id: string;
  guild_id: string;
  guild_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_connection_id: string | null;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  supabase_access_token: string | null;
  supabase_refresh_token: string | null;
  supabase_turnstile_site_key: string | null;
  channel_firstblood: string | null;
  channel_scoreboard: string | null;
  channel_announcements: string | null;
  channel_ticket_category: string | null;
  channel_ticket_logs: string | null;
  channel_ticket_panel: string | null;
  ticket_ping_roles: string | null;
  ticket_required_roles: string | null;
  ticket_welcome_message: string | null;
  scoreboard_message_id: string | null;
  enable_firstblood: number;
  enable_scoreboard: number;
  enable_tickets: number;
  enable_realtime: number;
  active_event_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function getActiveGuilds(): GuildConfig[] {
  return getDb().prepare(`
    SELECT g.id, g.guild_name, g.channel_firstblood, g.channel_scoreboard, g.channel_announcements, 
           g.channel_ticket_category, g.channel_ticket_logs, g.channel_ticket_panel, g.ticket_ping_roles, 
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id, g.enable_firstblood, 
           g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
           g.created_at, g.updated_at, g.supabase_connection_id, 
           c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password, 
           c.supabase_access_token, c.supabase_refresh_token, c.supabase_turnstile_site_key
    FROM guilds g
    LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
    WHERE g.is_active = 1
  `).all() as GuildConfig[];
}

export function getGuild(guildId: string): GuildConfig | null {
  return (getDb().prepare(`
    SELECT g.id, g.guild_name, g.channel_firstblood, g.channel_scoreboard, g.channel_announcements, 
           g.channel_ticket_category, g.channel_ticket_logs, g.channel_ticket_panel, g.ticket_ping_roles, 
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id, g.enable_firstblood, 
           g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
           g.created_at, g.updated_at, g.supabase_connection_id, 
           c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password, 
           c.supabase_access_token, c.supabase_refresh_token, c.supabase_turnstile_site_key
    FROM guilds g
    LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
    WHERE g.id = ? AND g.is_active = 1
  `).get(guildId) as GuildConfig) ?? null;
}

export function getAllGuilds(): GuildConfig[] {
  return getDb().prepare(`
    SELECT g.id, g.guild_name, g.channel_firstblood, g.channel_scoreboard, g.channel_announcements, 
           g.channel_ticket_category, g.channel_ticket_logs, g.channel_ticket_panel, g.ticket_ping_roles, 
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id, g.enable_firstblood, 
           g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
           g.created_at, g.updated_at, g.supabase_connection_id, 
           c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password, 
           c.supabase_access_token, c.supabase_refresh_token, c.supabase_turnstile_site_key
    FROM guilds g
    LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
    ORDER BY g.created_at DESC
  `).all() as GuildConfig[];
}

export function upsertGuild(guild: Partial<GuildConfig> & { id: string; guild_name: string; supabase_url: string; supabase_anon_key: string }): void {
  const existing = getDb().prepare('SELECT * FROM guilds WHERE id = ?').get(guild.id);
  if (existing) {
    getDb().prepare(`
      UPDATE guilds SET
        guild_id = COALESCE(?, guild_id),
        guild_name = COALESCE(?, guild_name),
        supabase_url = COALESCE(?, supabase_url),
        supabase_anon_key = COALESCE(?, supabase_anon_key),
        supabase_login_email = COALESCE(?, supabase_login_email),
        supabase_login_password = COALESCE(?, supabase_login_password),
        supabase_access_token = COALESCE(?, supabase_access_token),
        supabase_refresh_token = COALESCE(?, supabase_refresh_token),
        supabase_turnstile_site_key = COALESCE(?, supabase_turnstile_site_key),
        channel_firstblood = COALESCE(?, channel_firstblood),
        channel_scoreboard = COALESCE(?, channel_scoreboard),
        channel_announcements = COALESCE(?, channel_announcements),
        channel_ticket_category = COALESCE(?, channel_ticket_category),
        channel_ticket_logs = COALESCE(?, channel_ticket_logs),
        enable_firstblood = COALESCE(?, enable_firstblood),
        enable_scoreboard = COALESCE(?, enable_scoreboard),
        enable_tickets = COALESCE(?, enable_tickets),
        enable_realtime = COALESCE(?, enable_realtime),
        active_event_id = ?,
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      guild.guild_id ?? null, guild.guild_name, guild.supabase_url, guild.supabase_anon_key,
      guild.supabase_login_email ?? null, guild.supabase_login_password ?? null,
      guild.supabase_access_token ?? null, guild.supabase_refresh_token ?? null,
      guild.supabase_turnstile_site_key ?? null,
      guild.channel_firstblood ?? null, guild.channel_scoreboard ?? null,
      guild.channel_announcements ?? null, guild.channel_ticket_category ?? null,
      guild.channel_ticket_logs ?? null,
      guild.enable_firstblood ?? null, guild.enable_scoreboard ?? null,
      guild.enable_tickets ?? null, guild.enable_realtime ?? null,
      guild.active_event_id ?? null, guild.is_active ?? null,
      guild.id
    );
  } else {
    getDb().prepare(`
      INSERT INTO guilds (id, guild_id, guild_name, supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password,
        supabase_access_token, supabase_refresh_token, supabase_turnstile_site_key,
        channel_firstblood, channel_scoreboard, channel_announcements, channel_ticket_category, channel_ticket_logs,
        enable_firstblood, enable_scoreboard, enable_tickets, enable_realtime, active_event_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guild.id, guild.guild_id || guild.id, guild.guild_name, guild.supabase_url, guild.supabase_anon_key,
      guild.supabase_login_email ?? null, guild.supabase_login_password ?? null,
      guild.supabase_access_token ?? null, guild.supabase_refresh_token ?? null,
      guild.supabase_turnstile_site_key ?? null,
      guild.channel_firstblood ?? null, guild.channel_scoreboard ?? null,
      guild.channel_announcements ?? null, guild.channel_ticket_category ?? null,
      guild.channel_ticket_logs ?? null,
      guild.enable_firstblood ?? 1, guild.enable_scoreboard ?? 1,
      guild.enable_tickets ?? 1, guild.enable_realtime ?? 1,
      guild.active_event_id ?? null, guild.is_active ?? 1
    );
  }
}

export function updateGuildScoreboardMessageId(guildId: string, messageId: string | null): void {
  getDb().prepare('UPDATE guilds SET scoreboard_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(messageId, guildId);
}

export function updateGuildSupabaseTokens(guildId: string, accessToken: string | null, refreshToken: string | null): void {
  const row = getDb().prepare('SELECT supabase_connection_id FROM guilds WHERE id = ?').get(guildId) as { supabase_connection_id: string | null } | undefined;
  if (row?.supabase_connection_id) {
    getDb().prepare('UPDATE supabase_connections SET supabase_access_token = ?, supabase_refresh_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(accessToken, refreshToken, row.supabase_connection_id);
    console.log(`[Local DB] Updated Supabase tokens in supabase_connections for ID: ${row.supabase_connection_id}`);
  } else {
    getDb().prepare('UPDATE guilds SET supabase_access_token = ?, supabase_refresh_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(accessToken, refreshToken, guildId);
  }
}


export function deleteGuild(guildId: string): void {
  getDb().prepare('DELETE FROM guilds WHERE id = ?').run(guildId);
}

// ---- First Blood Cache ----

export interface FirstBloodEntry {
  guild_id: string;
  challenge_id: string;
  solver_user_id: string | null;
  solver_username: string | null;
  challenge_title: string | null;
  challenge_category: string | null;
  challenge_points: number | null;
  notified_at: string;
}

export function hasFirstBlood(guildId: string, challengeId: string): boolean {
  const row = getDb().prepare(
    'SELECT 1 FROM firstblood_cache WHERE guild_id = ? AND challenge_id = ?'
  ).get(guildId, challengeId);
  return !!row;
}

export function insertFirstBlood(entry: Omit<FirstBloodEntry, 'notified_at'>): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO firstblood_cache
    (guild_id, challenge_id, solver_user_id, solver_username, challenge_title, challenge_category, challenge_points)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.guild_id, entry.challenge_id, entry.solver_user_id,
    entry.solver_username, entry.challenge_title, entry.challenge_category, entry.challenge_points
  );
}

export function getFirstBloods(guildId: string, limit = 10): FirstBloodEntry[] {
  return getDb().prepare(
    'SELECT * FROM firstblood_cache WHERE guild_id = ? ORDER BY notified_at DESC LIMIT ?'
  ).all(guildId, limit) as FirstBloodEntry[];
}

export function clearFirstBloodCache(guildId: string): void {
  getDb().prepare('DELETE FROM firstblood_cache WHERE guild_id = ?').run(guildId);
}

// ---- Tickets ----

export interface Ticket {
  id: number;
  guild_id: string;
  channel_id: string;
  user_id: string;
  username: string | null;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to: string | null;
  closed_by: string | null;
  closed_by_username: string | null;
  closed_by_avatar: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createTicket(data: { guild_id: string; channel_id: string; user_id: string; username?: string; subject: string }): number {
  const result = getDb().prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, username, subject)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.guild_id, data.channel_id, data.user_id, data.username ?? null, data.subject);
  return result.lastInsertRowid as number;
}

export function getTicket(ticketId: number): Ticket | null {
  return (getDb().prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as Ticket) ?? null;
}

export function getTicketByChannel(channelId: string): Ticket | null {
  return (getDb().prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId) as Ticket) ?? null;
}

export function getTicketsByGuild(guildId: string, status?: string): Ticket[] {
  if (status) {
    return getDb().prepare('SELECT * FROM tickets WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, status) as Ticket[];
  }
  return getDb().prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC').all(guildId) as Ticket[];
}

export function getTicketsByUser(guildId: string, userId: string): Ticket[] {
  return getDb().prepare(
    'SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC'
  ).all(guildId, userId) as Ticket[];
}

export function updateTicketStatus(
  ticketId: number,
  status: string,
  closedBy?: string,
  closedByUsername?: string | null,
  closedByAvatar?: string | null,
): void {
  if (status === 'closed') {
    getDb().prepare(`
      UPDATE tickets
      SET status = ?, closed_by = ?, closed_by_username = ?, closed_by_avatar = ?,
          closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, closedBy ?? null, closedByUsername ?? null, closedByAvatar ?? null, ticketId);
  } else {
    getDb().prepare(`
      UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, ticketId);
  }
}

export function assignTicket(ticketId: number, assignedTo: string): void {
  getDb().prepare(`
    UPDATE tickets SET assigned_to = ?, status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(assignedTo, ticketId);
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  message_content: string | null;
  attachment_filename: string | null;
  attachment_original_name: string | null;
  attachment_size: number | null;
  created_at: string;
}

export function saveTicketMessage(
  ticketId: number,
  userId: string,
  username: string,
  avatarUrl: string | null,
  content: string | null,
  attachmentFilename?: string | null,
  attachmentOriginalName?: string | null,
  attachmentSize?: number | null,
): void {
  getDb().prepare(`
    INSERT INTO ticket_messages (ticket_id, user_id, username, avatar_url, message_content, attachment_filename, attachment_original_name, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ticketId, userId, username, avatarUrl, content ?? '', attachmentFilename ?? null, attachmentOriginalName ?? null, attachmentSize ?? null);
}

// ---- Logging ----

export function logEvent(guildId: string | null, level: string, eventType: string, message: string, metadata?: object): void {
  getDb().prepare(`
    INSERT INTO bot_logs (guild_id, level, event_type, message, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, level, eventType, message, metadata ? JSON.stringify(metadata) : null);
}

// ---- Cleanup ----

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
// ---- Bot Actions Queue ----

export interface BotAction {
  id: number;
  action_type: string;
  payload: string;
  status: 'pending' | 'done' | 'failed';
  created_at: string;
}

export function enqueueBotAction(actionType: string, payload: object): void {
  getDb().prepare(`
    INSERT INTO bot_actions (action_type, payload) VALUES (?, ?)
  `).run(actionType, JSON.stringify(payload));
}

export function getPendingBotActions(): BotAction[] {
  return getDb().prepare(`
    SELECT * FROM bot_actions WHERE status = 'pending' ORDER BY created_at ASC LIMIT 20
  `).all() as BotAction[];
}

export function completeBotAction(id: number, success = true): void {
  getDb().prepare(`
    UPDATE bot_actions SET status = ? WHERE id = ?
  `).run(success ? 'done' : 'failed', id);
}
