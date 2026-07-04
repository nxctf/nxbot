import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import { getDb, isSetup, getActiveGuilds, logEvent, closeDb } from './db/local';
import { supabaseManager } from './services/supabase-manager';
import { FirstBloodService } from './services/firstblood';
import { TicketManager } from './services/ticket-manager';
import { setTicketManager } from './commands/ticket';

// Import commands
import * as scoreboardCmd from './commands/scoreboard';
import * as challengesCmd from './commands/challenges';
import * as ctfInfoCmd from './commands/ctf-info';
import * as ticketCmd from './commands/ticket';
import * as firstbloodCmd from './commands/firstblood';

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
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// ---- Command Registry ----
interface Command {
  data: any;
  execute: (interaction: any) => Promise<void>;
}

const commands = new Collection<string, Command>();
commands.set(scoreboardCmd.data.name, scoreboardCmd);
commands.set(challengesCmd.data.name, challengesCmd);
commands.set(ctfInfoCmd.data.name, ctfInfoCmd);
commands.set(ticketCmd.data.name, ticketCmd);
commands.set(firstbloodCmd.data.name, firstbloodCmd);

// ---- Services ----
let firstBloodService: FirstBloodService;
let ticketManager: TicketManager;

// ---- Event: Ready ----
client.once('ready', async () => {
  console.log(`[Bot] Logged in as ${client.user?.tag}`);
  console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);

  // Initialize database
  getDb();

  // Check setup state
  if (!isSetup()) {
    console.log('[Bot] System not set up yet. Bot is in sleep mode.');
    console.log('[Bot] Complete setup via web dashboard at http://localhost:3000');
    logEvent(null, 'info', 'startup', 'Bot started in sleep mode (setup not complete)');
    return;
  }

  // Register slash commands globally
  await registerCommands();

  // Initialize services
  ticketManager = new TicketManager(client);
  setTicketManager(ticketManager);

  firstBloodService = new FirstBloodService(client);

  // Initialize Supabase connections for all active guilds
  await supabaseManager.initAll();

  // Start first blood listeners
  await firstBloodService.startAll();

  logEvent(null, 'info', 'startup', `Bot started. ${supabaseManager.connectionCount} Supabase connection(s) active.`);
  console.log(`[Bot] Ready! ${supabaseManager.connectionCount} Supabase connection(s) active.`);
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

  // Handle button interactions (ticket close buttons)
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('ticket_close_')) {
      if (!ticketManager) return;
      await ticketManager.closeTicket(interaction.channelId, interaction.user.id);
    }
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
    console.log(`[Bot] Registering ${commandData.length} slash command(s)...`);

    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commandData },
    );

    console.log('[Bot] Slash commands registered globally.');
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

// ---- Start ----
console.log('[Bot] Starting NXBot Discord Bot...');
client.login(DISCORD_TOKEN);
