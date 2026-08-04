'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { encryptJSON } from '@/lib/encryption';
import { invalidateCollectionCache } from '@/app/admin/actions';

export async function checkTeamNameUnique(teamName: string) {
  try {
    const sanitizedName = teamName.trim().toLowerCase();
    
    // Check legacy teams (where doc ID is the team name)
    const legacyDoc = await getAdminDb().collection('teams').doc(sanitizedName).get();
    if (legacyDoc.exists) {
      return { isUnique: false };
    }

    // Check new teams (where teamNameLower field is set)
    const snapshot = await getAdminDb().collection('teams').where('teamNameLower', '==', sanitizedName).limit(1).get();
    return { isUnique: snapshot.empty };
  } catch (error: any) {
    console.error('Error checking team name', error);
    return { error: 'Failed to check team name uniqueness' };
  }
}

export async function checkBatchNumbers(batchNumbers: string[]) {
  try {
    if (!batchNumbers || batchNumbers.length === 0) return { success: true, duplicates: [] };
    
    const db = getAdminDb();
    
    // We can check up to 10 batch numbers at once using array-contains-any
    const snapshot = await db.collection('teams')
      .where('allBatchNumbers', 'array-contains-any', batchNumbers)
      .get();
      
    const takenBatchNumbers = new Set<string>();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.allBatchNumbers) {
        data.allBatchNumbers.forEach((b: string) => takenBatchNumbers.add(b));
      }
    });

    const duplicates = batchNumbers.filter(b => takenBatchNumbers.has(b));
    return { success: true, duplicates };
  } catch (error: any) {
    console.error('Error checking batch numbers', error);
    return { success: false, error: 'Failed to check batch numbers' };
  }
}

export async function checkRegistrationTimelineStatus() {
  try {
    const db = getAdminDb();
    const docSnap = await db.collection('metadata').doc('eventTimelines').get();

    if (!docSnap.exists) {
      return { allowed: false, message: 'Event registration process has not been started by administrators.' };
    }

    const t1 = docSnap.data()?.timeline1;
    if (!t1 || t1.enabled === false || t1.state === 'not-set') {
      return { allowed: false, message: 'Event registration process has not been started by administrators.' };
    }

    const now = new Date();
    if (t1.startDate && new Date(t1.startDate) > now) {
      return { allowed: false, message: `Registration opens on ${new Date(t1.startDate).toLocaleString()}.` };
    }

    if (t1.endDate && new Date(t1.endDate) < now) {
      return { allowed: false, message: `Registration closed on ${new Date(t1.endDate).toLocaleString()}.` };
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

    // Generate unique sequential ID using a transaction with retry logic for high contention
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
        if (retries === 0) throw new Error("High traffic detected. Please try registering again in a few seconds.");
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
      }
    }    
    // Save to Firestore using an auto-generated doc ID, but store displayId
    const teamDocRef = db.collection('teams').doc();
    await teamDocRef.set({
      displayId: displayId,
      teamName: teamName.trim(),
      teamNameLower: sanitizedName,
      theme,
      psId,
      problemStatement: psName,
      leadEmail: leadEmail.trim().toLowerCase(),
      leadData: leadData,
      membersData: membersData,
      allBatchNumbers: allBatchNumbers,
      createdAt: new Date(),
    });
    
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error registering team data', error);
    return { success: false, error: error.message };
  }
}

export async function getTeamDataByEmail(email: string) {
  try {
    const sanitizedEmail = email.trim().toLowerCase();
    const snapshot = await getAdminDb().collection('teams').where('leadEmail', '==', sanitizedEmail).limit(1).get();
    
    if (snapshot.empty) {
      return { success: false, error: 'Team not found' };
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Note: We don't decrypt here directly to avoid sending sensitive data over network if not needed, 
    // but typically a server action can return it if it's meant for a Server Component.
    // However, since team-dashboard is a Server Component, it can call this and decrypt there, or we decrypt here.
    return {
      success: true,
      team: {
        id: doc.id,
        displayId: data.displayId || doc.id,
        teamName: data.teamName,
        theme: data.theme,
        psId: data.psId,
        problemStatement: data.problemStatement,
        leadEmail: data.leadEmail,
        leadData: data.leadData,
        membersData: data.membersData,
        pptLink: data.pptLink || null,
        pptDriveFileId: data.pptDriveFileId || null,
        prelimsStatus: data.prelimsStatus || 'pending',
        venue: data.venue || null,
      }
    };
  } catch (error: any) {
    const isQuota = error?.message?.includes('RESOURCE_EXHAUSTED') || error?.code === 8;
    const msg = isQuota
      ? 'Firebase Firestore daily quota exceeded (RESOURCE_EXHAUSTED). Please check your Firebase project quota/billing or wait for the daily quota reset.'
      : (error?.message || 'Failed to fetch team data.');
    return { success: false, error: msg };
  }
}

export async function submitPPT(teamId: string, pptLink: string) {
  try {
    const db = getAdminDb();
    await db.collection('teams').doc(teamId).update({
      pptLink: pptLink.trim(),
      updatedAt: new Date()
    });
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    const isQuota = error?.message?.includes('RESOURCE_EXHAUSTED') || error?.code === 8;
    const msg = isQuota
      ? 'Firebase Firestore daily quota exceeded. Please try again after quota reset.'
      : 'Failed to submit PPT link.';
    return { success: false, error: msg };
  }
}
