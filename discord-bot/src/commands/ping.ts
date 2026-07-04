import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong and the latency!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`🏓 Pong! Latency is ${latency}ms. API Latency is ${Math.round(interaction.client.ws.ping)}ms.`);
}
