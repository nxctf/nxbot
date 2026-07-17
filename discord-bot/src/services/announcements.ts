import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { supabaseManager } from './supabase-manager';
import { getActiveGuilds, GuildConfig, logEvent } from '../db/local';

/**
 * Announcement / Notification Sync Service
 *
 * Subscribes to Supabase Realtime INSERT events on the `notifications` table
 * for each configured guild. When a new notification is posted on the CTF platform,
 * it automatically posts a formatted announcement to the configured Discord channel.
 */

interface NotificationPayload {
  id: string;
  title?: string;
  content?: string;
  text?: string;
  message?: string;
  created_at: string;
}

export class AnnouncementService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Start listening for announcements/notifications on all active guilds.
   */
  async startAll(): Promise<void> {
    const guilds = getActiveGuilds();

    for (const guild of guilds) {
      if (!guild.channel_announcements) {
        continue;
      }

      if (!supabaseManager.isConnected(guild.id)) {
        console.warn(`[Announcements] Skipping guild ${guild.guild_name}: no Supabase connection`);
        continue;
      }

      this.subscribeGuild(guild);
    }
  }

  /**
   * Subscribe to notifications for a specific guild.
   */
  subscribeGuild(guild: GuildConfig): void {
    if (!guild.channel_announcements) return;

    const channelName = `announcements-${guild.id}`;

    supabaseManager.subscribeChannel(guild.id, channelName, (channel) => {
      return channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          try {
            let notification = payload.new as NotificationPayload;

            // Supabase Realtime may send empty/partial payloads if REPLICA IDENTITY FULL is not set
            if (!notification.content && !notification.text && !notification.message && !notification.title) {
              const supabase = supabaseManager.getClient(guild.id);
              if (!supabase) return;

              if (notification.id) {
                const { data, error } = await supabase.from('notifications').select('*').eq('id', notification.id).single();
                if (error) {
                  if (error.message?.toLowerCase().includes('permission denied')) {
                    console.warn(`[Announcements] Cannot fetch notification details: Supabase anon key lacks SELECT on 'notifications' table. Set REPLICA IDENTITY FULL on the table.`);
                  } else {
                    console.error(`[Announcements] Failed to fetch notification details for ID ${notification.id}:`, error.message);
                  }
                }
                if (!data) return;
                notification = data as NotificationPayload;
              } else {
                const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(1).single();
                if (error) {
                  if (error.message?.toLowerCase().includes('permission denied')) {
                    console.warn(`[Announcements] Cannot fetch latest notification: Supabase anon key lacks SELECT on 'notifications' table. Set REPLICA IDENTITY FULL on the table.`);
                  } else {
                    console.error(`[Announcements] Failed to fetch latest notification:`, error.message);
                  }
                }
                if (!data) return;
                notification = data as NotificationPayload;
              }
            }

            await this.handleNewNotification(guild, notification);
          } catch (err) {
            console.error(`[Announcements] Error handling notification for ${guild.guild_name}:`, err);
            logEvent(guild.id, 'error', 'announcements', `Error handling notification: ${err}`);
          }
        }
      );
    });

    console.log(`[Announcements] Listening on guild: ${guild.guild_name}`);
  }

  /**
   * Handle a new notification solve event.
   */
  private async handleNewNotification(guild: GuildConfig, notification: NotificationPayload): Promise<void> {
    // Post to Discord channel
    const discordChannel = this.client.channels.cache.get(guild.channel_announcements!);
    if (!discordChannel || !(discordChannel instanceof TextChannel)) {
      console.warn(`[Announcements] Channel ${guild.channel_announcements} not found or not text for guild ${guild.guild_name}`);
      return;
    }

    const title = notification.title || '📢 CTF Announcement';
    const content = notification.content || notification.text || notification.message || 'New announcement posted on the platform.';

    const embed = new EmbedBuilder()
      .setColor(0x38BDF8) // Sky blue cyber color
      .setTitle(title)
      .setDescription(content)
      .setFooter({ text: 'NXCTF Announcements' })
      .setTimestamp(notification.created_at && !isNaN(new Date(notification.created_at).getTime()) ? new Date(notification.created_at) : new Date());

    const pingRoleIds = guild.announcement_ping_roles ? guild.announcement_ping_roles.split(',').filter(Boolean) : [];
    const shouldPingEveryone = guild.announcement_ping_everyone === 1;
    const mentionTarget = shouldPingEveryone
      ? '@everyone'
      : pingRoleIds.map((id) => `<@&${id}>`).join(' ');
    const mentionContent = mentionTarget ? `${mentionTarget} New CTF announcement` : '';

    await discordChannel.send({
      content: mentionContent || undefined,
      embeds: [embed],
      allowedMentions: shouldPingEveryone
        ? { parse: ['everyone'] }
        : { roles: pingRoleIds, users: [] },
    });

    logEvent(guild.id, 'info', 'announcement_sync', `Synced announcement: "${title}"`);
    console.log(`[Announcements] 📢 Synced announcement: "${title}" (${guild.guild_name})`);
  }
}
