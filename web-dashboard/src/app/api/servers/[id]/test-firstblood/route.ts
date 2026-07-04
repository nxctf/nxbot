import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const guild = db.prepare('SELECT * FROM guilds WHERE id = ?').get(guildId) as any;

    if (!guild) {
      return NextResponse.json({ error: 'Server configuration not found.' }, { status: 404 });
    }

    if (!guild.channel_firstblood) {
      return NextResponse.json({ error: 'Please configure and save the First Blood Channel ID first.' }, { status: 400 });
    }

    // Send a mock first blood notification
    const res = await fetch(`https://discord.com/api/v10/channels/${guild.channel_firstblood}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            title: '🩸 First Blood Test Notification',
            description: `**NXBot** has successfully verified access to this channel.\n\n` +
                         `**Challenge:** \`Test Challenge (100 pts)\`\n` +
                         `**Solver:** \`@TestSolver\`\n` +
                         `**Category:** \`Web Exploitation\``,
            color: 15548997, // Red
            footer: {
              text: 'NXBot Verification Service',
            },
            timestamp: new Date().toISOString(),
          }
        ]
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errData.message || `Failed to send test message (Status: ${res.status}). Make sure the bot has permission to post in the selected channel.`,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Test first blood notification sent successfully.' });
  } catch (err: any) {
    console.error('[API Test FirstBlood] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
