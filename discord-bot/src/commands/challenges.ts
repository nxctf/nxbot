import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabaseManager } from '../services/supabase-manager';
import { getGuild } from '../db/local';

export const data = new SlashCommandBuilder()
  .setName('challenges')
  .setDescription('List CTF challenges')
  .addStringOption(option =>
    option.setName('category')
      .setDescription('Filter by category')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const guildConfig = getGuild(interaction.guildId);
  if (!guildConfig) {
    await interaction.reply({ content: '❌ This server is not configured.', ephemeral: true });
    return;
  }

  const supabase = supabaseManager.getClient(interaction.guildId);
  if (!supabase) {
    await interaction.reply({ content: '❌ Supabase connection not available.', ephemeral: true });
    return;
  }

  await interaction.deferReply();

  const category = interaction.options.getString('category');

  try {
    let query = supabase
      .from('challenges')
      .select('id, title, category, points, difficulty, total_solves, is_active')
      .eq('is_active', true)
      .order('category')
      .order('points', { ascending: true });

    if (category) {
      query = query.ilike('category', category);
    }

    if (guildConfig.active_event_id) {
      query = query.eq('event_id', guildConfig.active_event_id);
    }

    const { data: challenges, error } = await query;

    if (error) {
      await interaction.editReply('❌ Failed to fetch challenges.');
      console.error('[Challenges] Query error:', error);
      return;
    }

    if (!challenges || challenges.length === 0) {
      await interaction.editReply('📋 No challenges found' + (category ? ` for category "${category}"` : '') + '.');
      return;
    }

    // Group by category
    const grouped: Record<string, typeof challenges> = {};
    for (const chall of challenges) {
      if (!grouped[chall.category]) {
        grouped[chall.category] = [];
      }
      grouped[chall.category].push(chall);
    }

    // Difficulty emoji map
    const diffEmoji: Record<string, string> = {
      'Baby': '🟢',
      'Easy': '🟡',
      'Medium': '🟠',
      'Hard': '🔴',
      'Insane': '🟣',
    };

    const embed = new EmbedBuilder()
      .setColor(0x3B82F6) // Blue
      .setTitle('📋 CTF Challenges')
      .setTimestamp()
      .setFooter({ text: `${challenges.length} challenge(s) • ${guildConfig.guild_name}` });

    for (const [cat, challs] of Object.entries(grouped)) {
      const lines = challs.map((c: any) => {
        const emoji = diffEmoji[c.difficulty] || '⚪';
        return `${emoji} **${c.title}** — ${c.points} pts (${c.total_solves} solves)`;
      });

      embed.addFields({
        name: `📂 ${cat}`,
        value: lines.join('\n') || 'No challenges',
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[Challenges] Error:', err);
    await interaction.editReply('❌ An error occurred while fetching challenges.');
  }
}
