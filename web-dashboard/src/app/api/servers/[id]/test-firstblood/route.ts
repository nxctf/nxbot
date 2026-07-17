import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TestFirstBloodGuild {
  channel_firstblood: string | null;
  firstblood_ping_roles: string | null;
  firstblood_ping_everyone: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: guildId } = await params;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json({ error: 'Discord Bot Token is not configured.' }, { status: 500 });
    }

    const db = getDb();
    const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId) as TestFirstBloodGuild | undefined;

    if (!guild) {
      return NextResponse.json({ error: 'Server configuration not found.' }, { status: 404 });
    }

    if (!guild.channel_firstblood) {
      return NextResponse.json({ error: 'Please configure and save the First Blood Channel ID first.' }, { status: 400 });
    }

    const pingRoleIds = guild.firstblood_ping_roles ? String(guild.firstblood_ping_roles).split(',').filter(Boolean) : [];
    const shouldPingEveryone = guild.firstblood_ping_everyone === 1;
    const mentionTarget = shouldPingEveryone
      ? '@everyone'
      : pingRoleIds.map((roleId) => `<@&${roleId}>`).join(' ');
    const mentionContent = mentionTarget ? `${mentionTarget} First blood alert` : '';

    const res = await fetch(`https://discord.com/api/v10/channels/${guild.channel_firstblood}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: mentionContent || undefined,
        embeds: [
          {
            color: 14431526,
            description: '🩸 **FIRST BLOOD** — Peserta **TestSolver** berhasil first blood pada challenge **Test Challenge** (Web Exploitation)',
          }
        ],
        allowed_mentions: shouldPingEveryone
          ? { parse: ['everyone'] }
          : { parse: [], roles: pingRoleIds, users: [] },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errData.message || `Failed to send test message (Status: ${res.status}). Make sure the bot has permission to post in the selected channel.`,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Test first blood notification sent successfully.' });
  } catch (err: unknown) {
    console.error('[API Test FirstBlood] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
