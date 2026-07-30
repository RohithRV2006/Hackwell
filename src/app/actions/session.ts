'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { encryptJSON, decryptJSON } from '@/lib/encryption';

export async function getUserRole(email: string) {
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (sanitizedEmail === 'rohithrv2006@gmail.com') {
    return 'admin';
  }
  
  try {
    const roleDoc = await getAdminDb().collection('roles').doc(sanitizedEmail).get();
    if (roleDoc.exists) {
      const encryptedData = roleDoc.data();
      if (encryptedData && encryptedData.encryptedRole) {
        // Assume role is stored encrypted if required by user
        try {
          const decrypted = decryptJSON(encryptedData.encryptedRole);
          if (decrypted && decrypted.role) return decrypted.role;
        } catch (e) {
          console.error("Failed to decrypt role", e);
        }
      }
      return encryptedData?.role || 'team';
    }
  } catch (error) {
    console.error('Error fetching role', error);
  }
  
  return 'team';
}

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
