import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

// Helper to test network connectivity/validity of url + anon key
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
    // RLS might return 401/403 or 200 (if table has items and readable), all represent connection success
    return res.status === 200 || res.status === 401 || res.status === 403 || res.status === 406;
  } catch {
    return false;
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
      supabase_url,
      supabase_anon_key,
      supabase_login_email,
      supabase_login_password,
      supabase_access_token,
      supabase_refresh_token,
      supabase_connection_id,
      captchaToken
    } = body as {
      supabase_url?: string;
      supabase_anon_key?: string;
      supabase_login_email?: string | null;
      supabase_login_password?: string | null;
      supabase_access_token?: string | null;
      supabase_refresh_token?: string | null;
      supabase_connection_id?: string | null;
      captchaToken?: string | null;
    };

    let resolvedUrl = supabase_url;
    let resolvedAnonKey = supabase_anon_key;
    let resolvedLoginEmail = supabase_login_email;
    let resolvedLoginPassword = supabase_login_password;
    let resolvedAccessToken = supabase_access_token;
    let resolvedRefreshToken = supabase_refresh_token;

    if (supabase_connection_id) {
      const conn = getDb().prepare('SELECT * FROM supabase_connections WHERE id = ?').get(supabase_connection_id) as {
        supabase_url: string;
        supabase_anon_key: string;
        supabase_login_email: string | null;
        supabase_login_password: string | null;
        supabase_access_token: string | null;
        supabase_refresh_token: string | null;
      } | undefined;

      if (conn) {
        resolvedUrl = conn.supabase_url;
        resolvedAnonKey = conn.supabase_anon_key;
        resolvedLoginEmail = conn.supabase_login_email;
        resolvedLoginPassword = conn.supabase_login_password;
        resolvedAccessToken = conn.supabase_access_token;
        resolvedRefreshToken = conn.supabase_refresh_token;
      }
    }

    if (!resolvedUrl || !resolvedAnonKey) {
      return NextResponse.json({ error: 'Supabase URL and Anon Key are required.' }, { status: 400 });
    }

    // 1. Test basic network connectivity and API keys
    const isConn = await testSupabaseConnection(resolvedUrl, resolvedAnonKey);
    if (!isConn) {
      return NextResponse.json({ error: 'Failed to connect to Supabase. Check URL and Anon Key.' }, { status: 400 });
    }

    // 2. If saved session tokens are supplied, test using setSession (bypasses Turnstile!)
    let sessionTokenFailed = false;
    if (resolvedAccessToken && resolvedRefreshToken && resolvedAccessToken !== '(active)' && resolvedRefreshToken !== '(active)') {
      try {
        const client = createClient(resolvedUrl, resolvedAnonKey, {
          auth: { persistSession: false }
        });
        const { data: sessionData, error: sessionError } = await client.auth.setSession({
          access_token: resolvedAccessToken,
          refresh_token: resolvedRefreshToken,
        });

        if (!sessionError && sessionData.user) {
          return NextResponse.json({ success: true, message: 'Supabase session tokens verified successfully!' });
        }
        sessionTokenFailed = true;
      } catch {
        sessionTokenFailed = true;
      }
    }

    // 3. Test User authentication if credentials are supplied
    if (resolvedLoginEmail && resolvedLoginPassword && resolvedLoginPassword !== '••••••••' && resolvedLoginPassword !== 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢') {
      try {
        const client = createClient(resolvedUrl, resolvedAnonKey, {
          auth: { persistSession: false }
        });
        const { error: authError } = await client.auth.signInWithPassword({
          email: resolvedLoginEmail,
          password: resolvedLoginPassword,
          options: {
            ...(captchaToken && { captchaToken })
          }
        });
        if (authError) {
          // Check if captcha is required
          if (
            authError.message.includes('captcha') || 
            authError.message.includes('disallowed') || 
            authError.message.includes('no captcha_token found')
          ) {
            return NextResponse.json({
              success: true,
              warning: 'captcha_required',
              message: 'Basic connection verified! (Bypass RLS email/password login is protected by Turnstile; please Edit & Save to authenticate).'
            });
          }
          return NextResponse.json({ error: `Supabase login authentication failed: ${authError.message}` }, { status: 400 });
        }
        return NextResponse.json({
          success: true,
          message: sessionTokenFailed
            ? 'Supabase login verified. Saved session tokens should be refreshed via Re-authenticate.'
            : 'Supabase login verified successfully!'
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Supabase auth verification error: ${message}` }, { status: 400 });
      }
    }

    if (sessionTokenFailed) {
      return NextResponse.json({ error: 'Session tokens expired or invalid. Please Re-authenticate.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Supabase connection verified successfully!' });
  } catch (err: unknown) {
    console.error('[API Test Connection] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal Server Error' }, { status: 500 });
  }
}
