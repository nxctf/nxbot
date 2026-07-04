import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
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
      return NextResponse.json({ error: 'Discord Bot Token is not configured on the dashboard.' }, { status: 500 });
    }

    // Fetch channels from Discord REST API v10
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 }, // Do not cache fetch in Next.js
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({ 
        error: errData.message || `Failed to fetch channels from Discord (Status: ${res.status}).`,
        code: res.status 
      }, { status: res.status === 404 ? 404 : 400 });
    }

    const channels = await res.json();
    
    // Map and filter to return only text channels (type 0) and category channels (type 4)
    const filteredChannels = channels
      .filter((c: any) => c.type === 0 || c.type === 4)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type, // 0 = Text, 4 = Category
        parentId: c.parent_id || null,
      }));

    return NextResponse.json(filteredChannels);
  } catch (err: any) {
    console.error('[API Guild Channels] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
