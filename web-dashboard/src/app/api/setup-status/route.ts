import { NextResponse } from 'next/server';
import { isPlatformSetup } from '@/lib/auth';

export async function GET() {
  try {
    const isSetup = isPlatformSetup();
    return NextResponse.json({ is_setup: isSetup });
  } catch (err: any) {
    return NextResponse.json({ is_setup: false, error: err.message }, { status: 500 });
  }
}
