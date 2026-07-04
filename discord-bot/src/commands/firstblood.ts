import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { getFirstBloods, getGuild } from '../db/local';

export const data = new SlashCommandBuilder()
  .setName('firstblood')
  .setDescription('Show recent first blood solves')
  .addIntegerOption(option =>
    option.setName('limit')
      .setDescription('Number of entries (default: 5)')
      .setRequired(false)
      .setMinValue(1)
      .setMaxValue(15)
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

  const limit = interaction.options.getInteger('limit') ?? 5;
  const firstBloods = getFirstBloods(interaction.guildId, limit);

  if (firstBloods.length === 0) {
    await interaction.reply({ content: '🩸 No first bloods recorded yet.', ephemeral: false });
    return;
  }

  const lines = firstBloods.map((fb, i) => {
    const time = fb.notified_at ? `<t:${Math.floor(new Date(fb.notified_at).getTime() / 1000)}:R>` : 'unknown';
    return `**${i + 1}.** 🩸 **${fb.solver_username || 'Unknown'}** → ${fb.challenge_title || 'Unknown'} [${fb.challenge_category || '?'}] (${fb.challenge_points || 0} pts) — ${time}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xDC2626) // Red
    .setTitle('🩸 Recent First Bloods')
    .setDescription(lines.join('\n'))
    .setTimestamp()
    .setFooter({ text: `${guildConfig.guild_name} • NXBot CTF` });

  await interaction.reply({ embeds: [embed] });
}
