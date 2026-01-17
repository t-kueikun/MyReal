import { NextRequest, NextResponse } from 'next/server';
import { getMeta } from '../../../../lib/metadata';
import { getImageUrl } from '../../../../lib/storage';
import { verifyToken } from '../../../../lib/token';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const params = await props.params;
  const verify = verifyToken(params.token);
  if (!verify.valid) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const meta = await getMeta(params.token);
  if (!meta) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  const imageUrl = await getImageUrl(meta.imageKey, 3600);
  return NextResponse.json({
    valid: true,
    imageUrl,
    expiresAt: meta.expiresAt,
    palette: meta.palette
  });
}
