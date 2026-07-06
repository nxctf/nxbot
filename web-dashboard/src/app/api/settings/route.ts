import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const settings = db.prepare("SELECT key, updated_at FROM system_settings WHERE key != 'admin_password_hash' AND key != 'jwt_secret'").all();
    
    // Check logs count, servers count, tickets count
    const serversCount = db.prepare('SELECT count(*) as count FROM guilds').get() as { count: number };
    const ticketsCount = db.prepare('SELECT count(*) as count FROM tickets').get() as { count: number };
    const logsCount = db.prepare('SELECT count(*) as count FROM bot_logs').get() as { count: number };

    return NextResponse.json({
      settings,
      stats: {
        servers: serversCount?.count || 0,
        tickets: ticketsCount?.count || 0,
        logs: logsCount?.count || 0,
      }
    });
  } catch (err: any) {
    console.error('[API Settings GET] Error:', err);
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
    const { action, currentPassword, newPassword } = body;

    const db = getDb();

    if (action === 'change_password') {
      return NextResponse.json({ error: 'Password changes are disabled on the web dashboard. Please use the CLI: nxbot reset-password' }, { status: 400 });
    }

    if (action === 'clear_cache') {
      db.prepare('DELETE FROM firstblood_cache').run();
      db.prepare("INSERT INTO bot_logs (event_type, level, message) VALUES ('cache_clear', 'warn', 'First blood cache cleared via dashboard')").run();
      return NextResponse.json({ success: true, message: 'First blood cache cleared.' });
    }

    if (action === 'clear_logs') {
      db.prepare('DELETE FROM bot_logs').run();
      return NextResponse.json({ success: true, message: 'Logs cleared.' });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    console.error('[API Settings POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
