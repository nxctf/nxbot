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

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const conns = db.prepare('SELECT * FROM supabase_connections ORDER BY created_at DESC').all() as any[];
    // Sanitize: don't leak raw tokens/passwords to frontend
    const sanitized = conns.map(c => ({
      ...c,
      supabase_login_password: c.supabase_login_password ? '••••••••' : null,
      supabase_access_token: c.supabase_access_token ? '(active)' : null,
      supabase_refresh_token: c.supabase_refresh_token ? '(active)' : null,
    }));
    return NextResponse.json(sanitized);
  } catch (err: any) {
    console.error('[API Databases GET] Error:', err);
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

    // 1. Test basic network connectivity
    const isConn = await testSupabaseConnection(supabase_url, supabase_anon_key);
    if (!isConn) {
      return NextResponse.json({ error: 'Failed to connect to Supabase. Check URL and Anon Key.' }, { status: 400 });
    }

    // 2. Test User authentication if credentials are supplied
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (supabase_login_email && supabase_login_password) {
      try {
        const client = createClient(supabase_url, supabase_anon_key, {
          auth: { persistSession: false }
        });
        const { data: authData, error: authError } = await client.auth.signInWithPassword({
          email: supabase_login_email,
          password: supabase_login_password,
          options: {
            ...(captchaToken && { captchaToken })
          }
        });
        if (authError) {
          return NextResponse.json({ error: `Supabase login authentication failed: ${authError.message}` }, { status: 400 });
        }
        accessToken = authData.session?.access_token || null;
        refreshToken = authData.session?.refresh_token || null;
      } catch (err: any) {
        return NextResponse.json({ error: `Supabase auth verification error: ${err.message}` }, { status: 400 });
      }
    }

    const connId = `conn_${Date.now()}`;
    const db = getDb();

    db.prepare(`
      INSERT INTO supabase_connections (
        id, name, supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password,
        supabase_access_token, supabase_refresh_token, supabase_turnstile_site_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      connId,
      name,
      supabase_url,
      supabase_anon_key,
      supabase_login_email || null,
      supabase_login_password || null,
      accessToken,
      refreshToken,
      supabase_turnstile_site_key || null
    );

    return NextResponse.json({ success: true, id: connId, message: 'Database connection saved successfully.' });
  } catch (err: any) {
    console.error('[API Databases POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
