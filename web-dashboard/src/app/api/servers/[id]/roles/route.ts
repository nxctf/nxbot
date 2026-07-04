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
      return NextResponse.json({ error: 'Discord Bot Token is not configured.' }, { status: 500 });
    }

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: errData.message || `Failed to fetch roles (Status: ${res.status}).`,
      }, { status: res.status === 404 ? 404 : 400 });
    }

    const roles = await res.json();

    // Filter out @everyone role (same id as guild id) and managed bot roles
    const filteredRoles = roles
      .filter((r: any) => r.id !== guildId && !r.managed)
      .map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        position: r.position,
      }))
      .sort((a: any, b: any) => b.position - a.position); // Highest position first

    return NextResponse.json(filteredRoles);
  } catch (err: any) {
    console.error('[API Guild Roles] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
