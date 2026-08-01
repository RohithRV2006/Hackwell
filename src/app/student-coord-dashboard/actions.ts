'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';

export async function verifyStudentCoordSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return { success: false, error: 'No active session' };

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return { success: false, error: 'Invalid session' };
    
    const email = decodedToken.email.trim().toLowerCase();
    const role = await getUserRole(email);
    
    if (role !== 'student-coord') {
      return { success: false, error: 'Unauthorized: Student Coordinator role required' };
    }

    const db = getAdminDb();
    let coordId = '';
    
    try {
      const roleDoc = await db.collection('roles').doc(email).get();
      if (roleDoc.exists) {
        coordId = roleDoc.data()?.coordId || '';
      }
    } catch (e) {
      console.error('Error fetching role doc:', e);
    }

    return { 
      success: true, 
      email, 
      coordId
    };
  } catch (error: any) {
    console.error('Error verifying student coord session:', error);
    return { success: false, error: error.message || 'Session verification failed' };
  }
}

export async function uploadGameScore(teamId: string, gameName: string, xpPoints: number) {
  const session = await verifyStudentCoordSession();
  if (!session.success || !session.coordId) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  const cleanTeamId = teamId.trim().toLowerCase();

  try {
    const db = getAdminDb();
    const teamRef = db.collection('teams').doc(cleanTeamId);
    
    // Verify team exists
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const batch = db.batch();

    // Create game score record
    const gameScoreRef = db.collection('gameScores').doc();
    batch.set(gameScoreRef, {
      teamId: cleanTeamId,
      studentCoordId: session.coordId,
      gameName: gameName.trim(),
      xpPoints: Number(xpPoints),
      createdAt: new Date(),
    });

    // Fetch all game scores for this team to recalculate totalGameXP securely
    const existingScoresSnap = await db.collection('gameScores').where('teamId', '==', cleanTeamId).get();
    let totalGameXP = Number(xpPoints);
    existingScoresSnap.docs.forEach(doc => {
      totalGameXP += doc.data().xpPoints || 0;
    });

    // Update team's totalGameXP
    batch.update(teamRef, {
      totalGameXP,
    });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error uploading game score:', error);
    return { success: false, error: error.message || 'Failed to upload game score' };
  }
}
