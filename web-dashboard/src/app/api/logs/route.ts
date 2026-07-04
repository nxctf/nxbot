import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const logs = db.prepare(`
      SELECT l.*, g.guild_name 
      FROM bot_logs l 
      LEFT JOIN guilds g ON l.guild_id = g.id 
      ORDER BY l.created_at DESC 
      LIMIT 100
    `).all();

    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('[API Logs GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
