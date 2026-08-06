'use server';

import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';
import { cookies } from 'next/headers';
import { findTeamByLeadEmail } from '@/lib/firestore-helpers';

/**
 * Checks if the email is registered as a Team (Student) lead
 * and ensures it does not belong to a privileged user (Admin, Jury, Coord).
 */
export async function checkTeamEmailRegistered(email: string) {
  try {
    const sanitizedEmail = email.trim().toLowerCase();

    // Check if the user has a privileged role (anything other than 'team')
    const role = await getUserRole(sanitizedEmail);
    if (role !== 'team') {
      return { 
        success: false, 
        error: 'Password reset is only available for Team (Student) users.' 
      };
    }

    // Verify the email exists in the teams collection as leadEmail
    const found = await findTeamByLeadEmail(sanitizedEmail);

    if (!found) {
      return { 
        success: false, 
        error: 'This email is not registered as a team lead.' 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying email registration:', error);
    return { 
      success: false, 
      error: 'An error occurred while verifying the email registration status.' 
    };
  }
}

/**
 * Direct password change from Team Dashboard, validating the old password.
 */
export async function changeTeamPassword(email: string, oldPassword: string, newPassword: string) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return { success: false, error: 'Unauthorized session.' };
    }

    // Decode and verify session claims
    let decodedClaims;
    try {
      decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    } catch (e) {
      return { success: false, error: 'Session expired or invalid.' };
    }

    const claimEmail = decodedClaims.email;
    if (!claimEmail || claimEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return { success: false, error: 'Unauthorized email mismatch.' };
    }

    // Ensure they are a team user
    const role = await getUserRole(claimEmail);
    if (role !== 'team') {
      return { success: false, error: 'Unauthorized access.' };
    }

    // Verify the old password via Firebase Auth REST API
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Server authentication configuration is missing.' };
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: claimEmail,
          password: oldPassword,
          returnSecureToken: true,
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      const message = errData?.error?.message || '';
      if (message === 'INVALID_PASSWORD') {
        return { success: false, error: 'The old password you entered is incorrect.' };
      }
      return { success: false, error: 'Failed to verify old password.' };
    }

    // Update password using admin SDK
    const userRecord = await getAdminAuth().getUserByEmail(claimEmail);
    await getAdminAuth().updateUser(userRecord.uid, { password: newPassword });

    return { success: true };
  } catch (error: any) {
    console.error('Error changing password from dashboard:', error);
    return { success: false, error: error.message || 'Failed to update password.' };
  }
}
