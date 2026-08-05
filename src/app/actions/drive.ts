'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { invalidateCollectionCache } from '@/app/admin/actions';

/**
 * Checks Phase 2 (PPT Submission Phase) timeline status.
 */
export async function checkPPTSubmissionTimelineStatus() {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('metadata').doc('eventTimelines').get();

    if (!docSnap.exists) {
      return { allowed: false, state: 'not-set', message: 'PPT Submission Phase has not been activated by administrators yet.' };
    }

    const t2 = docSnap.data()?.timeline2;
    if (!t2 || t2.enabled === false || t2.state === 'not-set') {
      return { allowed: false, state: 'not-set', message: 'PPT Submission Phase has not been activated by administrators yet.' };
    }

    const now = new Date();
    if (t2.startDate && new Date(t2.startDate) > now) {
      return { 
        allowed: false, 
        state: 'not-started',
        message: `PPT Submission opens on ${new Date(t2.startDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.` 
      };
    }

    if (t2.endDate && new Date(t2.endDate) < now) {
      return { 
        allowed: false, 
        state: 'ended',
        message: `PPT Submission Phase closed on ${new Date(t2.endDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}.` 
      };
    }

    return { allowed: true, state: 'active', message: '' };
  } catch (error: any) {
    console.error('Error checking PPT timeline status:', error);
    return { allowed: false, state: 'error', message: 'Unable to verify PPT submission timeline status.' };
  }
}

/**
 * Saves the uploaded PPT link to Firestore and invalidates the teams collection cache.
 */
export async function savePPTLink(teamId: string, webViewLink: string, fileId: string) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return { success: false, error: 'Unauthorized' };
  }

  // Enforce server-side timeline check
  const timelineStatus = await checkPPTSubmissionTimelineStatus();
  if (!timelineStatus.allowed) {
    return { success: false, error: timelineStatus.message };
  }

  try {
    const db = getAdminDb();
    const teamRef = db.collection('teams').doc(teamId);
    
    await teamRef.update({
      pptLink: webViewLink,
      pptDriveFileId: fileId,
      updatedAt: new Date()
    });

    // Invalidate teams cache so Admin pages update immediately
    invalidateCollectionCache('teams');

    return { success: true };
  } catch (error: any) {
    console.error('Error saving PPT link:', error);
    return { success: false, error: error.message || 'An error occurred while saving the link.' };
  }
}
