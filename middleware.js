import { NextResponse } from 'next/server';
import { adminToken, ADMIN_COOKIE } from '@/lib/auth';

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookie && cookie === (await adminToken())) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
