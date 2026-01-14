import { NextRequest, NextResponse } from 'next/server';
import { readLocalFile } from '../../../../lib/storage';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  const params = await props.params;
  const key = params.path.join('/');
  if (key.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }
  try {
    const data = await readLocalFile(key);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
