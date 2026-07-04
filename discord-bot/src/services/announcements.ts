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
            await this.handleNewNotification(guild, payload.new as NotificationPayload);
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
      .setTimestamp(new Date(notification.created_at));

    await discordChannel.send({ embeds: [embed] });

    logEvent(guild.id, 'info', 'announcement_sync', `Synced announcement: "${title}"`);
    console.log(`[Announcements] 📢 Synced announcement: "${title}" (${guild.guild_name})`);
  }
}
