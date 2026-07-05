import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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
    return res.status === 200 || res.status === 401 || res.status === 403 || res.status === 406;
  } catch (err) {
    return false;
  }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const conn = db.prepare('SELECT * FROM supabase_connections WHERE id = ?').get(params.id);
    if (!conn) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
    }
    return NextResponse.json(conn);
  } catch (err: any) {
    console.error('[API Database Single GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email,
      supabase_login_password,
      supabase_turnstile_site_key,
      captchaToken
    } = body;

    if (!name || !supabase_url || !supabase_anon_key) {
      return NextResponse.json({ error: 'Name, Supabase URL, and Anon Key are required.' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT * FROM supabase_connections WHERE id = ?').get(params.id) as any;
    if (!existing) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
    }

    // Only test connection if credentials actually changed
    const credentialsChanged =
      existing.supabase_url !== supabase_url ||
      existing.supabase_anon_key !== supabase_anon_key ||
      existing.supabase_login_email !== supabase_login_email ||
      existing.supabase_login_password !== supabase_login_password ||
      existing.supabase_turnstile_site_key !== supabase_turnstile_site_key;

    if (credentialsChanged) {
      // 1. Test basic network connectivity
      const isConn = await testSupabaseConnection(supabase_url, supabase_anon_key);
      if (!isConn) {
        return NextResponse.json({ error: 'Failed to connect to Supabase. Check URL and Anon Key.' }, { status: 400 });
      }

      // 2. Test User authentication if credentials are supplied
      if (supabase_login_email && supabase_login_password) {
        try {
          const client = createClient(supabase_url, supabase_anon_key, {
            auth: { persistSession: false }
          });
          const { error: authError } = await client.auth.signInWithPassword({
            email: supabase_login_email,
            password: supabase_login_password,
            options: {
              ...(captchaToken && { captchaToken })
            }
          });
          if (authError) {
            return NextResponse.json({ error: `Supabase login authentication failed: ${authError.message}` }, { status: 400 });
          }
        } catch (err: any) {
          return NextResponse.json({ error: `Supabase auth verification error: ${err.message}` }, { status: 400 });
        }
      }
    }

    db.prepare(`
      UPDATE supabase_connections SET
        name = ?,
        supabase_url = ?,
        supabase_anon_key = ?,
        supabase_login_email = ?,
        supabase_login_password = ?,
        supabase_turnstile_site_key = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email || null,
      supabase_login_password || null,
      supabase_turnstile_site_key || null,
      params.id
    );

    return NextResponse.json({ success: true, message: 'Database connection updated successfully.' });
  } catch (err: any) {
    console.error('[API Database Single PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    
    // Explicitly nullify foreign keys in case foreign_keys pragma is not active in SQLite runtime
    db.prepare('UPDATE guilds SET supabase_connection_id = NULL WHERE supabase_connection_id = ?').run(params.id);
    db.prepare('DELETE FROM supabase_connections WHERE id = ?').run(params.id);

    return NextResponse.json({ success: true, message: 'Database connection deleted successfully.' });
  } catch (err: any) {
    console.error('[API Database Single DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
