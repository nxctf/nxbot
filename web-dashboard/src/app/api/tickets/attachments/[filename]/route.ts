import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { filename } = await params;
    
    // Security check to avoid directory traversal
    const safeFilename = path.basename(filename);
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), '../data/nxbot.db');
    const attachmentsDir = path.join(path.dirname(dbPath), 'attachments');
    const filePath = path.join(attachmentsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return new Response('Attachment not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Detect content-type
    let contentType = 'application/octet-stream';
    const ext = path.extname(safeFilename).toLowerCase();
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.txt') contentType = 'text/plain';

    // Original file name (omit the unique prefix)
    const displayName = safeFilename.includes('_') 
      ? safeFilename.split('_').slice(1).join('_') 
      : safeFilename;

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(displayName)}"`,
      },
    });
  } catch (err: any) {
    console.error('[API Attachment GET] Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
