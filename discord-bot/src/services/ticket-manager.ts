import { Client, EmbedBuilder, TextChannel, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createTicket, getTicketByChannel, getTicketsByGuild, getTicketsByUser, updateTicketStatus, assignTicket, Ticket, getGuild, logEvent, saveTicketMessage, upsertDiscordUser, getDb } from '../db/local';

/**
 * Ticket Manager Service
 *
 * Handles Discord ticket lifecycle:
 * - Create private ticket channels
 * - Manage permissions
 * - Track in local SQLite
 * - Close and archive tickets
 */

export class TicketManager {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Create a new ticket channel for a user.
   */
  async createTicketChannel(
    guildId: string,
    userId: string,
    username: string,
    subject: string,
    description?: string
  ): Promise<{ ticket: Ticket; channelId: string } | { error: string }> {
    const guildConfig = getGuild(guildId);
    if (!guildConfig || !guildConfig.enable_tickets) {
      return { error: 'Ticketing is not enabled for this server.' };
    }

    const discordGuild = this.client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return { error: 'Bot is not in this server.' };
    }

    // Fetch member and resolve avatar URL
    let userAvatar: string | null = null;
    let member: any = null;
    try {
      member = await discordGuild.members.fetch(userId);
      userAvatar = member.user.displayAvatarURL({ forceStatic: false, size: 128 }) || null;
      upsertDiscordUser(userId, username, userAvatar);
    } catch (err) {
      console.warn('[Ticket] Could not fetch member or avatar:', err);
      upsertDiscordUser(userId, username, null);
    }

    // Check required roles (if configured)
    if (guildConfig.ticket_required_roles) {
      const requiredRoleIds = guildConfig.ticket_required_roles.split(',').filter(Boolean);
      if (requiredRoleIds.length > 0) {
        if (!member) {
          return { error: 'Could not verify your roles. Please try again.' };
        }
        const hasRole = requiredRoleIds.some(roleId => member.roles.cache.has(roleId));
        if (!hasRole) {
          return { error: 'You do not have the required role to open a ticket.' };
        }
      }
    }

    // Check existing open tickets by this user
    const existingTickets = getTicketsByUser(guildId, userId);
    const openTickets = existingTickets.filter(t => t.status !== 'closed');
    if (openTickets.length >= 3) {
      return { error: 'You already have 3 open tickets. Please close some before opening a new one.' };
    }

    // Generate ticket number
    const allTickets = getTicketsByGuild(guildId);
    const ticketNumber = allTickets.length + 1;
    const channelName = `ticket-${String(ticketNumber).padStart(4, '0')}`;

    // Build permission overwrites
    const pingRoleIds = guildConfig.ticket_ping_roles ? guildConfig.ticket_ping_roles.split(',').filter(Boolean) : [];

    const permissionOverwrites: any[] = [
      {
        id: discordGuild.id, // @everyone — deny view
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      },
      {
        id: this.client.user!.id, // Bot itself
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
        ],
      },
    ];

    // Grant view access to all ping roles (staff roles)
    for (const roleId of pingRoleIds) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
        ],
      });
    }

    // Create the private channel
    let channel;
    try {
      channel = await discordGuild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: guildConfig.channel_ticket_category || undefined,
        permissionOverwrites,
      });
    } catch (err: any) {
      console.error('[Ticket] Channel creation failed:', err?.message || err, err?.code || '');
      logEvent(guildId, 'error', 'ticket', `Channel create error: ${err?.message || err}`);
      return { error: `Failed to create channel: ${err?.message || 'Discord API error'}` };
    }

    // Insert ticket into local DB
    let ticketId: number;
    try {
      ticketId = createTicket({
        guild_id: guildId,
        channel_id: channel.id,
        user_id: userId,
        username,
        subject,
      });
    } catch (err: any) {
      console.error('[Ticket] DB insert failed:', err?.message || err);
      logEvent(guildId, 'error', 'ticket', `DB createTicket error: ${err?.message || err}`);
      return { error: 'Internal database error creating ticket.' };
    }

    // Save initial description to ticket_messages DB if provided
    try {
      if (description) {
        saveTicketMessage(
          ticketId,
          userId,
          username,
          userAvatar,
          `📝 **Initial Description:**\n${description}`
        );
      }
    } catch (err: any) {
      console.error('[Ticket] Failed to save initial message:', err?.message || err);
      logEvent(guildId, 'error', 'ticket', `saveTicketMessage error: ${err?.message || err}`);
    }

    // Send initial embed with close and claim buttons
    try {
      const botAvatar = this.client.user?.displayAvatarURL({ forceStatic: false }) ?? null;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: 'NXBot Ticketing System', iconURL: botAvatar ?? undefined })
        .setTitle(`🎫 Ticket #${String(ticketNumber).padStart(4, '0')}`)
        .addFields(
          { name: 'Subject', value: subject, inline: false },
          { name: 'Description', value: description || 'No description provided.', inline: false },
          { name: 'Opened by', value: `<@${userId}>`, inline: true },
          { name: 'Status', value: '🟢 Open', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: 'NXBot Ticketing System' });

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketId}`)
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🙋‍♂️'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒'),
      );

      const defaultWelcome = `<@${userId}> Your ticket has been created. Please describe your issue here.`;
      let welcomeMsg = defaultWelcome;
      if (guildConfig.ticket_welcome_message) {
        welcomeMsg = guildConfig.ticket_welcome_message.replace(/\{\{user\}\}/g, `<@${userId}>`);
      }

      const contentParts: string[] = [welcomeMsg];
      if (pingRoleIds.length > 0) {
        const roleMentions = pingRoleIds.map(id => `<@&${id}>`).join(' ');
        contentParts.push(`📢 ${roleMentions}`);
      }

      await channel.send({
        content: contentParts.join('\n'),
        embeds: [embed],
        components: [actionRow],
        allowedMentions: { roles: pingRoleIds, users: [userId] }
      });
    } catch (err: any) {
      console.error('[Ticket] Failed to send welcome message:', err?.message || err);
      logEvent(guildId, 'warn', 'ticket', `Welcome message send error: ${err?.message || err}`);
    }

    // Log to ticket logs channel
    try {
      if (guildConfig.channel_ticket_logs) {
        await this.sendTicketLog(guildConfig.channel_ticket_logs, 'created', {
          ticketNumber,
          userId,
          username,
          subject,
          channelId: channel.id,
        });
      }
    } catch (err: any) {
      console.error('[Ticket] Failed to send ticket log:', err?.message || err);
    }

    logEvent(guildId, 'info', 'ticket', `Ticket #${ticketNumber} created by ${username}: ${subject}`);

    const ticket = getTicketByChannel(channel.id)!;
    return { ticket, channelId: channel.id };
  }

  /**
   * Deploy a ticket panel embed with "Open Ticket" button to the configured panel channel.
   */
  async deployTicketPanel(guildId: string): Promise<{ success: boolean; error?: string }> {
    const guildConfig = getGuild(guildId);
    if (!guildConfig || !guildConfig.enable_tickets) {
      return { success: false, error: 'Ticketing is not enabled for this server.' };
    }

    if (!guildConfig.channel_ticket_panel) {
      return { success: false, error: 'No ticket panel channel configured.' };
    }

    try {
      const channel = await this.client.channels.fetch(guildConfig.channel_ticket_panel);
      if (!channel || !(channel instanceof TextChannel)) {
        return { success: false, error: 'Ticket panel channel not found or is not a text channel.' };
      }

      const botAvatarPanel = this.client.user?.displayAvatarURL({ forceStatic: false }) ?? null;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({ name: 'NXBot Ticketing System', iconURL: botAvatarPanel ?? undefined })
        .setTitle('🎫 Support Tickets')
        .setDescription(
          '**Need help?** Click the button below to open a support ticket.\n\n' +
          'A private channel will be created for you where our staff can assist you.\n\n' +
          '> ⚠️ Please do not abuse the ticket system.'
        )
        .setFooter({ text: 'NXBot Ticketing System' })
        .setTimestamp();

      const openButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_open_panel')
          .setLabel('Open a Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫'),
      );

      await channel.send({ embeds: [embed], components: [openButton] });

      logEvent(guildId, 'info', 'ticket', `Ticket panel deployed in channel ${guildConfig.channel_ticket_panel}`);
      return { success: true };
    } catch (err) {
      console.error('[Ticket] Failed to deploy panel:', err);
      return { success: false, error: 'Failed to deploy ticket panel. Check bot permissions.' };
    }
  }

  /**
   * Close a ticket.
   */
  async closeTicket(channelId: string, closedByUserId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const ticket = getTicketByChannel(channelId);
    if (!ticket) {
      return { success: false, error: 'No ticket found for this channel.' };
    }

    if (ticket.status === 'closed') {
      return { success: false, error: 'This ticket is already closed.' };
    }

    const guildConfig = getGuild(ticket.guild_id);

    // Fetch closer's Discord profile for display
    let closerUsername: string | null = null;
    let closerAvatar: string | null = null;
    try {
      const guild = await this.client.guilds.fetch(ticket.guild_id);
      const member = await guild.members.fetch(closedByUserId);
      closerUsername = member.user.username;
      closerAvatar = member.user.displayAvatarURL({ forceStatic: false, size: 64 }) || null;
      upsertDiscordUser(closedByUserId, closerUsername, closerAvatar);
    } catch {
      upsertDiscordUser(closedByUserId, closedByUserId, null);
    }

    // Update status in DB
    updateTicketStatus(ticket.id, 'closed', closedByUserId);

    // Send closing message
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel instanceof TextChannel) {
        const botAvatarClose = this.client.user?.displayAvatarURL({ forceStatic: false }) ?? null;
        const embed = new EmbedBuilder()
          .setColor(0xEF4444)
          .setAuthor({ name: 'NXBot Ticketing System', iconURL: botAvatarClose ?? undefined })
          .setTitle('🔒 Ticket Closed')
          .setDescription(
            `This ticket has been closed by <@${closedByUserId}>.` +
            (reason ? `\n\n**Reason:** ${reason}` : '')
          )
          .setTimestamp()
          .setFooter({ text: 'This channel will be deleted in 10 seconds.' });

        await channel.send({ embeds: [embed] });

        // Log to ticket logs channel
        if (guildConfig?.channel_ticket_logs) {
          const creator = getDb().prepare('SELECT username FROM discord_users WHERE user_id = ?').get(ticket.user_id) as { username: string } | undefined;
          await this.sendTicketLog(guildConfig.channel_ticket_logs, 'closed', {
            ticketNumber: ticket.id,
            userId: ticket.user_id,
            username: creator?.username || 'Unknown',
            subject: ticket.subject,
            closedBy: closedByUserId,
            reason: reason || undefined,
          });
        }

        // Delete channel after delay
        setTimeout(async () => {
          try {
            await channel.delete('Ticket closed');
          } catch {
            // Channel might already be deleted
          }
        }, 10_000);
      }
    } catch (err) {
      console.error('[Ticket] Failed to close ticket channel:', err);
    }

    logEvent(ticket.guild_id, 'info', 'ticket', `Ticket #${ticket.id} closed by ${closedByUserId}` + (reason ? ` (reason: ${reason})` : ''));
    return { success: true };
  }

  /**
   * Assign a ticket to a staff member.
   */
  async assignTicketToStaff(ticketId: number, staffUserId: string): Promise<{ success: boolean; error?: string }> {
    const ticket = getTicketByChannel(String(ticketId));
    if (!ticket) {
      // Try by ID
      assignTicket(ticketId, staffUserId);
    } else {
      assignTicket(ticket.id, staffUserId);
    }

    return { success: true };
  }

  /**
   * Claim a ticket by staff.
   */
  async claimTicket(channelId: string, staffUserId: string, staffUsername: string): Promise<{ success: boolean; error?: string }> {
    const ticket = getTicketByChannel(channelId);
    if (!ticket) {
      return { success: false, error: 'No ticket found for this channel.' };
    }

    if (ticket.status !== 'open') {
      return { success: false, error: `This ticket is already ${ticket.status}.` };
    }

    // Fetch staff avatar and upsert user cache
    let staffAvatar: string | null = null;
    try {
      const guild = await this.client.guilds.fetch(ticket.guild_id);
      const member = await guild.members.fetch(staffUserId);
      staffAvatar = member.user.displayAvatarURL({ forceStatic: false, size: 64 }) || null;
      upsertDiscordUser(staffUserId, staffUsername, staffAvatar);
    } catch {
      upsertDiscordUser(staffUserId, staffUsername, null);
    }

    // Update status in local DB to in_progress and assign to staff
    assignTicket(ticket.id, staffUserId);

    // Send log to logs channel if configured
    const guildConfig = getGuild(ticket.guild_id);
    if (guildConfig?.channel_ticket_logs) {
      const creator = getDb().prepare('SELECT username FROM discord_users WHERE user_id = ?').get(ticket.user_id) as { username: string } | undefined;
      await this.sendTicketLog(guildConfig.channel_ticket_logs, 'assigned', {
        ticketNumber: ticket.id,
        userId: ticket.user_id,
        username: creator?.username || 'Unknown',
        subject: ticket.subject,
        assignedTo: staffUserId,
      });
    }

    logEvent(ticket.guild_id, 'info', 'ticket', `Ticket #${ticket.id} claimed by ${staffUsername} (${staffUserId})`);
    return { success: true };
  }

  /**
   * Send a log message to the ticket logs channel.
   */
  private async sendTicketLog(
    logChannelId: string,
    action: 'created' | 'closed' | 'assigned',
    data: {
      ticketNumber: number;
      userId: string;
      username: string;
      subject: string;
      channelId?: string;
      closedBy?: string;
      assignedTo?: string;
      reason?: string;
    }
  ): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(logChannelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const colors: Record<string, number> = {
        created: 0x22C55E,  // Green
        closed: 0xEF4444,   // Red
        assigned: 0xF59E0B, // Yellow
      };

      const titles: Record<string, string> = {
        created: '📩 Ticket Created',
        closed: '🔒 Ticket Closed',
        assigned: '👤 Ticket Assigned',
      };

      const embed = new EmbedBuilder()
        .setColor(colors[action])
        .setTitle(titles[action])
        .addFields(
          { name: 'Ticket', value: `#${String(data.ticketNumber).padStart(4, '0')}`, inline: true },
          { name: 'User', value: `<@${data.userId}> (${data.username})`, inline: true },
          { name: 'Subject', value: data.subject, inline: false },
        )
        .setTimestamp();

      if (action === 'created' && data.channelId) {
        embed.addFields({ name: 'Channel', value: `<#${data.channelId}>`, inline: true });
      }
      if (action === 'closed' && data.closedBy) {
        embed.addFields({ name: 'Closed by', value: `<@${data.closedBy}>`, inline: true });
      }
      if (action === 'closed' && data.reason) {
        embed.addFields({ name: 'Reason', value: data.reason, inline: false });
      }
      if (action === 'assigned' && data.assignedTo) {
        embed.addFields({ name: 'Assigned to', value: `<@${data.assignedTo}>`, inline: true });
      }

      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[Ticket] Failed to send log:', err);
    }
  }
}
