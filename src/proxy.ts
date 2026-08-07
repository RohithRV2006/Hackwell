import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  // Protect all dashboard routes
  const protectedRoutes = [
    '/team-dashboard',
    '/admin',
    '/jury-dashboard',
    '/student-coord-dashboard',
    '/faculty-coord-dashboard'
  ];

  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // We cannot verify Firestore roles in Edge middleware.
    // The specific layouts/pages will verify if the user's role allows access.
  }

  // Redirect authenticated users away from login/register
  if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    // We can't query their role here easily, so we just redirect them to a default dashboard.
    // The server components will handle further redirects if they land on the wrong dashboard.
    return NextResponse.redirect(new URL('/team-dashboard', request.url));
  }

  const response = NextResponse.next();
  if (isProtectedRoute) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/team-dashboard/:path*', 
    '/admin/:path*', 
    '/jury-dashboard/:path*', 
    '/student-coord-dashboard/:path*', 
    '/faculty-coord-dashboard/:path*', 
    '/login', 
    '/register'
  ],
};
