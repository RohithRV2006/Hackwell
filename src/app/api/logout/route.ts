import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('user_role');
  
  // Create an absolute URL for redirect based on the incoming request URL
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}
