import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TestAnnouncementGuild {
  channel_announcements: string | null;
  announcement_ping_roles: string | null;
  announcement_ping_everyone: number;
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
    const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId) as TestAnnouncementGuild | undefined;

    if (!guild) {
      return NextResponse.json({ error: 'Server configuration not found.' }, { status: 404 });
    }

    if (!guild.channel_announcements) {
      return NextResponse.json({ error: 'Please configure and save the CTF Announcements Channel ID first.' }, { status: 400 });
    }

    const pingRoleIds = guild.announcement_ping_roles ? String(guild.announcement_ping_roles).split(',').filter(Boolean) : [];
    const shouldPingEveryone = guild.announcement_ping_everyone === 1;
    const mentionTarget = shouldPingEveryone
      ? '@everyone'
      : pingRoleIds.map((roleId) => `<@&${roleId}>`).join(' ');
    const title = 'Announcement Test';
    const mentionContent = mentionTarget ? `📢 ${mentionTarget}` : '';

    const res = await fetch(`https://discord.com/api/v10/channels/${guild.channel_announcements}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: mentionContent || undefined,
        embeds: [
          {
            color: 3719160,
            title,
            description: 'This is a test announcement to verify the channel integration is working correctly.',
            footer: { text: 'NXCTF Announcements' },
            timestamp: new Date().toISOString(),
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

    return NextResponse.json({ success: true, message: 'Test announcement notification sent successfully.' });
  } catch (err: unknown) {
    console.error('[API Test Announcement] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
