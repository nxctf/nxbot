import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

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

    const { id } = params;
    const db = getDb();
    
    // Join with connection details so the front-end components receive the full mapped credential keys
    const server = db.prepare(`
      SELECT g.*, 
             c.supabase_url, c.supabase_anon_key, c.supabase_login_email, c.supabase_login_password,
             c.supabase_access_token, c.supabase_refresh_token, c.supabase_turnstile_site_key,
             c.name as supabase_connection_name
      FROM guilds g
      LEFT JOIN supabase_connections c ON g.supabase_connection_id = c.id
      WHERE g.id = ?
    `).get(id);

    if (!server) {
      return NextResponse.json({ error: 'Server not found.' }, { status: 404 });
    }

    return NextResponse.json(server);
  } catch (err: any) {
    console.error('[API Server GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      guild_name,
      supabase_connection_id,
      channel_firstblood,
      channel_scoreboard,
      channel_announcements,
      channel_ticket_category,
      channel_ticket_logs,
      channel_ticket_panel,
      ticket_ping_roles,
      ticket_required_roles,
      ticket_welcome_message,
      firstblood_ping_roles,
      firstblood_ping_users,
      firstblood_mention_solver,
      firstblood_ping_everyone,
      announcement_ping_roles,
      announcement_ping_users,
      announcement_ping_everyone,
      scoreboard_update_interval_seconds,
      scoreboard_update_on_solve,
      enable_firstblood,
      enable_scoreboard,
      enable_tickets,
      enable_realtime,
      active_event_id,
      is_active,
    } = body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Server not found.' }, { status: 404 });
    }

    db.prepare(`
      UPDATE guilds SET
        guild_name = ?,
        supabase_connection_id = ?,
        channel_firstblood = ?,
        channel_scoreboard = ?,
        channel_announcements = ?,
        channel_ticket_category = ?,
        channel_ticket_logs = ?,
        channel_ticket_panel = ?,
        ticket_ping_roles = ?,
        ticket_required_roles = ?,
        ticket_welcome_message = ?,
        firstblood_ping_roles = ?,
        firstblood_ping_users = ?,
        firstblood_mention_solver = ?,
        firstblood_ping_everyone = ?,
        announcement_ping_roles = ?,
        announcement_ping_users = ?,
        announcement_ping_everyone = ?,
        scoreboard_update_interval_seconds = ?,
        scoreboard_update_on_solve = ?,
        enable_firstblood = ?,
        enable_scoreboard = ?,
        enable_tickets = ?,
        enable_realtime = ?,
        active_event_id = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      guild_name,
      supabase_connection_id || null,
      channel_firstblood || null,
      channel_scoreboard || null,
      channel_announcements || null,
      channel_ticket_category || null,
      channel_ticket_logs || null,
      channel_ticket_panel || null,
      ticket_ping_roles || null,
      ticket_required_roles || null,
      ticket_welcome_message || null,
      firstblood_ping_roles || null,
      firstblood_ping_users || null,
      firstblood_mention_solver ? 1 : 0,
      firstblood_ping_everyone ? 1 : 0,
      announcement_ping_roles || null,
      announcement_ping_users || null,
      announcement_ping_everyone ? 1 : 0,
      Math.max(600, Number(scoreboard_update_interval_seconds || 600)),
      scoreboard_update_on_solve ? 1 : 0,
      enable_firstblood ? 1 : 0,
      enable_scoreboard ? 1 : 0,
      enable_tickets ? 1 : 0,
      enable_realtime ? 1 : 0,
      active_event_id || null,
      is_active ? 1 : 0,
      id
    );

    return NextResponse.json({ success: true, message: 'Server configuration updated.' });
  } catch (err: any) {
    console.error('[API Server PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const db = getDb();

    const existing = db.prepare('SELECT id FROM guilds WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Server not found.' }, { status: 404 });
    }

    db.prepare('DELETE FROM guilds WHERE id = ?').run(id);

    return NextResponse.json({ success: true, message: 'Server deleted from bot configuration.' });
  } catch (err: any) {
    console.error('[API Server DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
