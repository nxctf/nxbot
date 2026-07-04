import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    // Check if database is accessible
    const db = getDb();
    db.prepare('SELECT 1').get();
    
    return NextResponse.json({ status: 'ok', service: 'web-dashboard' });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Database not ready' },
      { status: 500 }
    );
  }
}
