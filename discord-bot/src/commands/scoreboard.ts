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
    await interaction.reply({ content: 'This server is not configured. Ask an admin to set up NXBot.', ephemeral: true });
    return;
  }

  if (!guildConfig.enable_scoreboard) {
    await interaction.reply({ content: 'The scoreboard command is currently disabled on this server.', ephemeral: true });
    return;
  }

  const supabase = supabaseManager.getClient(interaction.guildId);
  if (!supabase) {
    await interaction.reply({ content: 'Supabase connection not available.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const limit = interaction.options.getInteger('limit') ?? 10;

  try {
    const { data: leaderboard, error } = await supabase.rpc('get_leaderboard', {
      limit_rows: limit,
      offset_rows: 0,
      p_event_id: guildConfig.active_event_id || null,
      p_event_mode: guildConfig.active_event_id ? 'equals' : 'any',
      p_tag: null,
    });

    if (error) {
      await interaction.editReply('Failed to fetch scoreboard data.');
      console.error('[Scoreboard] RPC error:', error);
      return;
    }

    if (!leaderboard || leaderboard.length === 0) {
      await interaction.editReply('No data available yet. No one has solved any challenges.');
      return;
    }

    const scoreboard = leaderboard
      .map((entry: any) => ({
        username: entry.username,
        score: Number(entry.score || 0),
        rank: Number(entry.rank || 0),
      }))
      .filter((entry: any) => entry.score > 0)
      .slice(0, limit);

    if (scoreboard.length === 0) {
      await interaction.editReply('No solves yet. Be the first!');
      return;
    }

    const lines = scoreboard.map((entry: any, i: number) => {
      const rank = entry.rank > 0 ? entry.rank : i + 1;
      const score = Number(entry.score).toLocaleString('en-US');
      return `#${rank} **${entry.username}** - ${score} pts`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xF59E0B)
      .setTitle('CTF Scoreboard')
      .setDescription(lines.join('\n'))
      .setTimestamp()
      .setFooter({ text: `${guildConfig.guild_name} - Top ${scoreboard.length} players` });

    if (guildConfig.active_event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('name')
        .eq('id', guildConfig.active_event_id)
        .single();

      if (event) {
        embed.setTitle(`${event.name} - Scoreboard`);
      }
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Scoreboard] Error:', err);
    await interaction.editReply('An error occurred while fetching the scoreboard.');
  }
}
