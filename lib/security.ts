import { NextRequest } from 'next/server';
export function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '0.0.0.0';
  }
  return request.headers.get('x-real-ip') || '0.0.0.0';
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      throw new Error('Invalid origin');
    }
  } catch {
    throw new Error('Invalid origin');
  }
}
