import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getDashboardForRole(role: string) {
  if (role === 'admin') return '/admin';
  if (role === 'jury') return '/jury-dashboard';
  if (role === 'coordinator') return '/coord-dashboard';
  return '/team-dashboard';
}

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  // Protect all dashboard routes
  const protectedRoutes = [
    '/team-dashboard',
    '/admin',
    '/jury-dashboard',
    '/coord-dashboard'
  ];

  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtectedRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    const role = request.cookies.get('user_role')?.value || 'team';
    const path = request.nextUrl.pathname;
    
    // Role-based routing enforcement (Admins have access to all dashboards for debugging)
    if (path.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/jury-dashboard') && role !== 'jury' && role !== 'admin') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/coord-dashboard') && role !== 'coordinator' && role !== 'admin') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
    if (path.startsWith('/team-dashboard') && role !== 'team' && role !== 'admin') {
      return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    }
  }

  // Redirect authenticated users away from login/register
  if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    const role = request.cookies.get('user_role')?.value || 'team';
    return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
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
    '/coord-dashboard/:path*', 
    '/login', 
    '/register'
  ],
};
