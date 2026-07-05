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
    const servers = db.prepare(`
      SELECT g.*, c.supabase_url, c.name as supabase_connection_name
      FROM guilds g
      LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
      ORDER BY g.created_at DESC
    `).all();
    return NextResponse.json(servers);
  } catch (err: any) {
    console.error('[API Servers GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id, // Discord Guild ID snowflake
      guild_name,
      supabase_connection_id,
      enable_firstblood,
      enable_scoreboard,
      enable_tickets
    } = body;

    // Validation
    if (!id || !guild_name || !supabase_connection_id) {
      return NextResponse.json({ error: 'ID, Guild Name, and Supabase Connection are required.' }, { status: 400 });
    }

    const db = getDb();

    // Check if guild with same ID already exists (as primary key id)
    const existing = db.prepare('SELECT id FROM guilds WHERE id = ?').get(id);
    if (existing) {
      return NextResponse.json({ error: 'A configuration for this Discord Guild ID already exists.' }, { status: 400 });
    }

    // Insert server config
    db.prepare(`
      INSERT INTO guilds (
        id, guild_id, guild_name, supabase_connection_id,
        enable_firstblood, enable_scoreboard, enable_tickets, enable_realtime, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(
      id,
      id,
      guild_name,
      supabase_connection_id,
      enable_firstblood ? 1 : 0,
      enable_scoreboard ? 1 : 0,
      enable_tickets ? 1 : 0
    );

    return NextResponse.json({ success: true, message: 'Server registered successfully.' });
  } catch (err: any) {
    console.error('[API Servers POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
