import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = parseInt(resolvedParams.id, 10);
    if (isNaN(ticketId)) {
      return NextResponse.json({ error: 'Invalid Ticket ID' }, { status: 400 });
    }

    const db = getDb();

    // 1. Verify ticket exists
    const ticket = db.prepare('SELECT id FROM tickets WHERE id = ?').get(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // 2. Fetch all messages in order
    const messages = db.prepare(`
      SELECT id, ticket_id, user_id, username, avatar_url, message_content,
             attachment_filename, attachment_original_name, attachment_size, created_at
      FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC
    `).all(ticketId);

    return NextResponse.json(messages);
  } catch (err: any) {
    console.error('[API Ticket Messages GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
