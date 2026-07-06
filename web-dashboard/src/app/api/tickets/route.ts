import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId');
    const status = searchParams.get('status');

    const db = getDb();
    
    let query = `
      SELECT t.*, g.guild_name,
             (SELECT avatar_url FROM ticket_messages WHERE ticket_id = t.id AND user_id = t.user_id AND avatar_url IS NOT NULL LIMIT 1) AS user_avatar
      FROM tickets t 
      JOIN guilds g ON t.guild_id = g.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (guildId) {
      conditions.push('t.guild_id = ?');
      params.push(guildId);
    }

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY t.created_at DESC';

    const tickets = db.prepare(query).all(...params);
    return NextResponse.json(tickets);
  } catch (err: any) {
    console.error('[API Tickets GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
