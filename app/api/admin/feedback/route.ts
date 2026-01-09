import { NextRequest, NextResponse } from 'next/server';
import { listFeedback } from '../../../../lib/feedback';
import { checkBasicAuth } from '../../../../lib/admin';

export async function GET(request: NextRequest) {
  if (!checkBasicAuth(request)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin"' }
    });
  }
  const feedback = await listFeedback();
  return NextResponse.json({ feedback });
}
