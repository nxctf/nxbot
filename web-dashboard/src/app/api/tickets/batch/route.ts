import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId');

    if (!guildId) {
      return NextResponse.json({ error: 'guildId query parameter is required' }, { status: 400 });
    }

    const db = getDb();
    const tickets = db.prepare('SELECT id FROM tickets WHERE guild_id = ?').all(guildId) as { id: number }[];

    if (tickets.length === 0) {
      return NextResponse.json({ success: true, message: 'No tickets found for this guild.', deleted: 0 });
    }

    const deleteStmt = db.prepare('DELETE FROM tickets WHERE guild_id = ?');
    const result = deleteStmt.run(guildId);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.changes} ticket(s) for this guild.`,
      deleted: result.changes,
    });
  } catch (err: any) {
    console.error('[API Tickets Batch DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
