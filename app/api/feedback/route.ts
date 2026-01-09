import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addFeedback } from '../../../lib/feedback';
import { recordFeedback } from '../../../lib/metrics';
import { assertSameOrigin } from '../../../lib/security';

const schema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
  token: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const json = schema.parse(await request.json());
    await addFeedback({
      score: json.score,
      comment: json.comment?.trim() || '',
      createdAt: new Date().toISOString(),
      token: json.token?.slice(0, 12)
    });
    await recordFeedback(json.score);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid origin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ message: '入力が不正です。' }, { status: 400 });
  }
}
