import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Helper to test Supabase connection
async function testSupabaseConnection(url: string, key: string): Promise<boolean> {
  try {
    const cleanUrl = url.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/challenges?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
    });
    // RLS might return 401 or 403 or empty array 200, which are all fine (it means credentials worked).
    // If it's a completely invalid url/key, it will throw network error or 400 or 404 (bad path).
    return res.status === 200 || res.status === 401 || res.status === 403 || res.status === 406;
  } catch (err) {
    return false;
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const servers = db.prepare('SELECT * FROM guilds ORDER BY created_at DESC').all();
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
      id,
      guild_name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email,
      supabase_login_password,
      channel_firstblood,
      channel_scoreboard,
      channel_announcements,
      channel_ticket_category,
      channel_ticket_logs,
      enable_firstblood,
      enable_scoreboard,
      enable_tickets,
      enable_realtime,
      active_event_id,
    } = body;

    // Validation
    if (!id || !guild_name || !supabase_url || !supabase_anon_key) {
      return NextResponse.json({ error: 'ID, Guild Name, Supabase URL, and Anon Key are required.' }, { status: 400 });
    }

    // Verify Supabase credentials
    const isConn = await testSupabaseConnection(supabase_url, supabase_anon_key);
    if (!isConn) {
      return NextResponse.json({ error: 'Failed to connect to Supabase. Please verify URL and Anon Key.' }, { status: 400 });
    }

    const db = getDb();
    
    // Check if guild already exists
    const existing = db.prepare('SELECT id FROM guilds WHERE id = ?').get(id);
    if (existing) {
      return NextResponse.json({ error: `Server with ID ${id} already exists.` }, { status: 400 });
    }

    db.prepare(`
      INSERT INTO guilds (
        id, guild_name, supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password,
        channel_firstblood, channel_scoreboard, channel_announcements, channel_ticket_category, channel_ticket_logs,
        enable_firstblood, enable_scoreboard, enable_tickets, enable_realtime, active_event_id, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      id,
      guild_name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email || null,
      supabase_login_password || null,
      channel_firstblood || null,
      channel_scoreboard || null,
      channel_announcements || null,
      channel_ticket_category || null,
      channel_ticket_logs || null,
      enable_firstblood ? 1 : 0,
      enable_scoreboard ? 1 : 0,
      enable_tickets ? 1 : 0,
      enable_realtime ? 1 : 0,
      active_event_id || null
    );

    // Try to trigger bot reload if bot container is active and exposes an API,
    // or since they share database, bot will reload when database guild list changes/polls
    // or when bot handles guildCreate.

    return NextResponse.json({ success: true, message: 'Server added successfully.' });
  } catch (err: any) {
    console.error('[API Servers POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
