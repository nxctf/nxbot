import { Client, TextChannel, EmbedBuilder } from 'discord.js';
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

interface ChallengeDetails {
  id: string;
  title: string;
  category: string;
  points: number;
  event_id?: string | null;
}

interface SolverDetails {
  id: string;
  username: string;
  sosmed: Record<string, string> | null;
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

    let challenge: ChallengeDetails | null = null;
    let solver: SolverDetails | null = null;

    // Fetch challenge details from Supabase. This can be hidden by NXCTF RLS for
    // private/future events, so use maybeSingle and fall back to SECURITY DEFINER RPCs.
    const { data: directChallenge, error: challengeError } = await supabase
      .from('challenges')
      .select('id, title, category, points, event_id')
      .eq('id', solve.challenge_id)
      .maybeSingle();

    if (challengeError) {
      console.warn(`[FirstBlood] Direct challenge lookup failed for ${solve.challenge_id}:`, challengeError.message);
    }

    if (directChallenge) {
      challenge = directChallenge as ChallengeDetails;
      if (guild.active_event_id && challenge.event_id !== guild.active_event_id) {
        console.log(`[FirstBlood] Ignoring solve for challenge ${solve.challenge_id}: event ${challenge.event_id || 'default'} does not match active event ${guild.active_event_id}.`);
        return;
      }
    } else {
      const { data: recentSolves, error: recentSolvesError } = await supabase.rpc('get_recent_solves', {
        p_limit: 100,
        p_offset: 0,
        p_event_id: guild.active_event_id || null,
        p_event_mode: guild.active_event_id ? 'equals' : 'any',
      });

      if (recentSolvesError) {
        console.warn(`[FirstBlood] Recent solves fallback failed for ${solve.challenge_id}:`, recentSolvesError.message);
      }

      const matchingRecentSolve = (recentSolves || []).find((row: any) =>
        row.log_challenge_id === solve.challenge_id && row.log_user_id === solve.user_id
      );

      if (matchingRecentSolve) {
        challenge = {
          id: String(matchingRecentSolve.log_challenge_id),
          title: String(matchingRecentSolve.log_challenge_title || 'Unknown Challenge'),
          category: String(matchingRecentSolve.log_category || 'Unknown'),
          points: 0,
        };
        solver = {
          id: String(matchingRecentSolve.log_user_id),
          username: String(matchingRecentSolve.log_username || 'Unknown Solver'),
          sosmed: null,
        };
      } else if (guild.active_event_id) {
        console.warn(`[FirstBlood] Could not confirm challenge ${solve.challenge_id} belongs to active event ${guild.active_event_id}; skipping notification.`);
        return;
      } else {
        const { data: solveInfo, error: solveInfoError } = await supabase.rpc('get_solve_info', {
          p_user_id: solve.user_id,
          p_challenge_id: solve.challenge_id,
        });

        if (solveInfoError) {
          console.warn(`[FirstBlood] Solve info fallback failed for ${solve.challenge_id}:`, solveInfoError.message);
          return;
        }

        const info = Array.isArray(solveInfo) ? solveInfo[0] : null;
        if (!info) {
          console.warn(`[FirstBlood] Could not resolve challenge ${solve.challenge_id}; skipping notification.`);
          return;
        }

        challenge = {
          id: solve.challenge_id,
          title: String(info.challenge || 'Unknown Challenge'),
          category: 'Unknown',
          points: 0,
        };
        solver = {
          id: solve.user_id,
          username: String(info.username || 'Unknown Solver'),
          sosmed: null,
        };
      }
    }

    if (!solver) {
      // Fetch solver info including social links (for Discord username)
      const { data: directSolver, error: solverError } = await supabase
        .from('users')
        .select('id, username, sosmed')
        .eq('id', solve.user_id)
        .maybeSingle();

      if (solverError) {
        console.warn(`[FirstBlood] Direct solver lookup failed for ${solve.user_id}:`, solverError.message);
      }

      if (directSolver) {
        solver = directSolver as SolverDetails;
      }
    }

    if (!challenge || !solver) {
      console.warn(`[FirstBlood] Could not resolve first blood details for challenge ${solve.challenge_id}; skipping notification.`);
      return;
    }

    const discordName = (solver.sosmed as Record<string, string> | null)?.discord || null;

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
      solverDiscord: discordName,
    });

    logEvent(guild.id, 'info', 'firstblood', `${solver.username} got first blood on "${challenge.title}"`);
    console.log(`[FirstBlood] 🩸 ${solver.username} → ${challenge.title} (${guild.guild_name})`);
  }

  /**
   * Send a clean first blood notification to the configured channel.
   */
  private async sendFirstBloodEmbed(
    guild: GuildConfig,
    data: {
      challengeTitle: string;
      challengeCategory: string;
      challengePoints: number;
      solverUsername: string;
      solverDiscord: string | null;
    }
  ): Promise<void> {
    if (!guild.channel_firstblood) return;

    try {
      const channel = await this.client.channels.fetch(guild.channel_firstblood);
      if (!channel || !(channel instanceof TextChannel)) {
        console.warn(`[FirstBlood] Channel ${guild.channel_firstblood} not found or not text channel`);
        return;
      }

      let discordTag = '';
      if (data.solverDiscord) {
        const cleanName = data.solverDiscord.replace(/^@/, '').replace(/#\d+$/, '');
        const guild_ = this.client.guilds.cache.get(guild.id);
        if (guild_) {
          try {
            const members = await guild_.members.fetch({ query: cleanName, limit: 1 });
            const member = members.first();
            if (member) {
              discordTag = ` (<@${member.id}>)`;
            } else {
              discordTag = ` (@${cleanName})`;
            }
          } catch {
            discordTag = ` (@${cleanName})`;
          }
        } else {
          discordTag = ` (@${cleanName})`;
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0xDC2626)
        .setDescription(
          `🩸 **FIRST BLOOD** — Peserta **${data.solverUsername}**${discordTag} berhasil first blood pada challenge **${data.challengeTitle}** (${data.challengeCategory})`
        );

      const pingRoleIds = guild.firstblood_ping_roles ? guild.firstblood_ping_roles.split(',').filter(Boolean) : [];
      const shouldPingEveryone = guild.firstblood_ping_everyone === 1;
      const mentionTarget = shouldPingEveryone
        ? '@everyone'
        : pingRoleIds.map((id) => `<@&${id}>`).join(' ');
      const mentionContent = mentionTarget ? `${mentionTarget} First blood alert` : '';

      await channel.send({
        content: mentionContent || undefined,
        embeds: [embed],
        allowedMentions: shouldPingEveryone
          ? { parse: ['everyone'] }
          : { roles: pingRoleIds, users: [] },
      });
    } catch (err) {
      console.error(`[FirstBlood] Failed to send embed to ${guild.channel_firstblood}:`, err);
    }
  }
}
