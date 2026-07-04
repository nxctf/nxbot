import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, generateToken, setSessionCookie, isPlatformSetup } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    if (!isPlatformSetup()) {
      return NextResponse.json({ error: 'Setup is not complete. Please go to setup page.' }, { status: 400 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
    }

    const db = getDb();
    const adminUsernameRow = db.prepare("SELECT value FROM system_settings WHERE key = 'admin_username'").get() as { value: string } | undefined;
    const adminPasswordHashRow = db.prepare("SELECT value FROM system_settings WHERE key = 'admin_password_hash'").get() as { value: string } | undefined;

    if (!adminUsernameRow || !adminPasswordHashRow) {
      return NextResponse.json({ error: 'Invalid admin credentials configuration.' }, { status: 500 });
    }

    const isMatch = username.trim() === adminUsernameRow.value && verifyPassword(password, adminPasswordHashRow.value);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    // Set session cookie
    const token = generateToken({ username: adminUsernameRow.value });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, message: 'Logged in successfully.' });
  } catch (err: any) {
    console.error('[API Login] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
