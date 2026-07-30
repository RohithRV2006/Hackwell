import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  // Protect the /team-dashboard route
  if (request.nextUrl.pathname.startsWith('/team-dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Note: We can't use firebase-admin in Edge runtime (which Middleware uses).
    // The session cookie expiration (30 mins) is strictly handled by the browser cookie max-age 
    // and Firebase Admin verification inside the actual Server Component if needed.
    // For middleware, we just check if the cookie exists.
  }

  // Redirect authenticated users away from login/register
  if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/team-dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/team-dashboard/:path*', '/login', '/register'],
};
