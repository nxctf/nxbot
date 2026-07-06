import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/databases/[id]/re-auth
 * Re-authenticate with Supabase using saved email/password + captcha token.
 * Saves fresh access_token and refresh_token to SQLite.
 */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { captchaToken } = body;

    const db = getDb();
    const conn = db.prepare('SELECT * FROM supabase_connections WHERE id = ?').get(params.id) as any;
    if (!conn) {
      return NextResponse.json({ error: 'Connection not found.' }, { status: 404 });
    }

    if (!conn.supabase_login_email || !conn.supabase_login_password) {
      return NextResponse.json({ error: 'No login email/password configured for this connection.' }, { status: 400 });
    }

    // Create a fresh Supabase client and sign in
    const client = createClient(conn.supabase_url, conn.supabase_anon_key, {
      auth: { persistSession: false }
    });

    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: conn.supabase_login_email,
      password: conn.supabase_login_password,
      options: {
        ...(captchaToken && { captchaToken })
      }
    });

    if (authError) {
      return NextResponse.json({ error: `Authentication failed: ${authError.message}` }, { status: 400 });
    }

    const accessToken = authData.session?.access_token || null;
    const refreshToken = authData.session?.refresh_token || null;

    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: 'Login succeeded but no session tokens received.' }, { status: 500 });
    }

    // Save fresh tokens to database
    db.prepare(`
      UPDATE supabase_connections SET
        supabase_access_token = ?,
        supabase_refresh_token = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(accessToken, refreshToken, params.id);

    return NextResponse.json({
      success: true,
      message: 'Re-authenticated successfully! Bot will pick up new tokens within 10 seconds.',
      user_email: authData.user?.email,
    });
  } catch (err: any) {
    console.error('[API Re-Auth] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
