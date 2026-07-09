import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getActiveGuilds, getGuild, GuildConfig, updateGuildSupabaseTokens } from '../db/local';

/**
 * Manages multiple Supabase client connections — one per guild.
 * Each guild has its own Supabase URL and anon key (read-only).
 */

interface GuildSupabaseConnection {
  client: SupabaseClient;
  channels: RealtimeChannel[];
  config: GuildConfig;
  unsubscribeAuthListener?: () => void;
}

class SupabaseManager {
  private connections: Map<string, GuildSupabaseConnection> = new Map();

  /**
   * Initialize connections for all active guilds from the database.
   */
  async initAll(): Promise<void> {
    const guilds = getActiveGuilds();
    console.log(`[Supabase] Initializing ${guilds.length} guild connection(s)...`);

    for (const guild of guilds) {
      try {
        await this.connect(guild);
      } catch (err) {
        console.error(`[Supabase] Failed to connect guild ${guild.id} (${guild.guild_name}):`, err);
      }
    }
  }

  /**
   * Create a Supabase client for a specific guild.
   */
  async connect(guild: GuildConfig): Promise<SupabaseClient> {
    // Disconnect existing connection if any
    if (this.connections.has(guild.id)) {
      await this.disconnect(guild.id);
    }

    const client = createClient(guild.supabase_url, guild.supabase_anon_key, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Authenticate for elevated access
    if (guild.supabase_access_token && guild.supabase_refresh_token) {
      try {
        const { error } = await client.auth.setSession({
          access_token: guild.supabase_access_token,
          refresh_token: guild.supabase_refresh_token,
        });
        if (error) {
          console.warn(`[Supabase] Failed to restore session from saved tokens for ${guild.guild_name}: ${error.message}. Trying password fallback...`);
          if (guild.supabase_login_email && guild.supabase_login_password) {
            const { error: fallbackError } = await client.auth.signInWithPassword({
              email: guild.supabase_login_email,
              password: guild.supabase_login_password,
            });
            if (fallbackError) {
              if (fallbackError.message?.toLowerCase().includes('captcha')) {
                console.warn(`[Supabase] Password fallback failed for ${guild.guild_name}: CAPTCHA protection is enabled in your Supabase project. Disable it at Supabase Dashboard > Auth > Settings > Security > CAPTCHA protection, or re-authenticate via web dashboard. (falling back to anon)`);
              } else {
                console.warn(`[Supabase] Password fallback failed for ${guild.guild_name}: ${fallbackError.message} (falling back to anon)`);
              }
            } else {
              console.log(`[Supabase] Authenticated via password fallback for ${guild.guild_name}`);
            }
          }
        } else {
          console.log(`[Supabase] Authenticated via saved session tokens for ${guild.guild_name}`);
        }
      } catch (err) {
        console.warn(`[Supabase] Session restore error for ${guild.guild_name}:`, err);
      }
    } else if (guild.supabase_login_email && guild.supabase_login_password) {
      try {
        const { error } = await client.auth.signInWithPassword({
          email: guild.supabase_login_email,
          password: guild.supabase_login_password,
        });
        if (error) {
          if (error.message?.toLowerCase().includes('captcha')) {
            console.warn(`[Supabase] Auth failed for guild ${guild.guild_name}: CAPTCHA protection is enabled in your Supabase project. Disable it at Supabase Dashboard > Auth > Settings > Security > CAPTCHA protection, or re-authenticate via web dashboard. (falling back to anon)`);
          } else {
            console.warn(`[Supabase] Auth failed for guild ${guild.guild_name}: ${error.message} (falling back to anon)`);
          }
        } else {
          console.log(`[Supabase] Authenticated via password for ${guild.guild_name}`);
        }
      } catch (err) {
        console.warn(`[Supabase] Auth error for guild ${guild.guild_name}:`, err);
      }
    }

    // Set up auth state change listener to auto-refresh session tokens in SQLite DB
    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (session?.access_token && session?.refresh_token) {
        console.log(`[Supabase] Auth event "${event}" for ${guild.guild_name} - updating session tokens in DB.`);
        updateGuildSupabaseTokens(guild.id, session.access_token, session.refresh_token);
        // Keep in-memory config in sync to prevent false reload triggers
        const conn = this.connections.get(guild.id);
        if (conn) {
          conn.config.supabase_access_token = session.access_token;
          conn.config.supabase_refresh_token = session.refresh_token;
        }
      }
    });

    this.connections.set(guild.id, {
      client,
      channels: [],
      config: guild,
      unsubscribeAuthListener: () => {
        authListener.subscription.unsubscribe();
      }
    });

    console.log(`[Supabase] Connected: ${guild.guild_name} (${guild.id})`);
    return client;
  }

  /**
   * Get the Supabase client for a specific guild.
   */
  getClient(guildId: string): SupabaseClient | null {
    return this.connections.get(guildId)?.client ?? null;
  }

  /**
   * Get the config for a specific guild connection.
   */
  getConfig(guildId: string): GuildConfig | null {
    return this.connections.get(guildId)?.config ?? null;
  }

  /**
   * Check if a guild has an active connection.
   */
  isConnected(guildId: string): boolean {
    return this.connections.has(guildId);
  }

  /**
   * Subscribe to a realtime channel for a guild.
   * The caller provides the channel setup callback.
   */
  subscribeChannel(guildId: string, channelName: string, setup: (channel: RealtimeChannel) => RealtimeChannel): RealtimeChannel | null {
    const conn = this.connections.get(guildId);
    if (!conn) return null;

    const channel = conn.client.channel(channelName);
    const configuredChannel = setup(channel);
    configuredChannel.subscribe((status) => {
      console.log(`[Supabase] Realtime ${channelName} for ${conn.config.guild_name}: ${status}`);
    });

    conn.channels.push(configuredChannel);
    return configuredChannel;
  }

  /**
   * Disconnect a specific guild.
   */
  async disconnect(guildId: string): Promise<void> {
    const conn = this.connections.get(guildId);
    if (!conn) return;

    // Unsubscribe all channels
    for (const channel of conn.channels) {
      try {
        await conn.client.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    }

    if (conn.unsubscribeAuthListener) {
      try {
        conn.unsubscribeAuthListener();
      } catch (err) {
        // ignore cleanup errors
      }
    }

    this.connections.delete(guildId);
    console.log(`[Supabase] Disconnected: ${guildId}`);
  }

  /**
   * Disconnect all guilds.
   */
  async disconnectAll(): Promise<void> {
    for (const guildId of this.connections.keys()) {
      await this.disconnect(guildId);
    }
  }

  /**
   * Reload connection for a guild (e.g., after config change).
   */
  async reload(guild: GuildConfig): Promise<void> {
    await this.disconnect(guild.id);
    await this.connect(guild);
  }

  /**
   * Sync the in-memory stored config with the latest DB state.
   * Prevents stale config from triggering false reloads after token refresh.
   */
  async syncConfig(guildId: string): Promise<void> {
    const freshGuild = getGuild(guildId);
    if (freshGuild) {
      const conn = this.connections.get(guildId);
      if (conn) {
        conn.config = freshGuild;
      }
    }
  }

  /**
   * Get all connected guild IDs.
   */
  getConnectedGuilds(): string[] {
    return [...this.connections.keys()];
  }

  /**
   * Get connection count.
   */
  get connectionCount(): number {
    return this.connections.size;
  }
}

// Singleton instance
export const supabaseManager = new SupabaseManager();
export default supabaseManager;
