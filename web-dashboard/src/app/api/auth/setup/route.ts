import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, generateToken, setSessionCookie, isPlatformSetup } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    // If already setup, block
    if (isPlatformSetup()) {
      return NextResponse.json({ error: 'Setup has already been completed.' }, { status: 400 });
    }

    const { username, password } = await request.json();

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: 'Username (min 3 chars) and password (min 6 chars) are required.' },
        { status: 400 }
      );
    }

    const db = getDb();
    const hashedPassword = hashPassword(password);
    const jwtSecret = crypto.randomBytes(32).toString('hex');

    // Run in a transaction
    const runSetup = db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('admin_username', ?, CURRENT_TIMESTAMP)").run(username);
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('admin_password_hash', ?, CURRENT_TIMESTAMP)").run(hashedPassword);
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('jwt_secret', ?, CURRENT_TIMESTAMP)").run(jwtSecret);
      db.prepare("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES ('is_setup', 'true', CURRENT_TIMESTAMP)").run();
    });

    runSetup();

    // Generate JWT and set cookie
    const token = generateToken({ username });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, message: 'Setup completed successfully.' });
  } catch (err: any) {
    console.error('[API Setup] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
