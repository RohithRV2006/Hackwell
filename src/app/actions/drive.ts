'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { invalidateCollectionCache } from '@/app/admin/actions';
import { updateTeamInDomainDoc } from '@/lib/firestore-helpers';

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
    const res = await updateTeamInDomainDoc(teamId, {
      pptLink: webViewLink,
      pptDriveFileId: fileId,
      updatedAt: new Date().toISOString()
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to save PPT link' };
    }

    // Invalidate teams cache so Admin pages update immediately
    invalidateCollectionCache('teams');

    return { success: true };
  } catch (error: any) {
    console.error('Error saving PPT link:', error);
    return { success: false, error: error.message || 'An error occurred while saving the link.' };
  }
}

/**
 * Server action to upload PPT base64 data to Google Apps Script (bypassing browser CORS)
 * and saving the URL in the team's domain schema document.
 */
export async function uploadPPTToDrive(
  teamId: string,
  payload: {
    fileName: string;
    mimeType: string;
    base64Data: string;
    oldFileId?: string;
  }
) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  if (!sessionCookie) {
    return { success: false, error: 'Unauthorized session' };
  }

  try {
    await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return { success: false, error: 'Unauthorized session' };
  }

  // Enforce server-side timeline check
  const timelineStatus = await checkPPTSubmissionTimelineStatus();
  if (!timelineStatus.allowed) {
    return { success: false, error: timelineStatus.message };
  }

  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) {
    return { success: false, error: 'Google Apps Script URL is not configured.' };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        base64Data: payload.base64Data,
        oldFileId: payload.oldFileId || '',
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Drive service error (${response.status}): ${text}` };
    }

    const res = await response.json();

    if (res.status === 'success' && res.url) {
      const saveRes = await savePPTLink(teamId, res.url, res.fileId);
      if (saveRes.success) {
        return { success: true, url: res.url, fileId: res.fileId };
      } else {
        return { success: false, error: saveRes.error || 'Failed to save PPT link in database.' };
      }
    } else {
      return { success: false, error: res.message || 'Failed to upload presentation to Drive.' };
    }
  } catch (error: any) {
    console.error('Error uploading PPT via Google Script server action:', error);
    return { success: false, error: error.message || 'Network error communicating with Google Drive service.' };
  }
}
