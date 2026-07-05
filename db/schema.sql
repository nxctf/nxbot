-- =============================================
-- NXBot Local Database Schema (SQLite)
-- =============================================
-- Version: 1.0.0
-- Description: Local database for multi-server Discord CTF bot platform
-- All Supabase credentials are stored here, NOT in .env

-- =============================================
-- Table: system_settings
-- Stores setup state, admin credentials, and global config
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default keys to be inserted on first setup:
-- 'is_setup'             -> 'false' | 'true'
-- 'admin_username'       -> plaintext username
-- 'admin_password_hash'  -> bcrypt hash
-- 'jwt_secret'           -> random hex string for JWT signing

-- =============================================
-- Table: guilds
-- Discord server configurations with Supabase credentials
-- =============================================
CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,                        -- Discord Guild ID (snowflake)
    guild_name TEXT NOT NULL,
    supabase_url TEXT NOT NULL,                 -- Per-server Supabase URL
    supabase_anon_key TEXT NOT NULL,            -- Per-server Supabase Anon Key
    supabase_login_email TEXT DEFAULT NULL,      -- Optional: Supabase auth email
    supabase_login_password TEXT DEFAULT NULL,   -- Optional: Supabase auth password
    supabase_access_token TEXT DEFAULT NULL,     -- Optional: Cached access token
    supabase_refresh_token TEXT DEFAULT NULL,    -- Optional: Cached refresh token
    supabase_turnstile_site_key TEXT DEFAULT NULL, -- Optional: Per-server Turnstile site key

    -- Channel configurations (Discord Channel/Category IDs)
    channel_firstblood TEXT DEFAULT NULL,        -- Channel for first blood notifications
    channel_scoreboard TEXT DEFAULT NULL,        -- Channel for live scoreboard
    channel_announcements TEXT DEFAULT NULL,     -- Channel for CTF announcements
    channel_ticket_category TEXT DEFAULT NULL,   -- Category for ticket channels
    channel_ticket_logs TEXT DEFAULT NULL,       -- Channel for ticket activity logs
    channel_ticket_panel TEXT DEFAULT NULL,      -- Channel for ticket creation panel
    ticket_ping_roles TEXT DEFAULT NULL,         -- Comma-separated list of Role IDs to ping
    ticket_required_roles TEXT DEFAULT NULL,     -- Comma-separated list of Role IDs required to open a ticket
    ticket_welcome_message TEXT DEFAULT NULL,    -- Custom welcome message inside ticket channel
    scoreboard_message_id TEXT DEFAULT NULL,     -- Message ID of the deployed live scoreboard embed


    -- Feature toggles
    enable_firstblood INTEGER DEFAULT 1,        -- SQLite uses INTEGER for boolean
    enable_scoreboard INTEGER DEFAULT 1,
    enable_tickets INTEGER DEFAULT 1,
    enable_realtime INTEGER DEFAULT 1,

    -- Event tracking
    active_event_id TEXT DEFAULT NULL,           -- Currently tracked NXCTF event UUID

    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: tickets
-- Support ticket system (local, not in Supabase)
-- =============================================
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,                   -- Created ticket channel ID
    user_id TEXT NOT NULL,                      -- Discord user who opened ticket
    username TEXT DEFAULT NULL,                 -- Discord username (cached)
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
    assigned_to TEXT DEFAULT NULL,              -- Admin/staff Discord user ID
    closed_by TEXT DEFAULT NULL,                -- Who closed the ticket
    closed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

-- =============================================
-- Table: firstblood_cache
-- Tracks which challenges already had first blood notifications sent
-- Prevents duplicate notifications on bot restart or reconnect
-- =============================================
CREATE TABLE IF NOT EXISTS firstblood_cache (
    guild_id TEXT NOT NULL,
    challenge_id TEXT NOT NULL,                 -- UUID from Supabase challenges table
    solver_user_id TEXT DEFAULT NULL,           -- Supabase user UUID who solved first
    solver_username TEXT DEFAULT NULL,           -- Username cached for display
    challenge_title TEXT DEFAULT NULL,           -- Challenge title cached
    challenge_category TEXT DEFAULT NULL,        -- Challenge category cached
    challenge_points INTEGER DEFAULT NULL,       -- Points at time of solve
    notified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_firstblood_guild ON firstblood_cache(guild_id);

-- =============================================
-- Table: bot_logs
-- Activity and error logging
-- =============================================
CREATE TABLE IF NOT EXISTS bot_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT DEFAULT NULL,
    level TEXT DEFAULT 'info' CHECK(level IN ('debug', 'info', 'warn', 'error')),
    event_type TEXT NOT NULL,                   -- e.g., 'firstblood', 'ticket', 'connection', 'error'
    message TEXT NOT NULL,
    metadata TEXT DEFAULT NULL,                 -- JSON string for extra data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_guild ON bot_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON bot_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created ON bot_logs(created_at);

-- =============================================
-- Initial seed: mark system as not yet set up
-- =============================================
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('is_setup', 'false');

-- =============================================
-- Table: ticket_messages
-- Chat logs / transcript for support tickets
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    message_content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);
