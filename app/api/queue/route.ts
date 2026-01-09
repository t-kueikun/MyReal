import { NextResponse } from 'next/server';
import { getQueueStatus } from '../../../lib/queue';

export async function GET() {
  return NextResponse.json(getQueueStatus());
}
