'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';
import { FieldValue } from 'firebase-admin/firestore';

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

export interface Rubric {
  problemStatement: number;
  presentation: number;
  communication: number;
  solution: number;
  idea: number;
}

export interface TeamScore {
  id: string;
  teamId: string;
  juryName: string;
  rubric?: Rubric;
  totalScore?: number;
  feedback?: string;
  starred?: boolean;
  createdAt?: string;
  updatedAt?: string;
  
  // Backward compatibility
  score: number;
}

export interface EvaluationData {
  problemStatement: number;
  presentation: number;
  communication: number;
  solution: number;
  idea: number;
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

    // Check if jury scores are frozen in roles and get juryId
    let scoresFrozen = false;
    let frozenAt = null;
    let juryId = '';

    try {
      const db = getAdminDb();
      const roleDoc = await db.collection('roles').doc(email).get();
      if (roleDoc.exists) {
        const data = roleDoc.data();
        scoresFrozen = data?.scoresFrozen === true;
        frozenAt = data?.frozenAt ? (data.frozenAt.toDate ? data.frozenAt.toDate().toISOString() : data.frozenAt) : null;
        juryId = data?.juryId || '';
      }
    } catch (e) {
      console.error('Error fetching role freeze status:', e);
    }

    // Try to resolve juryName from 'jury' collection if we didn't get it, or fallback
    let juryName = email.split('@')[0];
    juryName = juryName.charAt(0).toUpperCase() + juryName.slice(1);
    let institution = 'N/A';

    try {
      const db = getAdminDb();
      let jurySnap;
      if (juryId) {
        jurySnap = await db.collection('jury').doc(juryId).get();
        if (jurySnap.exists) {
          const data = jurySnap.data();
          juryName = data?.juryName || juryName;
          institution = data?.institution || institution;
        }
      } else {
        jurySnap = await db.collection('jury').where('email', '==', email).limit(1).get();
        if (!jurySnap.empty) {
          const doc = jurySnap.docs[0];
          juryId = doc.id; // Recover ID for legacy users
          const data = doc.data();
          juryName = data.juryName || juryName;
          institution = data.institution || institution;
        }
      }
    } catch (e) {
      console.warn('Could not query jury collection for email. Using fallback name.', e);
    }

    return { 
      success: true, 
      email, 
      juryName, 
      institution,
      scoresFrozen,
      frozenAt,
      juryId
    };
  } catch (error: any) {
    console.error('Error verifying jury session:', error);
    return { success: false, error: error.message || 'Session verification failed' };
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
    
    // 1. Fetch all teams (no assignment restriction)
    const teamsSnap = await db.collection('teams').get();
    
    if (teamsSnap.empty) {
      return { 
        success: true, 
        assignmentsSupported: true, 
        teams: [], 
        scoresFrozen: session.scoresFrozen,
        frozenAt: session.frozenAt 
      };
    }

    const teamDocs = teamsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

    // 2. Fetch score records submitted by this jury
    const scoresSnap = await db.collection('prelimsEvaluations')
      .where('juryId', '==', session.juryId)
      .get();

    const scoreMap = new Map<string, { score: number; highlighted: boolean }>();
    scoresSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.teamId) {
        scoreMap.set(data.teamId.trim().toLowerCase(), {
          score: typeof data.totalScore === 'number' ? data.totalScore : 0,
          highlighted: data.highlighted === true
        });
      }
    });

    // 5. Build and map teams list
    const teams: SimpleTeam[] = teamDocs.map(doc => {
      const scoreInfo = scoreMap.get(doc.id);
      
      const leadName = doc.leadData?.name || 'N/A';
      const membersCount = 1 + (Array.isArray(doc.membersData) ? doc.membersData.length : 0);

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
    
    const doc = await db.collection('teams').doc(cleanTeamId).get();
    if (!doc.exists) {
      return { success: false, error: 'Team not found' };
    }

    const data = doc.data()!;
    let leadData = data.leadData || { name: 'N/A', batchNumber: 'N/A', department: 'N/A', year: 'N/A', section: 'N/A', contactNumber: 'N/A' };
    let membersData = data.membersData || [];

    // Fetch score record for this jury and team
    const scoresSnap = await db.collection('prelimsEvaluations')
      .where('juryId', '==', session.juryId)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();

    let scoreData: EvaluationData | undefined = undefined;
    if (!scoresSnap.empty) {
      const scoreDoc = scoresSnap.docs[0].data();
      const r = scoreDoc.rubric || {};
      scoreData = {
        problemStatement: r.problemStatement ?? 0,
        presentation: r.presentation ?? 0,
        communication: r.communication ?? 0,
        solution: r.solution ?? 0,
        idea: r.idea ?? 0,
        remarks: scoreDoc.remarks ?? '',
        highlighted: scoreDoc.highlighted === true,
        score: scoreDoc.totalScore ?? 0,
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
  rubrics: { problemStatement: number; presentation: number; communication: number; solution: number; idea: number },
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
  const fields = ['problemStatement', 'presentation', 'communication', 'solution', 'idea'] as const;
  for (const field of fields) {
    const val = rubrics[field];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0 || val > 10) {
      return { success: false, error: `${field.replace(/([A-Z])/g, ' $1')} score must be an integer between 0 and 10.` };
    }
  }

  const cleanTeamId = teamId.trim().toLowerCase();
  const totalScore = rubrics.problemStatement + rubrics.presentation + rubrics.communication + rubrics.solution + rubrics.idea;

  try {
    const db = getAdminDb();
    
    // Verify team exists
    const teamDoc = await db.collection('teams').doc(cleanTeamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: 'Team not found.' };
    }

    const scoresRef = db.collection('prelimsEvaluations');
    const existingSnap = await scoresRef
      .where('juryId', '==', session.juryId)
      .where('teamId', '==', cleanTeamId)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      // Update existing record
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        rubric: {
          problemStatement: rubrics.problemStatement,
          presentation: rubrics.presentation,
          communication: rubrics.communication,
          solution: rubrics.solution,
          idea: rubrics.idea,
        },
        totalScore: totalScore,
        remarks: remarks.trim(),
        highlighted,
        updatedAt: new Date(),
      });
      return { success: true, updated: true };
    } else {
      // Create new record
      await scoresRef.add({
        teamId: cleanTeamId,
        juryId: session.juryId,
        rubric: {
          problemStatement: rubrics.problemStatement,
          presentation: rubrics.presentation,
          communication: rubrics.communication,
          solution: rubrics.solution,
          idea: rubrics.idea,
        },
        totalScore: totalScore,
        remarks: remarks.trim(),
        highlighted,
        isFrozen: false,
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
    const scoresRef = db.collection('prelimsEvaluations');
    const existingSnap = await scoresRef
      .where('juryId', '==', session.juryId)
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
        juryId: session.juryId,
        rubric: {
          innovation: 0,
          technicalFeasibility: 0,
          impact: 0,
          presentation: 0,
        },
        totalScore: 0,
        remarks: '',
        highlighted,
        isFrozen: false,
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
    
    // 1. Fetch score records for this jury
    const scoresSnap = await db.collection('prelimsEvaluations')
      .where('juryId', '==', session.juryId)
      .get();

    if (scoresSnap.empty) {
      return { success: false, error: 'You have not evaluated any teams yet.' };
    }

    // 3. Mark all score documents as frozen
    const batch = db.batch();
    scoresSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        isFrozen: true,
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

export interface JuryMember {
  id: string;
  email: string;
  juryName: string;
  institution: string;
}

export async function getAllJuryMembers() {
  try {
    const db = getAdminDb();
    const jurySnap = await db.collection('jury').get();
    const juryList: JuryMember[] = jurySnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        juryName: data.juryName || '',
        institution: data.institution || 'N/A'
      };
    });
    return { success: true, juryList };
  } catch (error: any) {
    console.error('Error fetching jury members:', error);
    return { success: false, error: error.message || 'Failed to fetch jury members' };
  }
}
