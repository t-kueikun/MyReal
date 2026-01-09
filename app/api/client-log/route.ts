import { NextRequest, NextResponse } from 'next/server';
import { logError } from '../../../lib/logger';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    logError('client-log', payload);
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true });
}
