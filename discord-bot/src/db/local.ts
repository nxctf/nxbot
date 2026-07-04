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
}

function runMigrations(): void {
  try {
    const columns = db.prepare("PRAGMA table_info(guilds)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    const migrations = [
      { name: 'channel_ticket_panel', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_ping_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_required_roles', type: 'TEXT DEFAULT NULL' },
      { name: 'ticket_welcome_message', type: 'TEXT DEFAULT NULL' },
    ];
    for (const m of migrations) {
      if (!colNames.includes(m.name)) {
        db.exec(`ALTER TABLE guilds ADD COLUMN ${m.name} ${m.type}`);
        console.log(`[DB Migration] Added column ${m.name} to guilds table`);
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
  guild_name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email: string | null;
  supabase_login_password: string | null;
  channel_firstblood: string | null;
  channel_scoreboard: string | null;
  channel_announcements: string | null;
  channel_ticket_category: string | null;
  channel_ticket_logs: string | null;
  channel_ticket_panel: string | null;
  ticket_ping_roles: string | null;
  ticket_required_roles: string | null;
  ticket_welcome_message: string | null;
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
  return getDb().prepare('SELECT * FROM guilds WHERE is_active = 1').all() as GuildConfig[];
}

export function getGuild(guildId: string): GuildConfig | null {
  return (getDb().prepare('SELECT * FROM guilds WHERE id = ?').get(guildId) as GuildConfig) ?? null;
}

export function getAllGuilds(): GuildConfig[] {
  return getDb().prepare('SELECT * FROM guilds ORDER BY created_at DESC').all() as GuildConfig[];
}

export function upsertGuild(guild: Partial<GuildConfig> & { id: string; guild_name: string; supabase_url: string; supabase_anon_key: string }): void {
  const existing = getGuild(guild.id);
  if (existing) {
    getDb().prepare(`
      UPDATE guilds SET
        guild_name = COALESCE(?, guild_name),
        supabase_url = COALESCE(?, supabase_url),
        supabase_anon_key = COALESCE(?, supabase_anon_key),
        supabase_login_email = COALESCE(?, supabase_login_email),
        supabase_login_password = COALESCE(?, supabase_login_password),
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
      guild.guild_name, guild.supabase_url, guild.supabase_anon_key,
      guild.supabase_login_email ?? null, guild.supabase_login_password ?? null,
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
      INSERT INTO guilds (id, guild_name, supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password,
        channel_firstblood, channel_scoreboard, channel_announcements, channel_ticket_category, channel_ticket_logs,
        enable_firstblood, enable_scoreboard, enable_tickets, enable_realtime, active_event_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guild.id, guild.guild_name, guild.supabase_url, guild.supabase_anon_key,
      guild.supabase_login_email ?? null, guild.supabase_login_password ?? null,
      guild.channel_firstblood ?? null, guild.channel_scoreboard ?? null,
      guild.channel_announcements ?? null, guild.channel_ticket_category ?? null,
      guild.channel_ticket_logs ?? null,
      guild.enable_firstblood ?? 1, guild.enable_scoreboard ?? 1,
      guild.enable_tickets ?? 1, guild.enable_realtime ?? 1,
      guild.active_event_id ?? null, guild.is_active ?? 1
    );
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

export function updateTicketStatus(ticketId: number, status: string, closedBy?: string): void {
  if (status === 'closed') {
    getDb().prepare(`
      UPDATE tickets SET status = ?, closed_by = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, closedBy ?? null, ticketId);
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
