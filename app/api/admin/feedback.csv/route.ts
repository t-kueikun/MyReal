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
  const header = 'score,comment,createdAt,token';
  const rows = feedback.map((entry) =>
    [
      entry.score,
      JSON.stringify(entry.comment || ''),
      entry.createdAt,
      entry.token || ''
    ].join(',')
  );
  const csv = [header, ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="feedback.csv"'
    }
  });
}
