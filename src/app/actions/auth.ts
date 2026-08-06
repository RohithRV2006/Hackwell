'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import {
  getAllTeamsFlatCached,
  findTeamByLeadEmail,
  createTeamInDomainDoc,
  updateTeamInDomainDoc,
  getEventTimelines,
} from '@/lib/firestore-helpers';

export async function checkTeamNameUnique(teamName: string) {
  try {
    const sanitizedName = teamName.trim().toLowerCase();
    const allTeams = await getAllTeamsFlatCached();
    const found = allTeams.some((t) => t.teamName?.trim().toLowerCase() === sanitizedName);
    return { isUnique: !found };
  } catch (error: any) {
    console.error('Error checking team name', error);
    return { error: 'Failed to check team name uniquenesss'};
  }
}

export async function checkBatchNumbers(batchNumbers: string[]) {
  try {
    if (!batchNumbers || batchNumbers.length === 0) return { success: true, duplicates: [] };

    const allTeams = await getAllTeamsFlatCached();
    const takenBatchNumbers = new Set<string>();

    allTeams.forEach((t) => {
      if (t.leadData?.batchNumber) takenBatchNumbers.add(t.leadData.batchNumber);
      if (Array.isArray(t.membersData)) {
        t.membersData.forEach((m: any) => {
          if (m.batchNumber) takenBatchNumbers.add(m.batchNumber);
        });
      }
    });

    const duplicates = batchNumbers.filter((b) => takenBatchNumbers.has(b));
    return { success: true, duplicates };
  } catch (error: any) {
    console.error('Error checking batch numbers', error);
    return { success: false, error: 'Failed to check batch numbers' };
  }
}

export async function checkRegistrationTimelineStatus() {
  try {
    const timelines = await getEventTimelines();

    if (!timelines) {
      return { allowed: false, message: 'Event registration process has not been started by administrators.' };
    }

    const t1 = timelines?.timeline1;
    if (!t1 || t1.enabled === false || t1.state !== 'active') {
      if (t1?.state === 'paused') {
        return { allowed: false, message: 'Registration is currently PAUSED / STOPPED by administrators.' };
      }
      if (t1?.state === 'ended') {
        return { allowed: false, message: 'Registration has been FINISHED and closed.' };
      }
      return { allowed: false, message: 'Event registration process has not been started by administrators.' };
    }

    return { allowed: true, message: '' };
  } catch (error: any) {
    console.error('Error checking registration timeline status:', error);
    return { allowed: false, message: 'Unable to verify registration status.' };
  }
}

export async function registerTeamData(
  teamName: string,
  theme: string,
  psId: string,
  psName: string,
  leadEmail: string,
  leadData: any,
  membersData: any[]
) {
  try {
    const db = getAdminDb();

    // Check timeline window
    const timelineCheck = await checkRegistrationTimelineStatus();
    if (!timelineCheck.allowed) {
      return { success: false, error: timelineCheck.message };
    }

    const sanitizedName = teamName.trim().toLowerCase();

    // Double check uniqueness
    const teamNameCheck = await checkTeamNameUnique(sanitizedName);
    if (!teamNameCheck.isUnique) {
      return { success: false, error: 'Team name already taken.' };
    }

    // Extract all batch numbers for indexing
    const allBatchNumbers = [leadData.batchNumber];
    if (membersData) {
      membersData.forEach((m: any) => {
        if (m.batchNumber) allBatchNumbers.push(m.batchNumber);
      });
    }

    // Generate unique sequential ID using teamCounter counter
    const counterRef = db.collection('metadata').doc('teamCounter');

    let displayId = '';
    let retries = 5;
    while (retries > 0) {
      try {
        displayId = await db.runTransaction(async (transaction) => {
          const counterDoc = await transaction.get(counterRef);

          let newCount = 1;
          if (counterDoc.exists) {
            newCount = (counterDoc.data()?.count || 0) + 1;
          }

          transaction.set(counterRef, { count: newCount }, { merge: true });

          return `H2O-${String(newCount).padStart(3, '0')}`;
        });
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0) throw new Error('High traffic detected. Please try registering again in a few seconds.');
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000 + 500));
      }
    }

    const newTeamPayload = {
      displayId,
      teamName: teamName.trim(),
      teamNameLower: sanitizedName,
      theme,
      psId,
      problemStatement: psName,
      leadEmail: leadEmail.trim().toLowerCase(),
      leadData,
      membersData,
      allBatchNumbers,
    };

    const res = await createTeamInDomainDoc(newTeamPayload);
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to register team' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error registering team data', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamDataByEmail(email: string) {
  try {
    const sanitizedEmail = email.trim().toLowerCase();
    const found = await findTeamByLeadEmail(sanitizedEmail);

    if (!found) {
      return { success: false, error: 'Team not found' };
    }

    const data = found.team;
    return {
      success: true,
      team: {
        id: data.id,
        displayId: data.displayId || data.id,
        teamName: data.teamName,
        theme: data.theme,
        psId: (data as any).psId || '',
        problemStatement: data.problemStatement,
        leadEmail: data.leadEmail,
        leadData: data.leadData,
        membersData: data.membersData,
        pptLink: data.pptLink || null,
        pptDriveFileId: (data as any).pptDriveFileId || null,
        prelimsStatus: data.prelimsStatus || 'pending',
        venue:
          data.assignedLabName && data.assignedLabName !== 'Unassigned'
            ? data.assignedLabName
            : data.labNo && data.labNo !== 'Unassigned'
            ? data.labNo
            : data.venue || null,
        assignedLabName: data.assignedLabName || data.labNo || null,
        labNo: data.labNo || null,
        judge: data.judge || null,
        finalStatus: data.finalStatus || 'pending',
        finalVenue: data.finalVenue || null,
      },
    };
  } catch (error: any) {
    const isQuota = error?.message?.includes('RESOURCE_EXHAUSTED') || error?.code === 8;
    const msg = isQuota
      ? 'Firebase Firestore daily quota exceeded (RESOURCE_EXHAUSTED). Please check your Firebase project quota/billing or wait for the daily quota reset.'
      : error?.message || 'Failed to fetch team data.';
    return { success: false, error: msg };
  }
}

export async function submitPPT(teamId: string, pptLink: string) {
  try {
    const timelines = await getEventTimelines();
    const t2 = timelines?.timeline2;
    if (!t2 || t2.enabled === false || t2.state !== 'active') {
      if (t2?.state === 'paused') {
        return { success: false, error: 'PPT Submission is currently PAUSED / STOPPED by administrators.' };
      }
      if (t2?.state === 'ended') {
        return { success: false, error: 'PPT Submission window has FINISHED and closed.' };
      }
      return { success: false, error: 'PPT Submission has not been started by administrators.' };
    }

    const res = await updateTeamInDomainDoc(teamId, {
      pptLink: pptLink.trim(),
      updatedAt: new Date().toISOString(),
    });

    if (!res.success) {
      return { success: false, error: res.error || 'Failed to submit PPT link.' };
    }

    return { success: true };
  } catch (error: any) {
    const isQuota = error?.message?.includes('RESOURCE_EXHAUSTED') || error?.code === 8;
    const msg = isQuota
      ? 'Firebase Firestore daily quota exceeded. Please try again after quota reset.'
      : 'Failed to submit PPT link.';
    return { success: false, error: msg };
  }
}
