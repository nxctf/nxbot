export interface GuildConfig {
  id: string;
  guild_name: string;
  supabase_connection_id: string | null;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_login_email?: string | null;
  supabase_login_password?: string | null;
  supabase_turnstile_site_key?: string | null;
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
}

export interface EventItem {
  id: string;
  name: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

export interface DatabaseConnection {
  id: string;
  name: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_login_email?: string | null;
  supabase_login_password?: string | null;
  supabase_access_token?: string | null;
  supabase_refresh_token?: string | null;
}
