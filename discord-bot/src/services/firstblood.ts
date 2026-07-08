import { Client, TextChannel, EmbedBuilder, Colors } from 'discord.js';
import { supabaseManager } from './supabase-manager';
import { getActiveGuilds, insertFirstBlood, GuildConfig, logEvent } from '../db/local';
import { ScoreboardService } from './scoreboard';

/**
 * First Blood Detection Service
 *
 * Subscribes to Supabase Realtime INSERT events on the `solves` table
 * for each configured guild. When a new solve is detected, checks if
 * it's the first solve for that challenge (first blood) and sends a
 * rich notification embed to the configured Discord channel.
 */

interface SolvePayload {
  id: string;
  user_id: string;
  challenge_id: string;
  created_at: string;
}

export class FirstBloodService {
  private client: Client;
  private scoreboardService?: ScoreboardService;

  constructor(client: Client, scoreboardService?: ScoreboardService) {
    this.client = client;
    this.scoreboardService = scoreboardService;
  }

  /**
   * Start listening for first bloods on all active guilds.
   */
  async startAll(): Promise<void> {
    const guilds = getActiveGuilds();

    for (const guild of guilds) {
      const needsSolvesSubscription = 
        (guild.enable_firstblood && guild.channel_firstblood) || 
        (guild.enable_scoreboard && guild.channel_scoreboard && guild.scoreboard_message_id);

      if (!needsSolvesSubscription) {
        continue;
      }

      if (!supabaseManager.isConnected(guild.id)) {
        console.warn(`[FirstBlood] Skipping guild ${guild.guild_name}: no Supabase connection`);
        continue;
      }

      this.subscribeGuild(guild);
    }
  }

  /**
   * Subscribe to solves for a specific guild.
   */
  subscribeGuild(guild: GuildConfig): void {
    const needsSolvesSubscription = 
      (guild.enable_firstblood && guild.channel_firstblood) || 
      (guild.enable_scoreboard && guild.channel_scoreboard && guild.scoreboard_message_id);

    if (!needsSolvesSubscription) return;

    const channelName = `firstblood-${guild.id}`;

    supabaseManager.subscribeChannel(guild.id, channelName, (channel) => {
      return channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solves',
        },
        async (payload) => {
          try {
            console.log(`[FirstBlood] 🔔 Realtime event received for ${guild.guild_name}:`, JSON.stringify({ eventType: payload.eventType, new: payload.new, old: payload.old }));
            let solve = payload.new as SolvePayload;

            // Supabase Realtime may send empty/partial payloads if REPLICA IDENTITY FULL is not set
            if (!solve.challenge_id || !solve.user_id) {
              const supabase = supabaseManager.getClient(guild.id);
              if (!supabase) return;

              if (solve.id) {
                // Have ID but missing fields — fetch full row
                const { data, error } = await supabase.from('solves').select('*').eq('id', solve.id).single();
                if (error) {
                  if (error.message?.toLowerCase().includes('permission denied')) {
                    console.warn(`[FirstBlood] Cannot fetch solve details: Supabase anon key lacks SELECT on 'solves' table. Set REPLICA IDENTITY FULL on the 'solves' table in Supabase Dashboard > SQL Editor > ALTER TABLE solves REPLICA IDENTITY FULL;`);
                  } else {
                    console.error(`[FirstBlood] Failed to fetch solve details for ID ${solve.id}:`, error.message);
                  }
                }
                if (!data) return;
                solve = data as SolvePayload;
              } else {
                // Completely empty payload — fetch latest solve
                const { data, error } = await supabase.from('solves').select('*').order('created_at', { ascending: false }).limit(1).single();
                if (error) {
                  if (error.message?.toLowerCase().includes('permission denied')) {
                    console.warn(`[FirstBlood] Cannot fetch latest solve: Supabase anon key lacks SELECT on 'solves' table. Set REPLICA IDENTITY FULL on the 'solves' table in Supabase Dashboard > SQL Editor > ALTER TABLE solves REPLICA IDENTITY FULL;`);
                  } else {
                    console.error(`[FirstBlood] Failed to fetch latest solve:`, error.message);
                  }
                }
                if (!data) return;
                solve = data as SolvePayload;
              }
            }

            // Handle first blood check/alert
            if (guild.enable_firstblood && guild.channel_firstblood) {
              try {
                await this.handleNewSolve(guild, solve);
              } catch (err) {
                console.error(`[FirstBlood] Error handling solve for ${guild.guild_name}:`, err);
                logEvent(guild.id, 'error', 'firstblood', `Error handling solve: ${err}`);
              }
            }

            // Handle live scoreboard update
            if (this.scoreboardService && guild.enable_scoreboard && guild.channel_scoreboard && guild.scoreboard_message_id) {
              try {
                await this.scoreboardService.updateScoreboard(guild.id);
              } catch (sbErr) {
                console.error(`[Scoreboard] Error updating scoreboard on solve for ${guild.guild_name}:`, sbErr);
              }
            }
          } catch (err) {
            console.error(`[FirstBlood] Error in solves subscription for ${guild.guild_name}:`, err);
          }
        }
      );
    });

    console.log(`[FirstBlood] Listening on guild: ${guild.guild_name}`);
  }

  /**
   * Handle a new solve event.
   */
  private async handleNewSolve(guild: GuildConfig, solve: SolvePayload): Promise<void> {
    if (!solve.challenge_id || !solve.user_id) {
      console.warn(`[FirstBlood] Skipping solve event with missing fields for ${guild.guild_name}:`, JSON.stringify(solve));
      return;
    }

    const supabase = supabaseManager.getClient(guild.id);
    if (!supabase) return;

    // Check if this is the first solve for this challenge by querying Supabase
    // Uses ORDER BY created_at ASC to handle cases where solves were deleted/readded
    const { data: firstSolve } = await supabase
      .from('solves')
      .select('id')
      .eq('challenge_id', solve.challenge_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!firstSolve) {
      console.warn(`[FirstBlood] No solves found for challenge ${solve.challenge_id} (race condition?)`);
      return;
    }

    // If the earliest solve isn't ours, someone else got first blood first
    if (firstSolve.id !== solve.id) {
      return;
    }

    // Fetch challenge details from Supabase
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, category, points')
      .eq('id', solve.challenge_id)
      .single();

    if (challengeError || !challenge) {
      console.warn(`[FirstBlood] Could not fetch challenge ${solve.challenge_id}:`, challengeError);
      return;
    }

    // Fetch solver info
    const { data: solver, error: solverError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', solve.user_id)
      .single();

    if (solverError || !solver) {
      console.warn(`[FirstBlood] Could not fetch solver ${solve.user_id}:`, solverError);
      return;
    }

    // Save to local cache (for /firstblood command & duplicate prevention)
    insertFirstBlood({
      guild_id: guild.id,
      challenge_id: solve.challenge_id,
      solver_user_id: solver.id,
      solver_username: solver.username,
      challenge_title: challenge.title,
      challenge_category: challenge.category,
      challenge_points: challenge.points,
    });

    // Send Discord notification
    await this.sendFirstBloodEmbed(guild, {
      challengeTitle: challenge.title,
      challengeCategory: challenge.category,
      challengePoints: challenge.points,
      solverUsername: solver.username,
      solvedAt: solve.created_at,
    });

    logEvent(guild.id, 'info', 'firstblood', `${solver.username} got first blood on "${challenge.title}"`);
    console.log(`[FirstBlood] 🩸 ${solver.username} → ${challenge.title} (${guild.guild_name})`);
  }

  /**
   * Send a rich embed notification to the configured first blood channel.
   */
  private async sendFirstBloodEmbed(
    guild: GuildConfig,
    data: {
      challengeTitle: string;
      challengeCategory: string;
      challengePoints: number;
      solverUsername: string;
      solvedAt: string;
    }
  ): Promise<void> {
    if (!guild.channel_firstblood) return;

    try {
      const channel = await this.client.channels.fetch(guild.channel_firstblood);
      if (!channel || !(channel instanceof TextChannel)) {
        console.warn(`[FirstBlood] Channel ${guild.channel_firstblood} not found or not text channel`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xDC2626) // Red for first blood
        .setTitle('🩸 FIRST BLOOD!')
        .setDescription(`**${data.solverUsername}** drew first blood!`)
        .addFields(
          { name: '🏁 Challenge', value: data.challengeTitle, inline: true },
          { name: '📂 Category', value: data.challengeCategory, inline: true },
          { name: '💰 Points', value: `${data.challengePoints}`, inline: true },
        )
        .setTimestamp(data.solvedAt && !isNaN(new Date(data.solvedAt).getTime()) ? new Date(data.solvedAt) : new Date())
        .setFooter({ text: `${guild.guild_name} • NXBot CTF` });

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(`[FirstBlood] Failed to send embed to ${guild.channel_firstblood}:`, err);
    }
  }
}
