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
      if (!currentPassword || !newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Current password and new password (min 6 characters) are required.' }, { status: 400 });
      }

      const passHashRow = db.prepare("SELECT value FROM system_settings WHERE key = 'admin_password_hash'").get() as { value: string } | undefined;
      if (!passHashRow) {
        return NextResponse.json({ error: 'Admin settings not found.' }, { status: 500 });
      }

      const isMatch = verifyPassword(currentPassword, passHashRow.value);
      if (!isMatch) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      const hashedNew = hashPassword(newPassword);
      db.prepare("UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'admin_password_hash'").run(hashedNew);

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
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
