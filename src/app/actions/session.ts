'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { encryptJSON, decryptJSON } from '@/lib/encryption';

export async function clearRoleCache(_email?: string) {
  // No-op: Cache removed, Firestore is queried directly
}

const ADMIN_EMAILS = new Set(['rohithrv2006@gmail.com', 'nidthishselvam@gmail.com']);

export async function isAdminEmail(email: string): Promise<boolean> {
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export async function getUserRole(email: string) {
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (ADMIN_EMAILS.has(sanitizedEmail)) {
    return 'admin';
  }
  
  try {
    const roleDoc = await getAdminDb().collection('roles').doc(sanitizedEmail).get();
    let fetchedRole = 'team';
    if (roleDoc.exists) {
      const encryptedData = roleDoc.data();
      if (encryptedData && encryptedData.encryptedRole) {
        try {
          const decrypted = decryptJSON(encryptedData.encryptedRole);
          if (decrypted && decrypted.role) fetchedRole = decrypted.role;
        } catch (e) {
          console.error("Failed to decrypt role", e);
        }
      }
      if (fetchedRole === 'team') {
        fetchedRole = encryptedData?.role || 'team';
      }
    }
    return fetchedRole;
  } catch (error: any) {
    console.error('Error fetching role:', error?.message || error);
  }
  
  return 'team';
}

export async function createSessionCookie(idToken: string) {
  try {
    // Session length is exactly 40 minutes (40 * 60 * 1000 ms)
    const expiresIn = 40 * 60 * 1000;
    
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
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    
    // Fetch user role
    const sanitizedEmail = decodedIdToken.email?.trim().toLowerCase();
    let role = 'team';
    
    if (sanitizedEmail && ADMIN_EMAILS.has(sanitizedEmail)) {
      role = 'admin';
    } else if (sanitizedEmail) {
      role = await getUserRole(sanitizedEmail);
    }
    
    // Set the role cookie for middleware routing
    cookieStore.set('user_role', role, {
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: false, // Must be readable by client or middleware easily, though edge middleware can read HTTP-only anyway. It's safe to be false, but true is fine too.
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return { success: true, role };
  } catch (error: any) {
    console.error('Error creating session cookie', error);
    return { success: false, error: error.message };
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  cookieStore.delete('user_role');
}
