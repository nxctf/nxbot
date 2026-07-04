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

    if (!guild.channel_scoreboard) {
      return NextResponse.json({ error: 'Please configure and save the Live Scoreboard Channel ID first.' }, { status: 400 });
    }

    // 1. Fetch Leaderboard Data from Supabase RPC Function
    const cleanUrl = guild.supabase_url.replace(/\/$/, '');
    const supabaseRes = await fetch(
      `${cleanUrl}/rest/v1/rpc/get_leaderboard`,
      {
        method: 'POST',
        headers: {
          'apikey': guild.supabase_anon_key,
          'Authorization': `Bearer ${guild.supabase_anon_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit_rows: 15,
          offset_rows: 0,
          p_event_id: guild.active_event_id || null,
          p_event_mode: guild.active_event_id ? 'equals' : 'any'
        }),
      }
    );

    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      console.error('[Scoreboard] Supabase RPC failed:', errText);
      return NextResponse.json({ error: 'Failed to fetch scoreboard data from Supabase CTF.' }, { status: 400 });
    }

    const leaderboard = await supabaseRes.json();

    // 2. Fetch active event name if configured
    let eventName = 'CTF';
    if (guild.active_event_id) {
      try {
        const eventRes = await fetch(
          `${cleanUrl}/rest/v1/events?select=name&id=eq.${guild.active_event_id}&limit=1`,
          {
            method: 'GET',
            headers: {
              'apikey': guild.supabase_anon_key,
              'Authorization': `Bearer ${guild.supabase_anon_key}`,
            },
          }
        );
        if (eventRes.ok) {
          const events = await eventRes.json();
          if (events && events[0]) {
            eventName = events[0].name;
          }
        }
      } catch (err) {
        console.warn('Could not fetch event name:', err);
      }
    }

    // 3. Process scoreboard entries
    const scoreboard = leaderboard
      .map((entry: any) => ({
        username: entry.username,
        score: Number(entry.score || 0),
        rank: Number(entry.rank || 0),
      }))
      .filter((u: any) => u.score > 0);

    // 4. Construct Scoreboard Embed lines
    let scoreboardDescription = '📊 No solves yet. Be the first!';
    if (scoreboard.length > 0) {
      const medals = ['🥇', '🥈', '🥉'];
      const lines = scoreboard.map((entry: any, i: number) => {
        const medal = i < 3 ? medals[i] : `\`${i + 1}.\``;
        return `${medal} **${entry.username}** — ${entry.score} pts`;
      });
      scoreboardDescription = lines.join('\n');
    }

    const embedPayload = {
      embeds: [
        {
          title: `🏆 ${eventName} — Live Scoreboard`,
          description: scoreboardDescription,
          color: 16097035, // 0xF59E0B (amber)
          footer: {
            text: `${guild.guild_name} • Live Updates`,
          },
          timestamp: new Date().toISOString(),
        }
      ]
    };

    let deployedMessageId = guild.scoreboard_message_id;
    let messagePosted = false;

    // 5. Try updating existing message if ID exists
    if (deployedMessageId) {
      try {
        const patchRes = await fetch(
          `https://discord.com/api/v10/channels/${guild.channel_scoreboard}/messages/${deployedMessageId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bot ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(embedPayload),
          }
        );

        if (patchRes.ok) {
          messagePosted = true;
        } else {
          // If message was deleted (404), reset message ID so we post a new one below
          if (patchRes.status === 404) {
            deployedMessageId = null;
          } else {
            const errData = await patchRes.json().catch(() => ({}));
            return NextResponse.json({
              error: errData.message || `Failed to update live scoreboard message (Status: ${patchRes.status}).`,
            }, { status: 400 });
          }
        }
      } catch (err) {
        console.warn('Error patching existing scoreboard message, falling back to posting:', err);
        deployedMessageId = null;
      }
    }

    // 6. Post new message if not updated
    if (!messagePosted) {
      const postRes = await fetch(`https://discord.com/api/v10/channels/${guild.channel_scoreboard}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(embedPayload),
      });

      if (!postRes.ok) {
        const errData = await postRes.json().catch(() => ({}));
        return NextResponse.json({
          error: errData.message || `Failed to deploy scoreboard message (Status: ${postRes.status}). Make sure the bot has permission to post in the selected channel.`,
        }, { status: 400 });
      }

      const newMsg = await postRes.json();
      deployedMessageId = newMsg.id;

      // Update message ID in local DB
      db.prepare('UPDATE guilds SET scoreboard_message_id = ? WHERE id = ?').run(deployedMessageId, guildId);
    }

    return NextResponse.json({
      success: true,
      message: messagePosted ? 'Live scoreboard updated successfully.' : 'Live scoreboard deployed successfully.',
    });
  } catch (err: any) {
    console.error('[API Deploy Scoreboard] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
