import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabaseManager } from '../services/supabase-manager';
import { getGuild } from '../db/local';

export const data = new SlashCommandBuilder()
  .setName('scoreboard')
  .setDescription('Show the CTF scoreboard')
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of entries to show (default: 10)')
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(25)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const guildConfig = getGuild(interaction.guildId);
  if (!guildConfig) {
    await interaction.reply({ content: '❌ This server is not configured. Ask an admin to set up NXBot.', ephemeral: true });
    return;
  }

  if (!guildConfig.enable_scoreboard) {
    await interaction.reply({ content: '❌ The scoreboard command is currently disabled on this server.', ephemeral: true });
    return;
  }

  const supabase = supabaseManager.getClient(interaction.guildId);
  if (!supabase) {
    await interaction.reply({ content: '❌ Supabase connection not available.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;

  try {
    // Fetch users with their solve counts and total points
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        solves (
          id,
          challenge_id,
          challenges:challenge_id (
            points
          )
        )
      `)
      .limit(50);

    if (error) {
      await interaction.editReply('❌ Failed to fetch scoreboard data.');
      console.error('[Scoreboard] Query error:', error);
      return;
    }

    if (!users || users.length === 0) {
      await interaction.editReply('📊 No data available yet. No one has solved any challenges.');
      return;
    }

    // Calculate scores
    const scoreboard = users
      .map((user: any) => {
        const solves = user.solves || [];
        const totalPoints = solves.reduce((sum: number, solve: any) => {
          const points = solve.challenges?.points ?? 0;
          return sum + points;
        }, 0);
        return {
          username: user.username,
          score: totalPoints,
          solveCount: solves.length,
        };
      })
      .filter((u: any) => u.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);

    if (scoreboard.length === 0) {
      await interaction.editReply('📊 No solves yet. Be the first!');
      return;
    }

    // Build scoreboard embed
    const medals = ['🥇', '🥈', '🥉'];
    const lines = scoreboard.map((entry: any, i: number) => {
      const medal = i < 3 ? medals[i] : `\`${i + 1}.\``;
      return `${medal} **${entry.username}** — ${entry.score} pts (${entry.solveCount} solves)`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B) // Amber/gold
      .setTitle('🏆 CTF Scoreboard')
      .setDescription(lines.join('\n'))
      .setTimestamp()
      .setFooter({ text: `${guildConfig.guild_name} • Top ${scoreboard.length} players` });

    if (guildConfig.active_event_id) {
      // Try to fetch event name
      const { data: event } = await supabase
        .from('events')
        .select('name')
        .eq('id', guildConfig.active_event_id)
        .single();

      if (event) {
        embed.setTitle(`🏆 ${event.name} — Scoreboard`);
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Scoreboard] Error:', err);
    await interaction.editReply('❌ An error occurred while fetching the scoreboard.');
  }
}
