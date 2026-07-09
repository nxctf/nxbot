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

    if (!guild.channel_ticket_panel) {
      return NextResponse.json({ error: 'Please configure and save the Ticket Panel Channel first.' }, { status: 400 });
    }

    // Call Discord REST API to post the embed panel
    const res = await fetch(`https://discord.com/api/v10/channels/${guild.channel_ticket_panel}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            color: 5793266, // 0x5865F2 (blurple)
            description: '🎫 Klik tombol di bawah untuk membuka tiket.',
          }
        ],
        components: [
          {
            type: 1, // ActionRow
            components: [
              {
                type: 2, // Button
                style: 1, // Primary
                label: 'Open a Ticket',
                emoji: {
                  name: '🎫'
                },
                custom_id: 'ticket_open_panel'
              }
            ]
          }
        ]
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errData.message || `Failed to deploy ticket panel (Status: ${res.status}). Make sure the bot has permission to post in the selected channel.`,
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Ticket panel embed deployed successfully.' });
  } catch (err: any) {
    console.error('[API Deploy Panel] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
