import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Collection, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getDb, isSetup, getActiveGuilds, logEvent, closeDb, getTicketByChannel, saveTicketMessage, getPendingBotActions, completeBotAction, upsertDiscordUser } from './db/local';
import { supabaseManager } from './services/supabase-manager';
import { FirstBloodService } from './services/firstblood';
import { AnnouncementService } from './services/announcements';
import { TicketManager } from './services/ticket-manager';
import { setTicketManager } from './commands/ticket';

// Import commands
import { commandsList } from './commands';

// ---- Configuration ----
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!DISCORD_TOKEN) {
  console.error('[Bot] DISCORD_BOT_TOKEN is not set. Please set it in .env');
  process.exit(1);
}

// ---- Initialize Discord Client ----
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});


// ---- Command Registry ----
interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
}

const commands = new Collection<string, Command>();
for (const cmd of commandsList) {
  commands.set(cmd.data.name, cmd as Command);
}

// ---- Services ----
let firstBloodService: FirstBloodService;
let announcementService: AnnouncementService;
let ticketManager: TicketManager;

// ---- Event: Ready ----
client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

  // Write online status
  try {
    const statusPath = path.join(__dirname, '../../data/bot_status.json');
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'online',
      error: null,
      username: client.user?.tag,
      guilds: client.guilds.cache.size,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    console.error('[Bot Error] Failed to write status file:', err);
  }

  // Initialize database
  getDb();

  // Check setup state
  if (!isSetup()) {
    console.log('[Bot] System not set up yet. Bot is in sleep mode.');
    console.log(`[Bot] Complete setup via web dashboard at http://localhost:${process.env.PORT || '7000'}`);
    logEvent(null, 'info', 'startup', 'Bot started in sleep mode (setup not complete)');
    return;
  }

  // Register slash commands globally
  await registerCommands();

  // Initialize services
  ticketManager = new TicketManager(client);
  setTicketManager(ticketManager);

  firstBloodService = new FirstBloodService(client);
  announcementService = new AnnouncementService(client);

  // Initialize Supabase connections for all active guilds
  await supabaseManager.initAll();

  // Start first blood and announcements listeners
  await firstBloodService.startAll();
  await announcementService.startAll();

  logEvent(null, 'info', 'startup', `Bot started. ${supabaseManager.connectionCount} Supabase connection(s) active.`);
  console.log(`[Bot] Ready! ${supabaseManager.connectionCount} Supabase connection(s) active.`);

  // Start config sync polling loop every 10 seconds
  setInterval(async () => {
    try {
      const dbGuilds = getActiveGuilds();
      const activeGuildIds = new Set(dbGuilds.map(g => g.id));

      // 1. Disconnect inactive or deleted guilds
      for (const connectedId of supabaseManager.getConnectedGuilds()) {
        if (!activeGuildIds.has(connectedId)) {
          console.log(`[Bot Sync] Guild ${connectedId} is no longer active. Disconnecting Supabase...`);
          await supabaseManager.disconnect(connectedId);
        }
      }

      // 2. Connect or reload active guilds if configuration/credentials changed
      for (const dbGuild of dbGuilds) {
        const connectedId = dbGuild.id;
        const isConnected = supabaseManager.isConnected(connectedId);
        const existingConfig = supabaseManager.getConfig(connectedId);

        if (!isConnected) {
          console.log(`[Bot Sync] New active guild detected: ${dbGuild.guild_name} (${connectedId}). Connecting...`);
          await supabaseManager.connect(dbGuild);
          firstBloodService.subscribeGuild(dbGuild);
          announcementService.subscribeGuild(dbGuild);
        } else if (existingConfig) {
          // Check if key configurations or credentials changed
          const hasChanged = 
            existingConfig.supabase_url !== dbGuild.supabase_url ||
            existingConfig.supabase_anon_key !== dbGuild.supabase_anon_key ||
            existingConfig.supabase_login_email !== dbGuild.supabase_login_email ||
            existingConfig.supabase_login_password !== dbGuild.supabase_login_password ||
            existingConfig.supabase_turnstile_site_key !== dbGuild.supabase_turnstile_site_key ||
            existingConfig.active_event_id !== dbGuild.active_event_id ||
            existingConfig.enable_firstblood !== dbGuild.enable_firstblood ||
            existingConfig.channel_firstblood !== dbGuild.channel_firstblood ||
            existingConfig.channel_announcements !== dbGuild.channel_announcements ||
            existingConfig.updated_at !== dbGuild.updated_at;

          if (hasChanged) {
            console.log(`[Bot Sync] Configuration updated for guild: ${dbGuild.guild_name} (${connectedId}). Reloading connection...`);
            await supabaseManager.reload(dbGuild);
            firstBloodService.subscribeGuild(dbGuild);
            announcementService.subscribeGuild(dbGuild);
          }
        }
      }
    } catch (syncErr) {
      console.error('[Bot Sync] Error in config sync polling loop:', syncErr);
    }
  }, 10000);
});

// ---- Event: Interaction ----
client.on('interactionCreate', async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[Bot] Error executing command ${interaction.commandName}:`, err);
      const content = '❌ An error occurred while executing this command.';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    // Ticket close → show Modal with reason input
    if (interaction.customId.startsWith('ticket_close_')) {
      if (!ticketManager) return;
      if (!interaction.guildId) return;

      const modal = new ModalBuilder()
        .setCustomId('ticket_close_modal')
        .setTitle('🔒 Close Ticket');

      const reasonInput = new TextInputBuilder()
        .setCustomId('ticket_close_reason')
        .setLabel('Reason for closing (optional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Issue resolved, duplicate ticket...')
        .setRequired(false)
        .setMaxLength(200);

      const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
      return;
    }

    // Ticket claim button
    if (interaction.customId.startsWith('ticket_claim_')) {
      const ticketId = parseInt(interaction.customId.replace('ticket_claim_', ''));
      if (!ticketManager) return;

      const ticket = getTicketByChannel(interaction.channelId);
      if (ticket && interaction.user.id === ticket.user_id) {
        await interaction.reply({ content: '❌ You cannot claim your own ticket.', ephemeral: true });
        return;
      }

      const result = await ticketManager.claimTicket(interaction.channelId, interaction.user.id, interaction.user.username);
      if (!result.success) {
        await interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
        return;
      }

      // Update the embed and components
      const originalEmbed = interaction.message.embeds[0];
      if (!originalEmbed) {
        await interaction.reply({ content: '❌ Original embed not found.', ephemeral: true });
        return;
      }

      // Build a new Embed with the updated status
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .spliceFields(
          originalEmbed.fields.findIndex(f => f.name === 'Status'),
          1,
          { name: 'Status', value: `🟡 In Progress (Claimed by <@${interaction.user.id}>)`, inline: true }
        );

      // Build updated ActionRow
      const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claimed_${ticketId}`)
          .setLabel(`Claimed by ${interaction.user.username}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
          .setEmoji('🙋‍♂️'),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketId}`)
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );

      await interaction.update({
        embeds: [updatedEmbed],
        components: [updatedRow]
      });

      // Post a system message in the channel announcing the claim
      await interaction.followUp({
        content: `🙋‍♂️ <@${interaction.user.id}> has claimed this ticket and will assist you shortly.`
      });
      return;
    }

    // Ticket open panel button -> Show Modal
    if (interaction.customId === 'ticket_open_panel') {
      if (!ticketManager) return;
      if (!interaction.guildId) return;
      
      const modal = new ModalBuilder()
        .setCustomId('ticket_open_modal')
        .setTitle('Open a Support Ticket');

      const subjectInput = new TextInputBuilder()
        .setCustomId('ticket_subject')
        .setLabel('Subject / Short Summary')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., Database connection issue')
        .setRequired(true)
        .setMaxLength(100);

      const descInput = new TextInputBuilder()
        .setCustomId('ticket_description')
        .setLabel('Describe your problem')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Provide details to help staff assist you...')
        .setRequired(true)
        .setMaxLength(1000);

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(subjectInput);
      const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(descInput);

      modal.addComponents(firstRow, secondRow);

      await interaction.showModal(modal);
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'ticket_open_modal') {
      if (!ticketManager) return;
      if (!interaction.guildId) return;
      
      const subject = interaction.fields.getTextInputValue('ticket_subject');
      const description = interaction.fields.getTextInputValue('ticket_description');
      
      await interaction.deferReply({ ephemeral: true });
      
      const result = await ticketManager.createTicketChannel(
        interaction.guildId,
        interaction.user.id,
        interaction.user.username,
        subject,
        description
      );
      
      if ('error' in result) {
        await interaction.editReply(`❌ ${result.error}`);
      } else {
        await interaction.editReply(`✅ Ticket created! Go to <#${result.channelId}>`);
      }
      return;
    }

    // Ticket close modal with reason
    if (interaction.customId === 'ticket_close_modal') {
      if (!ticketManager) return;
      if (!interaction.channelId) return;

      const reason = interaction.fields.getTextInputValue('ticket_close_reason');
      await interaction.deferReply({ ephemeral: true });

      const result = await ticketManager.closeTicket(interaction.channelId, interaction.user.id, reason);

      if (!result.success) {
        await interaction.editReply(`❌ ${result.error}`);
        return;
      }

      await interaction.editReply('🔒 Ticket closed.');
      // Channel will be deleted by closeTicket after 10 seconds
    }
  }
});

// ---- Bot Actions Poller (dashboard → bot channel deletion) ----
setInterval(async () => {
  try {
    const actions = getPendingBotActions();
    for (const action of actions) {
      try {
        if (action.action_type === 'close_channel') {
          const payload = JSON.parse(action.payload) as { channel_id: string; ticket_id: number; closed_by_user_id?: string };
          const channel = await client.channels.fetch(payload.channel_id).catch(() => null);
          if (channel && 'delete' in channel) {
            const { TextChannel } = await import('discord.js');
            if (channel instanceof TextChannel) {
              const { EmbedBuilder } = await import('discord.js');
              const embed = new EmbedBuilder()
                .setColor(0xEF4444)
                .setTitle('🔒 Ticket Closed')
                .setDescription('This ticket has been closed by an administrator via the dashboard.')
                .setFooter({ text: 'This channel will be deleted in 10 seconds.' })
                .setTimestamp();
              await channel.send({ embeds: [embed] }).catch(() => null);
              setTimeout(() => channel.delete('Closed via dashboard').catch(() => null), 10_000);
            }
          }
        } else if (action.action_type === 'send_message') {
          const payload = JSON.parse(action.payload) as { channel_id: string; message_content: string };
          const channel = await client.channels.fetch(payload.channel_id).catch(() => null);
          if (channel && 'send' in channel) {
            const { TextChannel } = await import('discord.js');
            if (channel instanceof TextChannel) {
              await channel.send({ content: payload.message_content });
            }
          }
        }
        completeBotAction(action.id, true);
      } catch (actionErr) {
        console.error(`[Bot Actions] Failed action ${action.id}:`, actionErr);
        completeBotAction(action.id, false);
      }
    }
  } catch (pollErr) {
    console.error('[Bot Actions] Poller error:', pollErr);
  }
}, 5000);

// ---- Event: Message Create (log ticket chats + attachments) ----
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  try {
    const ticket = getTicketByChannel(message.channelId);
    if (!ticket || ticket.status === 'closed') return;

    const avatarUrl = message.author.displayAvatarURL({ forceStatic: false }) || null;
    upsertDiscordUser(message.author.id, message.author.username, avatarUrl);
    const content = message.content || null;

    // Handle attachments (images + files, max 10MB each)
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first()!;
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB

      if (attachment.size <= MAX_SIZE) {
        try {
          const https = require('https');
          const http = require('http');
          const fs = require('fs');
          const path = require('path');

          const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/nxbot.db');
          const attachDir = path.join(path.dirname(dbPath), 'attachments');
          if (!fs.existsSync(attachDir)) fs.mkdirSync(attachDir, { recursive: true });

          // Unique filename: timestamp_originalname
          const origName = attachment.name;
          const uniqueName = `${Date.now()}_${origName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const destPath = path.join(attachDir, uniqueName);

          // Download the file
          await new Promise<void>((resolve, reject) => {
            const fileStream = fs.createWriteStream(destPath);
            const proto = attachment.url.startsWith('https') ? https : http;
            proto.get(attachment.url, (res: any) => {
              res.pipe(fileStream);
              fileStream.on('finish', () => { fileStream.close(); resolve(); });
              fileStream.on('error', reject);
            }).on('error', reject);
          });

          saveTicketMessage(
            ticket.id, message.author.id, message.author.username,
            avatarUrl, content, uniqueName, origName, attachment.size,
          );
        } catch (dlErr) {
          console.error('[Bot] Failed to download ticket attachment:', dlErr);
          // Still save the message text even if attachment download fails
          saveTicketMessage(ticket.id, message.author.id, message.author.username, avatarUrl, content);
        }
      } else {
        // File too large — log message with note
        const note = content ? `${content}\n\n⚠️ [Attachment too large to save: ${attachment.name}]` : `⚠️ [Attachment too large to save: ${attachment.name}]`;
        saveTicketMessage(ticket.id, message.author.id, message.author.username, avatarUrl, note);
      }
    } else if (content) {
      // Text-only message
      saveTicketMessage(ticket.id, message.author.id, message.author.username, avatarUrl, content);
    }
  } catch (err) {
    console.error('[Bot] Failed to log ticket message:', err);
  }
});

// ---- Event: Guild Create (bot joins new server) ----
client.on('guildCreate', (guild) => {
  console.log(`[Bot] Joined new guild: ${guild.name} (${guild.id})`);
  logEvent(guild.id, 'info', 'guild_join', `Joined guild: ${guild.name}`);
});

// ---- Event: Guild Delete (bot leaves/kicked from server) ----
client.on('guildDelete', (guild) => {
  console.log(`[Bot] Left guild: ${guild.name} (${guild.id})`);
  logEvent(guild.id, 'info', 'guild_leave', `Left guild: ${guild.name}`);

  // Disconnect Supabase for this guild
  supabaseManager.disconnect(guild.id);
});

// ---- Register Slash Commands ----
async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);
  const commandData = commands.map(cmd => cmd.data.toJSON());

  try {
    console.log(`[Bot] Registering ${commandData.length} slash command(s) globally...`);

    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commandData },
    );

    console.log('[Bot] Global slash commands registered.');

    // Clean up guild-specific slash commands for all currently connected guilds to prevent duplication
    const guildIds = client.guilds.cache.map(g => g.id);
    if (guildIds.length > 0) {
      console.log(`[Bot] Cleaning up guild-specific commands for ${guildIds.length} guild(s)...`);
      for (const guildId of guildIds) {
        try {
          await rest.put(
            Routes.applicationGuildCommands(client.user!.id, guildId),
            { body: [] },
          );
        } catch (guildErr) {
          console.warn(`[Bot] Could not clean up guild commands for guild ${guildId}:`, guildErr);
        }
      }
      console.log('[Bot] Guild-specific commands cleaned up.');
    }
  } catch (err) {
    console.error('[Bot] Failed to register commands:', err);
  }
}

// ---- Graceful Shutdown ----
async function shutdown(signal: string): Promise<void> {
  console.log(`[Bot] Received ${signal}. Shutting down gracefully...`);

  await supabaseManager.disconnectAll();
  client.destroy();
  closeDb();

  console.log('[Bot] Goodbye!');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ---- Global Error Handling ----
process.on('uncaughtException', (err) => {
  console.error('[Bot Uncaught] error:', err);
  try {
    const statusPath = path.join(__dirname, '../../data/bot_status.json');
    let errMsg = err.message || String(err);
    if (errMsg.includes('Used disallowed intents') || errMsg.includes('disallowed intents')) {
      errMsg = 'Disallowed intents: Enable "Message Content Intent" in Discord Developer Portal under Bot settings.';
    }
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'error',
      error: errMsg,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (writeErr) {
    console.error('[Bot Uncaught] failed to write status:', writeErr);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Bot Unhandled Rejection] reason:', reason);
  try {
    const statusPath = path.join(__dirname, '../../data/bot_status.json');
    const reasonStr = String(reason);
    let errMsg = reasonStr;
    if (reasonStr.includes('Used disallowed intents') || reasonStr.includes('disallowed intents')) {
      errMsg = 'Disallowed intents: Enable "Message Content Intent" in Discord Developer Portal under Bot settings.';
    }
    fs.writeFileSync(statusPath, JSON.stringify({
      status: 'error',
      error: errMsg,
      updatedAt: new Date().toISOString()
    }, null, 2));
  } catch (writeErr) {
    console.error('[Bot Unhandled Rejection] failed to write status:', writeErr);
  }
  process.exit(1);
});

// ---- Start ----
console.log('[Bot] Starting NXBot Discord Bot...');
client.login(DISCORD_TOKEN);
