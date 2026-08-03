'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';

export interface SimpleTeam {
  id: string; // teamName lowercase
  teamName: string;
  displayId: string;
  evaluationStatus: 'Pending' | 'Evaluated';
  isFrozen: boolean;
  totalScore?: number;
}

export interface DetailedTeam {
  id: string;
  teamName: string;
  displayId: string;
  leadData: {
    name: string;
    batchNumber: string;
    department: string;
    year: string;
    section: string;
    contactNumber: string;
  };
  membersData: Array<{
    name: string;
    batchNumber: string;
    department: string;
    year: string;
    section: string;
  }>;
}

export interface Rubric {
  conceptStrength: number; // Max 12
  buildIntelligence: number; // Max 12
  deliveryImpact: number; // Max 8
  liveDefenseScore: number; // Max 8
  communication: number; // Max 10
}

export interface EvaluationData {
  teamName: string;
  displayId: string;
  teamId: string;
  juryId: string;
  juryName: string;
  rubric: Rubric;
  totalScore: number;
  feedback: string;
  isFrozen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Verify session and ensure role is 'jury'.
 * Fetches the lab assigned to this jury.
 */
export async function verifyJurySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return { success: false, error: 'No active session' };

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return { success: false, error: 'Invalid session' };
    
    const email = decodedToken.email.trim().toLowerCase();
    const role = decodedToken.role || await getUserRole(email);
    
    if (role !== 'jury') {
      return { success: false, error: 'Unauthorized: Jury role required' };
    }

    const db = getAdminDb();
    let juryName = email.split('@')[0];
    juryName = juryName.charAt(0).toUpperCase() + juryName.slice(1);
    let juryId = email;

    // Retrieve name and info from roles collection
    const roleDoc = await db.collection('roles').doc(email).get();
    if (roleDoc.exists) {
      const data = roleDoc.data();
      juryName = data?.name || juryName;
    }

    // Retrieve assigned lab from labs collection
    let labName = 'N/A';
    try {
      const labsSnap = await db.collection('labs').get();
      const matchedLab = labsSnap.docs.find(doc => {
        const data = doc.data();
        return data.assignedJuryName?.toLowerCase() === juryName.toLowerCase() || 
               data.assignedJuryId?.toLowerCase() === email.toLowerCase() ||
               data.assignedJuryName?.toLowerCase() === email.toLowerCase();
      });
      if (matchedLab) {
        labName = matchedLab.data().labName || matchedLab.data().labCode || matchedLab.id;
      }
    } catch (e) {
      console.error('Error fetching lab assignment:', e);
    }

    return { 
      success: true, 
      email, 
      juryName, 
      labName,
      juryId
    };
  } catch (error: any) {
    console.error('Error verifying jury session:', error);
    return { success: false, error: error.message || 'Session verification failed' };
  }
}

/**
 * Fetch all teams along with their evaluation status for the current logged-in jury.
 */
export async function getJuryDashboardData() {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    
    // 1. Fetch all teams
    const teamsSnap = await db.collection('teams').get();
    if (teamsSnap.empty) {
      return { success: true, teams: [] };
    }

    const teamDocs = teamsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

    // 2. Fetch score records in the new evaluations table for this jury (prelims round)
    const scoresSnap = await db.collection('evaluations')
      .where('round', '==', 'prelims')
      .where('juryId', '==', session.juryId)
      .get();

    const scoreMap = new Map<string, { isFrozen: boolean; totalScore: number }>();
    scoresSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.teamId) {
        scoreMap.set(data.teamId.trim(), {
          isFrozen: data.isFrozen === true,
          totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0
        });
      }
    });

    // 3. Map teams list
    const teams: SimpleTeam[] = teamDocs.map(doc => {
      const cleanId = doc.id.trim();
      const scoreInfo = scoreMap.get(cleanId);

      return {
        id: doc.id,
        teamName: doc.teamName || doc.id,
        displayId: doc.displayId || doc.id,
        evaluationStatus: scoreInfo !== undefined ? 'Evaluated' : 'Pending',
        isFrozen: scoreInfo ? scoreInfo.isFrozen : false,
        totalScore: scoreInfo ? scoreInfo.totalScore : undefined
      };
    });

    // Sort teams by team name or displayId
    teams.sort((a, b) => a.teamName.localeCompare(b.teamName));

    return { 
      success: true, 
      teams 
    };

  } catch (error: any) {
    console.error('Error fetching jury dashboard data:', error);
    return { success: false, error: error.message || 'Failed to fetch dashboard data' };
  }
}

/**
 * Fetch detailed team information and decryption of PII.
 */
export async function getTeamDetails(teamId: string) {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const cleanTeamId = teamId.trim();
    
    // Fetch team details
    const teamDoc = await db.collection('teams').doc(cleanTeamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const data = teamDoc.data()!;
    const leadData = data.leadData || { name: 'N/A', batchNumber: 'N/A', department: 'N/A', year: 'N/A', section: 'N/A', contactNumber: 'N/A' };
    const membersData = data.membersData || [];

    const teamDetails: DetailedTeam = {
      id: teamDoc.id,
      teamName: data.teamName || teamDoc.id,
      displayId: data.displayId || teamDoc.id,
      leadData,
      membersData
    };

    // Fetch existing evaluation in the new table evaluations
    const docId = `prelims_${session.juryId}_${cleanTeamId}`;
    const existingDoc = await db.collection('evaluations').doc(docId).get();

    let scoreData: EvaluationData | undefined = undefined;
    if (existingDoc.exists) {
      const scoreDoc = existingDoc.data()!;
      const r = scoreDoc.rubric || {};
      scoreData = {
        teamName: scoreDoc.teamName || data.teamName || teamDoc.id,
        displayId: scoreDoc.displayId || data.displayId || teamDoc.id,
        teamId: scoreDoc.teamId || cleanTeamId,
        juryId: scoreDoc.juryId || session.juryId,
        juryName: scoreDoc.juryName || session.juryName,
        rubric: {
          conceptStrength: r.conceptStrength ?? 0,
          buildIntelligence: r.buildIntelligence ?? 0,
          deliveryImpact: r.deliveryImpact ?? 0,
          liveDefenseScore: r.liveDefenseScore ?? 0,
          communication: r.communication ?? 0,
        },
        feedback: scoreDoc.feedback ?? '',
        totalScore: scoreDoc.totalScore ?? 0,
        isFrozen: scoreDoc.isFrozen === true,
        createdAt: scoreDoc.createdAt ? (scoreDoc.createdAt.toDate ? scoreDoc.createdAt.toDate().toISOString() : scoreDoc.createdAt) : undefined,
        updatedAt: scoreDoc.updatedAt ? (scoreDoc.updatedAt.toDate ? scoreDoc.updatedAt.toDate().toISOString() : scoreDoc.updatedAt) : undefined,
      };
    }

    return { success: true, teamDetails, scoreData };

  } catch (error: any) {
    console.error('Error fetching team details:', error);
    return { success: false, error: error.message || 'Failed to fetch team details' };
  }
}

/**
 * Save evaluation for a team inside the new evaluations table and freeze it.
 */
export async function submitAndFreezeEvaluation(
  teamId: string,
  teamName: string,
  displayId: string,
  rubric: Rubric,
  feedback: string
) {
  const session = await verifyJurySession();
  if (!session.success || !session.email || !session.juryName) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  const cleanTeamId = teamId.trim();
  const docId = `prelims_${session.juryId}_${cleanTeamId}`;
  const db = getAdminDb();

  // Check if already frozen
  const existingDoc = await db.collection('evaluations').doc(docId).get();
  if (existingDoc.exists && existingDoc.data()?.isFrozen === true) {
    return { success: false, error: 'Cannot save: Your scores for this team are already frozen.' };
  }

  // Validate rubric scores
  const scoreConfig = [
    { key: 'conceptStrength', max: 12, label: 'Concept Strength' },
    { key: 'buildIntelligence', max: 12, label: 'Build Intelligence' },
    { key: 'deliveryImpact', max: 8, label: 'Delivery Impact' },
    { key: 'liveDefenseScore', max: 8, label: 'Live Defense Score' },
    { key: 'communication', max: 10, label: 'Communication' }
  ] as const;

  for (const config of scoreConfig) {
    const val = rubric[config.key];
    if (val === undefined || val === null || typeof val !== 'number') {
      return { success: false, error: `${config.label} score is required and must be a valid number.` };
    }
    if (!Number.isInteger(val) || val < 0 || val > config.max) {
      return { success: false, error: `${config.label} score must be an integer between 0 and ${config.max}.` };
    }
  }

  const totalScore = rubric.conceptStrength + rubric.buildIntelligence + rubric.deliveryImpact + rubric.liveDefenseScore + rubric.communication;

  try {
    // Verify team exists
    const teamDoc = await db.collection('teams').doc(cleanTeamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found.' };
    }

    const now = new Date();
    
    // Save to the new evaluations table, freeze is ALWAYS true for freeze/submit action
    await db.collection('evaluations').doc(docId).set({
      round: 'prelims',
      teamName: teamName,
      displayId: displayId,
      teamId: cleanTeamId,
      juryId: session.juryId,
      juryName: session.juryName,
      rubric: {
        conceptStrength: rubric.conceptStrength,
        buildIntelligence: rubric.buildIntelligence,
        deliveryImpact: rubric.deliveryImpact,
        liveDefenseScore: rubric.liveDefenseScore,
        communication: rubric.communication
      },
      totalScore: totalScore,
      feedback: feedback.trim(),
      isFrozen: true,
      createdAt: existingDoc.exists ? (existingDoc.data()?.createdAt || now) : now,
      updatedAt: now
    }, { merge: true });

    return { success: true };

  } catch (error: any) {
    console.error('Error saving and freezing evaluation:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}
