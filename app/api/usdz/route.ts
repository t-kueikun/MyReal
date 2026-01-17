import { NextRequest, NextResponse } from 'next/server';
import { saveFile, getImageUrl } from '../../../lib/storage';
import { env } from '../../../lib/config';
import { assertSameOrigin } from '../../../lib/security';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { message: 'USDZが見つかりません。' },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveFile(
      buffer,
      'model/vnd.usdz+zip',
      'ar',
      'usdz'
    );
    const url = await getImageUrl(saved.key, env.tokenTtlHours * 3600);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid origin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { message: 'USDZの保存に失敗しました。' },
      { status: 500 }
    );
  }
}
