import { NextRequest, NextResponse } from 'next/server';
import { getMetrics } from '../../../../lib/metrics';
import { getQueueStatus } from '../../../../lib/queue';
import { checkBasicAuth } from '../../../../lib/admin';

export async function GET(request: NextRequest) {
  if (!checkBasicAuth(request)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin"' }
    });
  }
  const metrics = await getMetrics();
  return NextResponse.json({ metrics, queue: getQueueStatus() });
}
