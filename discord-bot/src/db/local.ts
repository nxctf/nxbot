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

  const tableExists = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='system_settings'"
  ).get();

  if (!tableExists) {
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      console.log('[DB] Schema initialized from schema.sql');
    } else {
      console.error('[DB] schema.sql not found at', schemaPath);
      throw new Error('schema.sql not found - database cannot be initialized');
    }
  }

  migrateGuildSettings();
}

function migrateGuildSettings(): void {
  const columns = db.prepare('PRAGMA table_info(guilds)').all() as { name: string }[];
  const existing = new Set(columns.map((column) => column.name));
  const migrations = [
    ['firstblood_ping_roles', 'TEXT DEFAULT NULL'],
    ['firstblood_ping_users', 'TEXT DEFAULT NULL'],
    ['firstblood_mention_solver', 'INTEGER DEFAULT 1'],
    ['firstblood_ping_everyone', 'INTEGER DEFAULT 0'],
    ['announcement_ping_roles', 'TEXT DEFAULT NULL'],
    ['announcement_ping_users', 'TEXT DEFAULT NULL'],
    ['announcement_ping_everyone', 'INTEGER DEFAULT 0'],
    ['scoreboard_update_interval_seconds', 'INTEGER DEFAULT 300'],
    ['scoreboard_update_on_solve', 'INTEGER DEFAULT 0'],
  ];

  for (const [column, definition] of migrations) {
    if (!existing.has(column)) {
      db.exec(`ALTER TABLE guilds ADD COLUMN ${column} ${definition}`);
      console.log(`[DB] Added guilds.${column}`);
    }
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
  firstblood_ping_roles: string | null;
  firstblood_ping_users: string | null;
  firstblood_mention_solver: number;
  firstblood_ping_everyone: number;
  announcement_ping_roles: string | null;
  announcement_ping_users: string | null;
  announcement_ping_everyone: number;
  scoreboard_update_interval_seconds: number;
  scoreboard_update_on_solve: number;
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
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id,
           g.firstblood_ping_roles, g.firstblood_ping_users, g.firstblood_mention_solver, g.firstblood_ping_everyone,
           g.announcement_ping_roles, g.announcement_ping_users, g.announcement_ping_everyone,
           g.scoreboard_update_interval_seconds, g.scoreboard_update_on_solve,
           g.enable_firstblood, g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
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
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id,
           g.firstblood_ping_roles, g.firstblood_ping_users, g.firstblood_mention_solver, g.firstblood_ping_everyone,
           g.announcement_ping_roles, g.announcement_ping_users, g.announcement_ping_everyone,
           g.scoreboard_update_interval_seconds, g.scoreboard_update_on_solve,
           g.enable_firstblood, g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
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
           g.ticket_required_roles, g.ticket_welcome_message, g.scoreboard_message_id,
           g.firstblood_ping_roles, g.firstblood_ping_users, g.firstblood_mention_solver, g.firstblood_ping_everyone,
           g.announcement_ping_roles, g.announcement_ping_users, g.announcement_ping_everyone,
           g.scoreboard_update_interval_seconds, g.scoreboard_update_on_solve,
           g.enable_firstblood, g.enable_scoreboard, g.enable_tickets, g.enable_realtime, g.active_event_id, g.is_active, 
           g.created_at, g.updated_at, g.supabase_connection_id, 
           c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password, 
           c.supabase_access_token, c.supabase_refresh_token, c.supabase_turnstile_site_key
    FROM guilds g
    LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
    ORDER BY g.created_at DESC
  `).all() as GuildConfig[];
}

export function upsertGuild(guild: Partial<GuildConfig> & { id: string; guild_name: string }): void {
  const existing = getDb().prepare('SELECT * FROM guilds WHERE id = ?').get(guild.id);
  if (existing) {
    getDb().prepare(`
      UPDATE guilds SET
        guild_id = COALESCE(?, guild_id),
        guild_name = COALESCE(?, guild_name),
        supabase_connection_id = COALESCE(?, supabase_connection_id),
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
      guild.guild_id ?? null, guild.guild_name, guild.supabase_connection_id ?? null,
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
      INSERT INTO guilds (id, guild_id, guild_name, supabase_connection_id,
        channel_firstblood, channel_scoreboard, channel_announcements, channel_ticket_category, channel_ticket_logs,
        enable_firstblood, enable_scoreboard, enable_tickets, enable_realtime, active_event_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guild.id, guild.guild_id || guild.id, guild.guild_name, guild.supabase_connection_id ?? null,
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
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  assigned_to: string | null;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function createTicket(data: { guild_id: string; channel_id: string; user_id: string; username?: string; subject: string }): number {
  if (data.username) {
    upsertDiscordUser(data.user_id, data.username, null);
  }
  const result = getDb().prepare(`
    INSERT INTO tickets (guild_id, channel_id, user_id, subject)
    VALUES (?, ?, ?, ?)
  `).run(data.guild_id, data.channel_id, data.user_id, data.subject);
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
): void {
  if (status === 'closed') {
    getDb().prepare(`
      UPDATE tickets
      SET status = ?, closed_by = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
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

export interface TicketMessage {
  id: number;
  ticket_id: number;
  user_id: string;
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
  // Upsert user cache
  upsertDiscordUser(userId, username, avatarUrl);

  // Insert actual chat message metadata/content
  getDb().prepare(`
    INSERT INTO ticket_messages (ticket_id, user_id, message_content, attachment_filename, attachment_original_name, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(ticketId, userId, content ?? '', attachmentFilename ?? null, attachmentOriginalName ?? null, attachmentSize ?? null);
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

export function upsertDiscordUser(userId: string, username: string, avatarUrl: string | null): void {
  getDb().prepare(`
    INSERT INTO discord_users (user_id, username, avatar_url, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      username = excluded.username,
      avatar_url = COALESCE(excluded.avatar_url, avatar_url),
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, username, avatarUrl);
}
