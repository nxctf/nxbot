-- =============================================
-- Table: system_settings
-- Stores setup state, admin credentials, and global config
-- =============================================
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: supabase_connections
-- Centrally managed Supabase connection configurations
-- =============================================
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

-- =============================================
-- Table: guilds
-- Discord server configurations linked to a Supabase connection
-- =============================================
CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,                        -- Discord Guild ID (snowflake)
    guild_name TEXT NOT NULL,
    supabase_connection_id TEXT REFERENCES supabase_connections(id) ON DELETE SET NULL,

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
    firstblood_ping_roles TEXT DEFAULT NULL,     -- Comma-separated role IDs to ping on first blood
    firstblood_ping_users TEXT DEFAULT NULL,     -- Comma-separated user IDs to ping on first blood
    firstblood_mention_solver INTEGER DEFAULT 1, -- Try mentioning solver from NXCTF social data
    announcement_ping_roles TEXT DEFAULT NULL,   -- Comma-separated role IDs to ping on announcements
    announcement_ping_users TEXT DEFAULT NULL,   -- Comma-separated user IDs to ping on announcements
    scoreboard_update_interval_seconds INTEGER DEFAULT 300,
    scoreboard_update_on_solve INTEGER DEFAULT 0,

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
    subject TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'closed')),
    assigned_to TEXT DEFAULT NULL,              -- Admin/staff Discord user ID (retained in schema but hidden in UI)
    closed_by TEXT DEFAULT NULL,                -- Who closed the ticket
    closed_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets(channel_id);

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
-- Table: ticket_messages
-- Chat logs / transcript for support tickets
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    message_content TEXT DEFAULT NULL,
    attachment_filename TEXT DEFAULT NULL,
    attachment_original_name TEXT DEFAULT NULL,
    attachment_size INTEGER DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

-- =============================================
-- Table: discord_users
-- Cache for Discord users, usernames, and avatars
-- =============================================
CREATE TABLE IF NOT EXISTS discord_users (
    user_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: bot_actions
-- Actions queued by web dashboard to be executed by the bot
-- =============================================
CREATE TABLE IF NOT EXISTS bot_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'failed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_actions_status ON bot_actions(status);

-- =============================================
-- Initial seed: mark system as not yet set up
-- =============================================
INSERT OR IGNORE INTO system_settings (key, value) VALUES ('is_setup', 'false');
