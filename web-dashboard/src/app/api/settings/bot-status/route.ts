import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '../data/nxbot.db');
    const dataDir = path.dirname(dbPath);
    const statusPath = path.join(dataDir, 'bot_status.json');

    if (fs.existsSync(statusPath)) {
      const data = fs.readFileSync(statusPath, 'utf8');
      const parsed = JSON.parse(data);
      return NextResponse.json(parsed);
    }
    
    return NextResponse.json({
      status: 'offline',
      error: 'No status recorded yet. Bot might be starting up or stopped.',
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err.message || 'Failed to read status',
      updatedAt: new Date().toISOString()
    }, { status: 500 });
  }
}
