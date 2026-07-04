import 'dotenv/config';
import { REST, Routes } from 'discord.js';

import * as scoreboardCmd from './commands/scoreboard';
import * as challengesCmd from './commands/challenges';
import * as ctfInfoCmd from './commands/ctf-info';
import * as ticketCmd from './commands/ticket';
import * as firstbloodCmd from './commands/firstblood';

/**
 * Standalone script to deploy slash commands to Discord.
 * Run this once or when commands change:
 *   npx tsx src/deploy-commands.ts
 */

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  console.error('DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set in .env');
  process.exit(1);
}

const commands = [
  scoreboardCmd.data.toJSON(),
  challengesCmd.data.toJSON(),
  ctfInfoCmd.data.toJSON(),
  ticketCmd.data.toJSON(),
  firstbloodCmd.data.toJSON(),
];

async function deploy() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN!);

  try {
    console.log(`Deploying ${commands.length} slash commands...`);

    await rest.put(Routes.applicationCommands(CLIENT_ID!), {
      body: commands,
    });

    console.log('Successfully deployed slash commands!');
  } catch (err) {
    console.error('Failed to deploy commands:', err);
  }
}

deploy();
