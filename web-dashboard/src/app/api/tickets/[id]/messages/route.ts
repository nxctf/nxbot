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

export async function POST(
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

    const { message } = await request.json();
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message content is required.' }, { status: 400 });
    }

    const db = getDb();

    // 1. Verify ticket exists and is open/in-progress
    const ticket = db.prepare('SELECT id, channel_id, status FROM tickets WHERE id = ?').get(ticketId) as any;
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Cannot send messages to a closed ticket.' }, { status: 400 });
    }

    // 2. Insert message into ticket_messages for immediate display in dashboard transcript
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, user_id, username, avatar_url, message_content)
      VALUES (?, ?, ?, ?, ?)
    `).run(ticketId, 'bot', `NXBot (via ${user.username})`, null, message);

    // 3. Enqueue bot action to send message to Discord
    db.prepare(`
      INSERT INTO bot_actions (action_type, payload) VALUES (?, ?)
    `).run('send_message', JSON.stringify({
      channel_id: ticket.channel_id,
      message_content: `💬 **Admin (${user.username}):** ${message}`,
    }));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API Ticket Messages POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
