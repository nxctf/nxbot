import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TicketManager } from '../services/ticket-manager';
import { getTicketByChannel, getTicketsByGuild, getTicketsByUser, getGuild, assignTicket } from '../db/local';

let ticketManager: TicketManager;

export function setTicketManager(tm: TicketManager): void {
  ticketManager = tm;
}

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Support ticket commands')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Open a new support ticket')
      .addStringOption(opt =>
        opt.setName('subject')
          .setDescription('Brief description of your issue')
          .setRequired(true)
          .setMaxLength(200)
      )
  )
  .addSubcommand(sub =>
    sub.setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(opt =>
        opt.setName('reason')
          .setDescription('Reason for closing')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('List tickets')
      .addStringOption(opt =>
        opt.setName('status')
          .setDescription('Filter by status')
          .setRequired(false)
          .addChoices(
            { name: 'Open', value: 'open' },
            { name: 'In Progress', value: 'in_progress' },
            { name: 'Closed', value: 'closed' },
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('assign')
      .setDescription('Assign a ticket to staff (admin only)')
      .addUserOption(opt =>
        opt.setName('staff')
          .setDescription('Staff member to assign')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('panel')
      .setDescription('Deploy the ticket panel embed (admin only)')
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }

  const guildConfig = getGuild(interaction.guildId);
  if (!guildConfig || !guildConfig.enable_tickets) {
    await interaction.reply({ content: '❌ Ticketing is not enabled for this server.', ephemeral: true });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'create':
      await handleCreate(interaction);
      break;
    case 'close':
      await handleClose(interaction);
      break;
    case 'list':
      await handleList(interaction);
      break;
    case 'assign':
      await handleAssign(interaction);
      break;
    case 'panel':
      await handlePanel(interaction);
      break;
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  const subject = interaction.options.getString('subject', true);

  await interaction.deferReply({ ephemeral: true });

  const result = await ticketManager.createTicketChannel(
    interaction.guildId!,
    interaction.user.id,
    interaction.user.username,
    subject,
  );

  if ('error' in result) {
    await interaction.editReply(`❌ ${result.error}`);
    return;
  }

  await interaction.editReply(`✅ Ticket created! Go to <#${result.channelId}>`);
}

async function handleClose(interaction: ChatInputCommandInteraction): Promise<void> {
  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
    return;
  }

  if (ticket.status === 'closed') {
    await interaction.reply({ content: '🔒 This ticket is already closed.', ephemeral: true });
    return;
  }

  const reason = interaction.options.getString('reason');

  const embed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('⚠️ Close this Ticket?')
    .setDescription(
      `Are you sure you want to close ticket **#${String(ticket.id).padStart(4, '0')}**?\n\n` +
      (reason ? `**Reason:** ${reason}\n\n` : '') +
      '> This channel will be deleted after closing.'
    )
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_confirm_${ticket.id}`)
      .setLabel('Yes, Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒'),
    new ButtonBuilder()
      .setCustomId(`ticket_close_cancel_${ticket.id}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('✖️'),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const status = interaction.options.getString('status') ?? undefined;
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;

  let tickets;
  if (isAdmin) {
    tickets = getTicketsByGuild(interaction.guildId!, status);
  } else {
    tickets = getTicketsByUser(interaction.guildId!, interaction.user.id);
    if (status) {
      tickets = tickets.filter(t => t.status === status);
    }
  }

  if (tickets.length === 0) {
    await interaction.editReply('📋 No tickets found.');
    return;
  }

  const statusEmoji: Record<string, string> = {
    open: '🟢',
    in_progress: '🟡',
    closed: '🔴',
  };

  const lines = tickets.slice(0, 15).map(t => {
    const emoji = statusEmoji[t.status] || '⚪';
    const assignee = t.assigned_to ? ` → <@${t.assigned_to}>` : '';
    return `${emoji} **#${String(t.id).padStart(4, '0')}** — ${t.subject}${assignee}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🎫 Tickets')
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${tickets.length} ticket(s)` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function handleAssign(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Only administrators can assign tickets.', ephemeral: true });
    return;
  }

  const ticket = getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
    return;
  }

  const staff = interaction.options.getUser('staff', true);

  assignTicket(ticket.id, staff.id);

  const embed = new EmbedBuilder()
    .setColor(0xF59E0B)
    .setTitle('👤 Ticket Assigned')
    .setDescription(`This ticket has been assigned to <@${staff.id}>.`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handlePanel(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: '❌ Only administrators can deploy the ticket panel.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const result = await ticketManager.deployTicketPanel(interaction.guildId!);

  if (!result.success) {
    await interaction.editReply(`❌ ${result.error}`);
  } else {
    await interaction.editReply('✅ Ticket panel deployed successfully!');
  }
}
