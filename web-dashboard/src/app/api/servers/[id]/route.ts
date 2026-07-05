import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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
    return res.status === 200 || res.status === 401 || res.status === 403 || res.status === 406;
  } catch (err) {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const server = db.prepare('SELECT * FROM guilds WHERE id = ?').get(id);

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      guild_name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email,
      supabase_login_password,
      supabase_turnstile_site_key,
      captchaToken,
      channel_firstblood,
      channel_scoreboard,
      channel_announcements,
      channel_ticket_category,
      channel_ticket_logs,
      channel_ticket_panel,
      ticket_ping_roles,
      ticket_required_roles,
      ticket_welcome_message,
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

    // Verify Supabase credentials if they are changed
    if (supabase_url !== existing.supabase_url || supabase_anon_key !== existing.supabase_anon_key) {
      const isConn = await testSupabaseConnection(supabase_url, supabase_anon_key);
      if (!isConn) {
        return NextResponse.json({ error: 'Failed to connect to Supabase with new credentials.' }, { status: 400 });
      }
    }

    let access_token = existing.supabase_access_token || null;
    let refresh_token = existing.supabase_refresh_token || null;

    if (supabase_login_email && (supabase_login_password || existing.supabase_login_password)) {
      const emailToUse = supabase_login_email;
      const passwordToUse = supabase_login_password || existing.supabase_login_password;

      try {
        const client = createClient(supabase_url, supabase_anon_key, {
          auth: { persistSession: false }
        });
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: emailToUse,
          password: passwordToUse,
          options: {
            ...(captchaToken && { captchaToken })
          }
        });
        if (authError) {
          return NextResponse.json({ error: `Supabase authentication failed: ${authError.message}` }, { status: 400 });
        }
        access_token = authData.session?.access_token || null;
        refresh_token = authData.session?.refresh_token || null;
      } catch (err: any) {
        return NextResponse.json({ error: `Supabase auth error: ${err.message}` }, { status: 400 });
      }
    } else {
      access_token = null;
      refresh_token = null;
    }

    if (is_active) {
      db.prepare('UPDATE guilds SET is_active = 0 WHERE guild_id = ? AND id != ?').run(existing.guild_id || existing.id, id);
    }

    db.prepare(`
      UPDATE guilds SET
        guild_name = ?,
        supabase_url = ?,
        supabase_anon_key = ?,
        supabase_login_email = ?,
        supabase_login_password = ?,
        supabase_access_token = ?,
        supabase_refresh_token = ?,
        supabase_turnstile_site_key = ?,
        channel_firstblood = ?,
        channel_scoreboard = ?,
        channel_announcements = ?,
        channel_ticket_category = ?,
        channel_ticket_logs = ?,
        channel_ticket_panel = ?,
        ticket_ping_roles = ?,
        ticket_required_roles = ?,
        ticket_welcome_message = ?,
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
      supabase_url,
      supabase_anon_key,
      supabase_login_email || null,
      supabase_login_password || null,
      access_token,
      refresh_token,
      supabase_turnstile_site_key || null,
      channel_firstblood || null,
      channel_scoreboard || null,
      channel_announcements || null,
      channel_ticket_category || null,
      channel_ticket_logs || null,
      channel_ticket_panel || null,
      ticket_ping_roles || null,
      ticket_required_roles || null,
      ticket_welcome_message || null,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
