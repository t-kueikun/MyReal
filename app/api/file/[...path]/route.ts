import { NextRequest, NextResponse } from 'next/server';
import { readLocalFile } from '../../../../lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const key = params.path.join('/');
  if (key.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }
  try {
    const data = await readLocalFile(key);
    const ext = key.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'usdz'
        ? 'model/vnd.usdz+zip'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';
    const size = data.length;
    const range = request.headers.get('range');
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (!match) {
        return new NextResponse('Invalid range', { status: 416 });
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : size - 1;
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        start >= size
      ) {
        return new NextResponse('Invalid range', {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` }
        });
      }
      const chunk = data.slice(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunk.length),
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(size),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
