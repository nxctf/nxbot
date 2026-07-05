import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
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
  } catch (err) {
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
    const { supabase_url, supabase_anon_key, supabase_login_email, supabase_login_password, captchaToken } = body;

    if (!supabase_url || !supabase_anon_key) {
      return NextResponse.json({ error: 'Supabase URL and Anon Key are required.' }, { status: 400 });
    }

    // 1. Test basic network connectivity and API keys
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

    return NextResponse.json({ success: true, message: 'Supabase connection verified successfully!' });
  } catch (err: any) {
    console.error('[API Test Connection] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
