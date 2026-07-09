import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Discord Bot Token is not configured.' }, { status: 500 });
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${params.id}`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: 'Guild not found. Bot may not be in this server.' }, { status: 404 });
      }
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errData.message || `Discord API error (Status: ${res.status})`
      }, { status: 400 });
    }

    const guild = await res.json();
    return NextResponse.json({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      iconUrl: guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}${guild.icon.startsWith('a_') ? '.gif' : '.png'}`
        : null,
      memberCount: guild.approximate_member_count ?? null,
    });
  } catch (err: any) {
    console.error('[API Discord Guild Info] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
