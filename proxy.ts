import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const adminUser = process.env.ADMIN_USER || '';
    const adminPass = process.env.ADMIN_PASS || '';
    if (adminUser && adminPass) {
      const auth = request.headers.get('authorization') || '';
      if (!auth.startsWith('Basic ')) {
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="admin"' }
        });
      }
      const decoded = atob(auth.replace('Basic ', ''));
      const [user, pass] = decoded.split(':');
      if (user !== adminUser || pass !== adminPass) {
        return new NextResponse('Unauthorized', {
          status: 401,
          headers: { 'WWW-Authenticate': 'Basic realm="admin"' }
        });
      }
    }
  }

  if (pathname.startsWith('/ar/')) {
    const token = pathname.split('/')[2];
    if (token) {
      const exp = Number(token.split('.')[1]);
      if (exp && Date.now() > exp) {
        const url = request.nextUrl.clone();
        url.pathname = '/ar/expired';
        return NextResponse.rewrite(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/ar/:path*']
};
