'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

/**
 * Saves the uploaded PPT link to Firestore.
 * The actual file upload happens directly from the client to Google Apps Script.
 */
export async function savePPTLink(teamId: string, webViewLink: string, fileId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return { success: false, error: 'Unauthorized' };
  }

  let decodedClaims;
  try {
    decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!decodedClaims.email) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const teamRef = db.collection('teams').doc(teamId);
    
    await teamRef.update({
      pptLink: webViewLink,
      pptDriveFileId: fileId,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error saving PPT link:', error);
    return { success: false, error: error.message || 'An error occurred while saving the link.' };
  }
}
