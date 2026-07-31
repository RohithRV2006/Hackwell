'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { decryptJSON } from '@/lib/encryption';
import { getUserRole } from '@/app/actions/session';

export interface SimpleTeam {
  id: string; // teamName lowercase
  teamName: string;
  problemStatement: string;
  leadEmail: string;
  leadName?: string;
  membersCount: number;
  labNumber?: string;
  teamNumber?: string;
  evaluationStatus: 'Pending' | 'Evaluated';
  highlighted: boolean;
  score?: number;
}

export interface DetailedTeam extends SimpleTeam {
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
  proposedSolution?: string;
  projectDescription?: string;
  abstract?: string;
  techStack?: string;
  submissionLink?: string;
}

export interface EvaluationData {
  innovation: number;
  technicalFeasibility: number;
  impact: number;
  presentation: number;
  remarks: string;
  highlighted: boolean;
  score: number;
}

/**
 * Verify session and ensure role is 'jury'.
 */
export async function verifyJurySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return { success: false, error: 'No active session' };

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return { success: false, error: 'Invalid session' };
    
    const email = decodedToken.email.trim().toLowerCase();
    const role = await getUserRole(email);
    
    if (role !== 'jury') {
      return { success: false, error: 'Unauthorized: Jury role required' };
    }

    // Try to resolve juryName from 'jury' collection
    const db = getAdminDb();
    let juryName = email.split('@')[0];
    juryName = juryName.charAt(0).toUpperCase() + juryName.slice(1); // fallback capitalization
    let institution = 'N/A';

    try {
      const jurySnap = await db.collection('jury').where('email', '==', email).limit(1).get();
      if (!jurySnap.empty) {
        const data = jurySnap.docs[0].data();
        juryName = data.juryName || juryName;
        institution = data.institution || institution;
      }
    } catch (e) {
      console.warn('Could not query jury collection for email. Using fallback name.', e);
    }

    // Check if jury scores are frozen in roles
    let scoresFrozen = false;
    let frozenAt = null;
    try {
      const roleDoc = await db.collection('roles').doc(email).get();
      if (roleDoc.exists) {
        const data = roleDoc.data();
        scoresFrozen = data?.scoresFrozen === true;
        frozenAt = data?.frozenAt ? (data.frozenAt.toDate ? data.frozenAt.toDate().toISOString() : data.frozenAt) : null;
      }
    } catch (e) {
      console.error('Error fetching role freeze status:', e);
    }

    return { 
      success: true, 
      email, 
      juryName, 
      institution,
      scoresFrozen,
      frozenAt 
    };
  } catch (error: any) {
    console.error('Error verifying jury session:', error);
    return { success: false, error: error.message || 'Session verification failed' };
  }
}

/**
 * Check if the project supports team assignment.
 * Returns true if assignments collection is not empty.
 */
export async function checkAssignmentSupport() {
  try {
    const db = getAdminDb();
    const anyAssignmentsSnap = await db.collection('assignments').limit(1).get();
    return !anyAssignmentsSnap.empty;
  } catch (error) {
    console.error('Error checking assignment support:', error);
    return false;
  }
}

/**
 * Fetch all teams assigned to the current jury, along with their scores.
 */
export async function getJuryDashboardData() {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    
    // 1. Check if assignments exist in the project
    const assignmentsExist = await checkAssignmentSupport();
    if (!assignmentsExist) {
      return { success: true, assignmentsSupported: false, teams: [] };
    }

    // 2. Fetch teams assigned to this jury member
    const assignmentsSnap = await db.collection('assignments')
      .where('juryEmail', '==', session.email)
      .get();
    
    const assignedTeamIds = assignmentsSnap.docs.map(doc => doc.data().teamId?.trim().toLowerCase()).filter(Boolean);

    if (assignedTeamIds.length === 0) {
      return { 
        success: true, 
        assignmentsSupported: true, 
        teams: [], 
        scoresFrozen: session.scoresFrozen,
        frozenAt: session.frozenAt 
      };
    }

    // 3. Fetch team documents
    // Firestore in query has a limit of 30 items
    const chunks: string[][] = [];
    for (let i = 0; i < assignedTeamIds.length; i += 30) {
      chunks.push(assignedTeamIds.slice(i, i + 30));
    }

    const teamDocs: any[] = [];
    const teamSnapshots = await Promise.all(
      chunks.map(chunk => db.collection('teams').where('__name__', 'in', chunk).get())
    );
    teamSnapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        teamDocs.push({ id: doc.id, ...doc.data() });
      });
    });

    // 4. Fetch score records submitted by this jury
    const scoresSnap = await db.collection('scores')
      .where('juryEmail', '==', session.email)
      .get();

    const scoreMap = new Map<string, { score: number; highlighted: boolean }>();
    scoresSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.teamId) {
        scoreMap.set(data.teamId.trim().toLowerCase(), {
          score: typeof data.score === 'number' ? data.score : 0,
          highlighted: data.highlighted === true
        });
      }
    });

    // 5. Build and map teams list
    const teams: SimpleTeam[] = teamDocs.map(doc => {
      const scoreInfo = scoreMap.get(doc.id);
      
      // Decrypt lead name to show on card
      let leadName = 'N/A';
      try {
        if (doc.leadData) {
          const lead = decryptJSON(doc.leadData);
          leadName = lead.name || 'N/A';
        }
      } catch (e) {
        console.error(`Failed to decrypt leadData for team card ${doc.id}`, e);
      }

      // Count members (decrypted)
      let membersCount = 1; // lead is a member
      try {
        if (doc.membersData) {
          const members = decryptJSON(doc.membersData);
          if (Array.isArray(members)) {
            membersCount += members.length;
          }
        }
      } catch (e) {
        console.error(`Failed to decrypt membersData for team card ${doc.id}`, e);
      }

      return {
        id: doc.id,
        teamName: doc.teamName || doc.id,
        problemStatement: doc.problemStatement || 'N/A',
        leadEmail: doc.leadEmail || 'N/A',
        leadName,
        membersCount,
        labNumber: doc.labNumber || 'N/A', // dynamic fallback
        teamNumber: doc.teamNumber || 'N/A', // dynamic fallback
        evaluationStatus: scoreInfo !== undefined ? 'Evaluated' : 'Pending',
        highlighted: scoreInfo ? scoreInfo.highlighted : false,
        score: scoreInfo ? scoreInfo.score : undefined
      };
    });

    return { 
      success: true, 
      assignmentsSupported: true, 
      teams, 
      scoresFrozen: session.scoresFrozen,
      frozenAt: session.frozenAt 
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
    const cleanTeamId = teamId.trim().toLowerCase();
    
    // Check if team is assigned to this jury
    const assignedCheck = await db.collection('assignments')
      .where('juryEmail', '==', session.email)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();
      
    if (assignedCheck.empty) {
      return { success: false, error: 'Unauthorized: This team is not assigned to you.' };
    }

    const doc = await db.collection('teams').doc(cleanTeamId).get();
    if (!doc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const data = doc.data()!;
    let leadData = { name: 'N/A', batchNumber: 'N/A', department: 'N/A', year: 'N/A', section: 'N/A', contactNumber: 'N/A' };
    let membersData: any[] = [];

    try {
      if (data.leadData) leadData = decryptJSON(data.leadData);
    } catch (e) {
      console.error(`Failed to decrypt leadData for team details ${doc.id}`, e);
    }

    try {
      if (data.membersData) membersData = decryptJSON(data.membersData);
    } catch (e) {
      console.error(`Failed to decrypt membersData for team details ${doc.id}`, e);
    }

    // Fetch score record for this jury and team
    const scoresSnap = await db.collection('scores')
      .where('juryEmail', '==', session.email)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();

    let scoreData: EvaluationData | undefined = undefined;
    if (!scoresSnap.empty) {
      const scoreDoc = scoresSnap.docs[0].data();
      scoreData = {
        innovation: scoreDoc.innovation ?? 0,
        technicalFeasibility: scoreDoc.technicalFeasibility ?? 0,
        impact: scoreDoc.impact ?? 0,
        presentation: scoreDoc.presentation ?? 0,
        remarks: scoreDoc.remarks ?? '',
        highlighted: scoreDoc.highlighted === true,
        score: scoreDoc.score ?? 0,
      };
    }

    const teamDetails: DetailedTeam = {
      id: doc.id,
      teamName: data.teamName || doc.id,
      problemStatement: data.problemStatement || 'N/A',
      leadEmail: data.leadEmail || 'N/A',
      leadName: leadData.name,
      membersCount: 1 + membersData.length,
      labNumber: data.labNumber || 'N/A',
      teamNumber: data.teamNumber || 'N/A',
      evaluationStatus: scoreData !== undefined ? 'Evaluated' : 'Pending',
      highlighted: scoreData ? scoreData.highlighted : false,
      score: scoreData ? scoreData.score : undefined,
      leadData,
      membersData,
      proposedSolution: data.proposedSolution || 'N/A',
      projectDescription: data.projectDescription || 'N/A',
      abstract: data.abstract || 'N/A',
      techStack: data.techStack || 'N/A',
      submissionLink: data.submissionLink || undefined,
    };

    return { success: true, teamDetails, scoreData, scoresFrozen: session.scoresFrozen };

  } catch (error: any) {
    console.error('Error fetching team details:', error);
    return { success: false, error: error.message || 'Failed to fetch team details' };
  }
}

/**
 * Save or update evaluation for a team.
 */
export async function saveEvaluation(
  teamId: string,
  rubrics: { innovation: number; technicalFeasibility: number; impact: number; presentation: number },
  remarks: string,
  highlighted: boolean
) {
  const session = await verifyJurySession();
  if (!session.success || !session.email || !session.juryName) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  if (session.scoresFrozen) {
    return { success: false, error: 'Cannot save: Your scores have already been frozen.' };
  }

  // Validate rubrics
  const fields = ['innovation', 'technicalFeasibility', 'impact', 'presentation'] as const;
  for (const field of fields) {
    const val = rubrics[field];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 10) {
      return { success: false, error: `${field.replace(/([A-Z])/g, ' $1')} score must be an integer between 0 and 10.` };
    }
  }

  const cleanTeamId = teamId.trim().toLowerCase();
  const totalScore = rubrics.innovation + rubrics.technicalFeasibility + rubrics.impact + rubrics.presentation;

  try {
    const db = getAdminDb();
    
    // Verify team is assigned to this jury
    const assignedCheck = await db.collection('assignments')
      .where('juryEmail', '==', session.email)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();
      
    if (assignedCheck.empty) {
      return { success: false, error: 'Unauthorized: This team is not assigned to you.' };
    }

    const scoresRef = db.collection('scores');
    const existingSnap = await scoresRef
      .where('juryEmail', '==', session.email)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // Update existing record
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        innovation: rubrics.innovation,
        technicalFeasibility: rubrics.technicalFeasibility,
        impact: rubrics.impact,
        presentation: rubrics.presentation,
        score: totalScore,
        remarks: remarks.trim(),
        highlighted,
        updatedAt: new Date(),
      });
      return { success: true, updated: true };
    } else {
      // Create new record
      await scoresRef.add({
        teamId: cleanTeamId,
        juryEmail: session.email,
        juryName: session.juryName,
        innovation: rubrics.innovation,
        technicalFeasibility: rubrics.technicalFeasibility,
        impact: rubrics.impact,
        presentation: rubrics.presentation,
        score: totalScore,
        remarks: remarks.trim(),
        highlighted,
        frozen: false,
        createdAt: new Date(),
      });
      return { success: true, updated: false };
    }

  } catch (error: any) {
    console.error('Error saving evaluation:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}

/**
 * Toggle team highlight (star feature).
 */
export async function toggleHighlight(teamId: string, highlighted: boolean) {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  if (session.scoresFrozen) {
    return { success: false, error: 'Cannot update: Your scores are frozen.' };
  }

  const cleanTeamId = teamId.trim().toLowerCase();

  try {
    const db = getAdminDb();
    const scoresRef = db.collection('scores');
    const existingSnap = await scoresRef
      .where('juryEmail', '==', session.email)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        highlighted,
        updatedAt: new Date(),
      });
      return { success: true };
    } else {
      // If team score record does not exist yet, we initialize a blank evaluation with highlight toggled
      await scoresRef.add({
        teamId: cleanTeamId,
        juryEmail: session.email,
        juryName: session.juryName,
        innovation: 0,
        technicalFeasibility: 0,
        impact: 0,
        presentation: 0,
        score: 0,
        remarks: '',
        highlighted,
        frozen: false,
        createdAt: new Date(),
      });
      return { success: true };
    }
  } catch (error: any) {
    console.error('Error toggling highlight:', error);
    return { success: false, error: error.message || 'Failed to update highlight' };
  }
}

/**
 * Freeze scores. All evaluations submitted by the jury become read-only.
 */
export async function freezeJuryScores() {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  if (session.scoresFrozen) {
    return { success: false, error: 'Scores are already frozen.' };
  }

  try {
    const db = getAdminDb();
    
    // 1. Get all assignments
    const assignmentsSnap = await db.collection('assignments')
      .where('juryEmail', '==', session.email)
      .get();
      
    const assignedTeamIds = assignmentsSnap.docs.map(doc => doc.data().teamId?.trim().toLowerCase()).filter(Boolean);

    if (assignedTeamIds.length === 0) {
      return { success: false, error: 'You have no assigned teams to evaluate.' };
    }

    // 2. Fetch score records for these teams
    const scoresSnap = await db.collection('scores')
      .where('juryEmail', '==', session.email)
      .get();

    const evaluatedTeamIds = scoresSnap.docs.map(doc => doc.data().teamId?.trim().toLowerCase()).filter(Boolean);
    const pendingCount = assignedTeamIds.filter(id => !evaluatedTeamIds.includes(id)).length;

    if (pendingCount > 0) {
      return { success: false, error: `Cannot freeze scores: You still have ${pendingCount} pending team(s) to evaluate.` };
    }

    // 3. Mark all score documents as frozen
    const batch = db.batch();
    scoresSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        frozen: true,
        frozenAt: new Date(),
      });
    });

    // 4. Update freeze status in roles collection
    const roleRef = db.collection('roles').doc(session.email);
    batch.update(roleRef, {
      scoresFrozen: true,
      frozenAt: new Date(),
    });

    await batch.commit();

    return { success: true };

  } catch (error: any) {
    console.error('Error freezing scores:', error);
    return { success: false, error: error.message || 'Failed to freeze scores' };
  }
}
