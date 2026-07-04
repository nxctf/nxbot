import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-only';
const COOKIE_NAME = 'nxbot_session';

export interface AdminUser {
  username: string;
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(password, hash);
  } catch (err) {
    return false;
  }
}

export function generateToken(payload: AdminUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AdminUser;
  } catch (err) {
    return null;
  }
}

/**
 * Gets the current logged in user from cookies.
 * Can be used in Server Components or API Routes.
 */
export async function getSessionUser(): Promise<AdminUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch (err) {
    return null;
  }
}

/**
 * Sets the session cookie.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });
}

/**
 * Checks if the platform setup is complete.
 */
export function isPlatformSetup(): boolean {
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'is_setup'").get() as { value: string } | undefined;
    return row?.value === 'true';
  } catch (err) {
    return false;
  }
}
