import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { supabaseManager } from '../services/supabase-manager';
import { getGuild } from '../db/local';

export const data = new SlashCommandBuilder()
  .setName('ctf-info')
  .setDescription('Show current CTF event information');

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

  try {
    // Fetch event info
    let eventName = 'CTF Event';
    let eventDesc = '';
    let startTime: string | null = null;
    let endTime: string | null = null;

    if (guildConfig.active_event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', guildConfig.active_event_id)
        .single();

      if (event) {
        eventName = event.name;
        eventDesc = event.description || '';
        startTime = event.start_time;
        endTime = event.end_time;
      }
    }

    // Fetch challenge stats
    let challengeQuery = supabase
      .from('challenges')
      .select('id, category, points', { count: 'exact' })
      .eq('is_active', true);

    if (guildConfig.active_event_id) {
      challengeQuery = challengeQuery.eq('event_id', guildConfig.active_event_id);
    }

    const { data: challenges, count: challengeCount } = await challengeQuery;

    // Count categories
    const categories = new Set(challenges?.map((c: any) => c.category) || []);
    const totalPoints = challenges?.reduce((sum: number, c: any) => sum + (c.points || 0), 0) || 0;

    // Count total solves
    const { count: solveCount } = await supabase
      .from('solves')
      .select('id', { count: 'exact', head: true });

    // Count participants
    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const embed = new EmbedBuilder()
      .setColor(0x8B5CF6) // Purple
      .setTitle(`🚩 ${eventName}`)
      .setTimestamp()
      .setFooter({ text: `${guildConfig.guild_name} • NXBot CTF` });

    if (eventDesc) {
      embed.setDescription(eventDesc);
    }

    embed.addFields(
      { name: '📋 Challenges', value: `${challengeCount || 0}`, inline: true },
      { name: '📂 Categories', value: `${categories.size}`, inline: true },
      { name: '💰 Total Points', value: `${totalPoints}`, inline: true },
      { name: '👥 Participants', value: `${userCount || 0}`, inline: true },
      { name: '✅ Total Solves', value: `${solveCount || 0}`, inline: true },
    );

    // Time info
    if (startTime) {
      const start = new Date(startTime);
      const now = new Date();

      if (now < start) {
        const diff = start.getTime() - now.getTime();
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        embed.addFields({ name: '⏰ Starts In', value: `${hours}h ${mins}m`, inline: true });
      } else if (endTime) {
        const end = new Date(endTime);
        if (now < end) {
          const diff = end.getTime() - now.getTime();
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          embed.addFields({ name: '⏰ Time Remaining', value: `${hours}h ${mins}m`, inline: true });
          embed.setColor(0x22C55E); // Green when active
        } else {
          embed.addFields({ name: '⏰ Status', value: '🔴 Event Ended', inline: true });
          embed.setColor(0x6B7280); // Gray when ended
        }
      }

      embed.addFields({
        name: '📅 Schedule',
        value: `Start: <t:${Math.floor(start.getTime() / 1000)}:F>` +
          (endTime ? `\nEnd: <t:${Math.floor(new Date(endTime).getTime() / 1000)}:F>` : ''),
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[CTFInfo] Error:', err);
    await interaction.editReply('❌ An error occurred while fetching CTF info.');
  }
}
