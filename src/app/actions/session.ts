'use server';

import { cookies } from 'next/headers';
import { getAdminAuth } from '@/lib/firebase-admin';

export async function createSessionCookie(idToken: string) {
  try {
    // Session length is exactly 30 minutes (30 * 60 * 1000 ms)
    const expiresIn = 30 * 60 * 1000;
    
    // Verify the idToken and create a session cookie
    const decodedIdToken = await getAdminAuth().verifyIdToken(idToken);
    
    // Check if the user was recently signed in (less than 5 mins ago) to prevent long-lived ID tokens from bypassing security
    if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
      throw new Error('Recent sign-in required.');
    }
    
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });
    
    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error creating session cookie', error);
    return { success: false, error: error.message };
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
