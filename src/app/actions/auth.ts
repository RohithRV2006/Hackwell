'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { encryptJSON } from '@/lib/encryption';

export async function checkTeamNameUnique(teamName: string) {
  try {
    const sanitizedName = teamName.trim().toLowerCase();
    const docRef = getAdminDb().collection('teams').doc(sanitizedName);
    const docSnap = await docRef.get();
    return { isUnique: !docSnap.exists };
  } catch (error: any) {
    console.error('Error checking team name', error);
    return { error: 'Failed to check team name uniqueness' };
  }
}

export async function registerTeamData(
  teamName: string,
  problemStatement: string,
  leadEmail: string,
  leadData: any,
  membersData: any[]
) {
  try {
    const sanitizedName = teamName.trim().toLowerCase();
    
    // Double check uniqueness
    const docRef = getAdminDb().collection('teams').doc(sanitizedName);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { success: false, error: 'Team name already taken.' };
    }
    
    // Encrypt sensitive data
    const encryptedLeadData = encryptJSON(leadData);
    const encryptedMembersData = encryptJSON(membersData);
    
    // Save to Firestore
    await docRef.set({
      teamName: teamName.trim(),
      problemStatement,
      leadEmail: leadEmail.trim().toLowerCase(),
      leadData: encryptedLeadData,
      membersData: encryptedMembersData,
      createdAt: new Date(),
    });
    
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
        teamName: data.teamName,
        problemStatement: data.problemStatement,
        leadEmail: data.leadEmail,
        encryptedLeadData: data.leadData,
        encryptedMembersData: data.membersData,
      }
    };
  } catch (error: any) {
    console.error('Error fetching team data', error);
    return { success: false, error: error.message };
  }
}
