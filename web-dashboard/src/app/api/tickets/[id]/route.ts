import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const ticket = db.prepare(`
      SELECT t.*, g.guild_name 
      FROM tickets t 
      JOIN guilds g ON t.guild_id = g.id 
      WHERE t.id = ?
    `).get(id);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (err: any) {
    console.error('[API Ticket GET] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, assigned_to } = body;

    const db = getDb();
    const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as any;

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    if (status) {
      if (status === 'closed') {
        db.prepare(`
          UPDATE tickets 
          SET status = ?, closed_by = ?, closed_by_username = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).run(status, user.username, user.username, id);

        // Enqueue bot action to delete the Discord channel
        if (existing.channel_id) {
          db.prepare(`
            INSERT INTO bot_actions (action_type, payload) VALUES (?, ?)
          `).run('close_channel', JSON.stringify({
            channel_id: existing.channel_id,
            ticket_id: existing.id,
          }));
        }
      } else {
        db.prepare(`
          UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, id);
      }
    }

    if (assigned_to !== undefined) {
      db.prepare(`
        UPDATE tickets SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(assigned_to || null, id);
    }

    return NextResponse.json({ success: true, message: 'Ticket updated successfully.' });
  } catch (err: any) {
    console.error('[API Ticket PUT] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);

    if (!existing) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: 'Ticket deleted successfully.' });
  } catch (err: any) {
    console.error('[API Ticket DELETE] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
