import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { supabaseManager } from './supabase-manager';
import { getGuild, getActiveGuilds, updateGuildScoreboardMessageId } from '../db/local';

/**
 * Scoreboard Service
 * 
 * Handles fetching live leaderboard data from Supabase CTF schema via RPC
 * and updates the corresponding deployed Discord live scoreboard embed.
 */
export class ScoreboardService {
  private client: Client;
  private lastPeriodicUpdateAt: Map<string, number> = new Map();
  private solveUpdateTimers: Map<string, NodeJS.Timeout> = new Map();
  private solveUpdateQueuedAt: Map<string, number> = new Map();

  private static readonly DEFAULT_UPDATE_INTERVAL_SECONDS = 600;
  private static readonly MIN_UPDATE_INTERVAL_SECONDS = 600;
  private static readonly SOLVE_UPDATE_DEBOUNCE_MS = 60000;

  constructor(client: Client) {
    this.client = client;
  }

  private getUpdateIntervalMs(guild: { scoreboard_update_interval_seconds?: number | null }): number {
    const configuredSeconds = Number(guild.scoreboard_update_interval_seconds || ScoreboardService.DEFAULT_UPDATE_INTERVAL_SECONDS);
    const safeSeconds = Math.max(ScoreboardService.MIN_UPDATE_INTERVAL_SECONDS, configuredSeconds);
    return safeSeconds * 1000;
  }

  /**
   * Fetch latest leaderboard data and update the live scoreboard embed for a guild.
   */
  async updateScoreboard(guildId: string): Promise<void> {
    const guild = getGuild(guildId);
    if (!guild) return;

    // Check if live scoreboard is enabled, channel is set, and a scoreboard message is already deployed
    if (!guild.enable_scoreboard || !guild.channel_scoreboard || !guild.scoreboard_message_id) {
      return;
    }

    const supabase = supabaseManager.getClient(guildId);
    if (!supabase) {
      console.warn(`[Scoreboard] Skipping update for ${guild.guild_name}: Supabase client not connected.`);
      return;
    }

    try {
      // 1. Fetch leaderboard data from Supabase RPC function
      const { data: leaderboard, error: rpcError } = await supabase.rpc('get_leaderboard', {
        limit_rows: 15,
        offset_rows: 0,
        p_event_id: guild.active_event_id || null,
        p_event_mode: guild.active_event_id ? 'equals' : 'any'
      });

      if (rpcError) {
        console.error(`[Scoreboard] Failed to fetch leaderboard RPC for ${guild.guild_name}:`, rpcError.message);
        return;
      }

      // 2. Fetch active event name if configured
      let eventName = 'CTF';
      if (guild.active_event_id) {
        try {
          const { data: event, error: eventErr } = await supabase
            .from('events')
            .select('name')
            .eq('id', guild.active_event_id)
            .single();
          if (event && !eventErr) {
            eventName = event.name;
          }
        } catch (err) {
          console.warn(`[Scoreboard] Could not fetch event name for ${guild.guild_name}:`, err);
        }
      }

      // 3. Process scoreboard entries
      const scoreboard = (leaderboard || [])
        .map((entry: any) => ({
          username: entry.username,
          score: Number(entry.score || 0),
          rank: Number(entry.rank || 0),
        }))
        .filter((u: any) => u.score > 0);

      // 4. Construct Scoreboard Embed lines
      let scoreboardDescription = '📊 No solves yet. Be the first!';
      if (scoreboard.length > 0) {
        const medals = ['🥇', '🥈', '🥉'];
        const lines = scoreboard.map((entry: any, i: number) => {
          const medal = i < 3 ? medals[i] : `\`${i + 1}.\``;
          const score = Number(entry.score).toLocaleString('en-US');
          return `${medal} **${entry.username}** — ${score}`;
        });
        scoreboardDescription = lines.join('\n');
      }

      // 5. Update the existing live scoreboard message
      const channel = await this.client.channels.fetch(guild.channel_scoreboard).catch(() => null);
      if (channel && channel.isTextBased()) {
        const message = await (channel as any).messages.fetch(guild.scoreboard_message_id).catch(() => null);
        if (message) {
          const embed = new EmbedBuilder()
            .setColor(0xF59E0B) // Amber/gold
            .setTitle(`🏆 ${eventName} — Live Scoreboard`)
            .setDescription(scoreboardDescription)
            .setTimestamp()
            .setFooter({ text: `${guild.guild_name} • Live Updates` });

          await message.edit({ embeds: [embed] });
          console.log(`[Scoreboard] Successfully updated live scoreboard for ${guild.guild_name}`);
        } else {
          console.warn(`[Scoreboard] Live scoreboard message ${guild.scoreboard_message_id} not found in channel ${guild.channel_scoreboard}. Auto-posting new scoreboard...`);
          // Auto-recover: post a new scoreboard message and update the stored ID
          try {
            const embed = new EmbedBuilder()
              .setColor(0xF59E0B)
              .setTitle(`🏆 ${eventName} — Live Scoreboard`)
              .setDescription(scoreboardDescription)
              .setTimestamp()
              .setFooter({ text: `${guild.guild_name} • Live Updates` });
            const newMsg = await (channel as any).send({ embeds: [embed] });
            if (newMsg) {
              updateGuildScoreboardMessageId(guild.id, newMsg.id);
              console.log(`[Scoreboard] Re-created live scoreboard message (${newMsg.id}) for ${guild.guild_name}`);
            }
          } catch (postErr) {
            console.error(`[Scoreboard] Failed to auto-recover scoreboard for ${guild.guild_name}:`, postErr);
          }
        }
      } else {
        console.warn(`[Scoreboard] Channel ${guild.channel_scoreboard} is not text-based or not accessible.`);
      }
    } catch (err) {
      console.error(`[Scoreboard] Error updating scoreboard for ${guild.guild_name}:`, err);
    }
  }

  requestSolveUpdate(guildId: string): void {
    const guild = getGuild(guildId);
    if (!guild || guild.scoreboard_update_on_solve !== 1) return;

    if (!guild.enable_scoreboard || !guild.channel_scoreboard || !guild.scoreboard_message_id) {
      return;
    }

    if (this.solveUpdateTimers.has(guildId)) {
      this.solveUpdateQueuedAt.set(guildId, Date.now());
      return;
    }

    this.solveUpdateQueuedAt.set(guildId, Date.now());
    const timer = setTimeout(() => {
      this.solveUpdateTimers.delete(guildId);
      this.solveUpdateQueuedAt.delete(guildId);
      this.updateScoreboard(guildId).catch((err) => {
        console.error(`[Scoreboard] Error in debounced solve update for ${guild.guild_name}:`, err);
      });
    }, ScoreboardService.SOLVE_UPDATE_DEBOUNCE_MS);

    this.solveUpdateTimers.set(guildId, timer);
  }

  /**
   * Update the live scoreboard for all active guilds.
   */
  async updateAll(): Promise<void> {
    const guilds = getActiveGuilds();
    for (const guild of guilds) {
      if (guild.enable_scoreboard && guild.channel_scoreboard && guild.scoreboard_message_id) {
        await this.updateScoreboard(guild.id);
        this.lastPeriodicUpdateAt.set(guild.id, Date.now());
      }
    }
  }

  async updateDue(): Promise<void> {
    const guilds = getActiveGuilds();
    const now = Date.now();

    for (const guild of guilds) {
      if (!guild.enable_scoreboard || !guild.channel_scoreboard || !guild.scoreboard_message_id) {
        this.lastPeriodicUpdateAt.delete(guild.id);
        continue;
      }

      const lastUpdatedAt = this.lastPeriodicUpdateAt.get(guild.id) || 0;
      if (now - lastUpdatedAt < this.getUpdateIntervalMs(guild)) {
        continue;
      }

      this.lastPeriodicUpdateAt.set(guild.id, now);
      await this.updateScoreboard(guild.id);
    }
  }
}
