'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';

export interface SimpleTeam {
  id: string; // teamName lowercase or doc.id
  teamName: string;
  displayId: string;
  evaluationStatus: 'Pending' | 'Evaluated';
  isFrozen: boolean;
  totalScore?: number;
  judge?: string;
  labNo?: string;
  isAssignedToJury?: boolean;
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
      juryName = data?.name || data?.juryName || juryName;
      if (data?.juryId) juryId = data.juryId;
    } else {
      const juryDoc = await db.collection('jury').doc(email).get();
      if (juryDoc.exists) {
        const data = juryDoc.data();
        juryName = data?.juryName || data?.name || juryName;
      }
    }

    // Retrieve assigned lab from labs collection
    let labName = 'N/A';
    let assignedLabId = '';
    try {
      const labsSnap = await db.collection('labs').get();
      const matchedLab = labsSnap.docs.find(doc => {
        const data = doc.data();
        const ajName = (data.assignedJuryName || '').trim().toLowerCase();
        const ajId = (data.assignedJuryId || '').trim().toLowerCase();
        const em = email.toLowerCase();
        const jn = juryName.toLowerCase();
        const ji = juryId.toLowerCase();
        return ajName === jn || ajName === em || ajId === em || ajId === ji || ajName === ji;
      });
      if (matchedLab) {
        labName = matchedLab.data().labName || matchedLab.data().labCode || matchedLab.id;
        assignedLabId = matchedLab.id;
      }
    } catch (e) {
      console.error('Error fetching lab assignment:', e);
    }

    return { 
      success: true, 
      email, 
      juryName, 
      labName,
      juryId,
      assignedLabId
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

    // 2. Fetch score records in BOTH prelimsEvaluations and juryEvaluations tables
    const [prelimsSnap, juryEvalSnap] = await Promise.all([
      db.collection('prelimsEvaluations').get(),
      db.collection('juryEvaluations').get()
    ]);
    // 2. Fetch score records in the new evaluations table for this jury (prelims round)
    const scoresSnap = await db.collection('evaluations')
      .where('round', '==', 'prelims')
      .where('juryId', '==', session.juryId)
      .get();

    const scoreMap = new Map<string, { isFrozen: boolean; totalScore: number }>();

    const processEvalDoc = (doc: any) => {
      const data = doc.data();
      const matchJury = data.juryId === session.juryId || 
                        data.juryId === session.email || 
                        (data.juryName && data.juryName.toLowerCase() === session.juryName.toLowerCase());
      if (matchJury && data.teamId) {
        const cleanTeamId = data.teamId.trim();
        scoreMap.set(cleanTeamId, {
          isFrozen: data.isFrozen === true,
          totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0
        });
      }
    };

    prelimsSnap.docs.forEach(processEvalDoc);
    juryEvalSnap.docs.forEach(processEvalDoc);

    // 3. Check Phase 3 (Prelims Round) timeline status
    let prelimsActive = false;
    let prelimsState: 'not-set' | 'active' | 'ended' = 'not-set';
    try {
      const timelinesDoc = await db.collection('metadata').doc('eventTimelines').get();
      if (timelinesDoc.exists) {
        const t3 = timelinesDoc.data()?.timeline3;
        if (t3) {
          prelimsState = t3.state || 'not-set';
          prelimsActive = t3.state === 'active' && t3.enabled !== false;
        }
      }
    } catch (err) {
      console.error('Error checking timeline status:', err);
    }

    // 4. Map teams list with assignment tracking
    const teams: SimpleTeam[] = teamDocs.map(doc => {
      const cleanId = doc.id.trim();
      const scoreInfo = scoreMap.get(cleanId);

      const judgeVal = doc.judge || 'Unassigned';
      const labNoVal = doc.labNo || doc.assignedLabName || 'Unassigned';

      const isAssignedToJury = 
        (judgeVal !== 'Unassigned' && (
          judgeVal.toLowerCase() === session.juryName.toLowerCase() ||
          judgeVal.toLowerCase() === session.email.toLowerCase() ||
          judgeVal.toLowerCase() === session.juryId.toLowerCase()
        )) ||
        (labNoVal !== 'Unassigned' && session.labName !== 'N/A' && (
          labNoVal.toLowerCase() === session.labName.toLowerCase()
        )) ||
        (doc.assignedLabId && session.assignedLabId && doc.assignedLabId === session.assignedLabId);

      return {
        id: doc.id,
        teamName: doc.teamName || doc.id,
        displayId: doc.displayId || doc.id,
        evaluationStatus: scoreInfo !== undefined ? 'Evaluated' : 'Pending',
        isFrozen: scoreInfo ? scoreInfo.isFrozen : false,
        totalScore: scoreInfo ? scoreInfo.totalScore : undefined,
        judge: judgeVal,
        labNo: labNoVal,
        isAssignedToJury: !!isAssignedToJury
      };
    });

    // Sort: teams assigned to this jury come first, then alphabetically by team name
    teams.sort((a, b) => {
      if (a.isAssignedToJury && !b.isAssignedToJury) return -1;
      if (!a.isAssignedToJury && b.isAssignedToJury) return 1;
      return a.teamName.localeCompare(b.teamName);
    });

    return { 
      success: true, 
      teams,
      prelimsActive,
      prelimsState
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

    // Fetch existing evaluation in both prelimsEvaluations and juryEvaluations
    const docId = `${session.juryId}_${cleanTeamId}`;
    let evalDoc = await db.collection('prelimsEvaluations').doc(docId).get();
    if (!evalDoc.exists) {
      evalDoc = await db.collection('juryEvaluations').doc(docId).get();
    }
    if (!evalDoc.exists) {
      const searchSnap = await db.collection('prelimsEvaluations')
        .where('teamId', '==', cleanTeamId)
        .where('juryId', '==', session.juryId)
        .limit(1)
        .get();
      if (!searchSnap.empty) {
        evalDoc = searchSnap.docs[0];
      }
    }
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
          conceptStrength: r.conceptStrength ?? (r.problemStatement ? Math.round((r.problemStatement / 10) * 12) : 0),
          buildIntelligence: r.buildIntelligence ?? (r.solution ? Math.round((r.solution / 10) * 12) : 0),
          deliveryImpact: r.deliveryImpact ?? (r.presentation ? Math.round((r.presentation / 10) * 8) : 0),
          liveDefenseScore: r.liveDefenseScore ?? (r.idea ? Math.round((r.idea / 10) * 8) : 0),
          communication: r.communication ?? 0,
        },
        feedback: scoreDoc.feedback || scoreDoc.remarks || '',
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

  // Check Phase 3 (Prelims Round) timeline status
  let prelimsActive = false;
  try {
    const timelinesDoc = await db.collection('metadata').doc('eventTimelines').get();
    if (timelinesDoc.exists) {
      const t3 = timelinesDoc.data()?.timeline3;
      prelimsActive = t3?.state === 'active' && t3?.enabled !== false;
    }
  } catch (err) {
    console.error('Error checking timeline status:', err);
  }

  if (!prelimsActive) {
    return { success: false, error: 'Cannot submit evaluation: Phase 3 (Prelims Round) has not been activated by the admin.' };
  }

  // Check if already frozen in either collection
  const [existingPrelims, existingJury] = await Promise.all([
    db.collection('prelimsEvaluations').doc(docId).get(),
    db.collection('juryEvaluations').doc(docId).get()
  ]);

  if ((existingPrelims.exists && existingPrelims.data()?.isFrozen === true) ||
      (existingJury.exists && existingJury.data()?.isFrozen === true)) {
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
    const createdTime = existingPrelims.exists ? (existingPrelims.data()?.createdAt || now) : (existingJury.exists ? (existingJury.data()?.createdAt || now) : now);
    
    const evaluationPayload = {
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
        communication: rubric.communication,
        // Mapped admin rubric fields for seamless admin UI integration
        problemStatement: Math.round((rubric.conceptStrength / 12) * 10),
        presentation: Math.round((rubric.deliveryImpact / 8) * 10),
        solution: Math.round((rubric.buildIntelligence / 12) * 10),
        idea: Math.round((rubric.liveDefenseScore / 8) * 10),
      },
      totalScore: totalScore,
      feedback: feedback.trim(),
      remarks: feedback.trim(),
      isFrozen: true,
      createdAt: createdTime,
      updatedAt: now
    };

    // Save to BOTH prelimsEvaluations AND juryEvaluations
    await Promise.all([
      db.collection('prelimsEvaluations').doc(docId).set(evaluationPayload, { merge: true }),
      db.collection('juryEvaluations').doc(docId).set(evaluationPayload, { merge: true })
    ]);

    // Update team document's judge and labNo if unassigned
    const teamData = teamDoc.data() || {};
    const teamUpdates: Record<string, any> = {};
    if (!teamData.judge || teamData.judge === 'Unassigned') {
      teamUpdates.judge = session.juryName;
    }
    if (!teamData.labNo || teamData.labNo === 'Unassigned') {
      if (session.labName && session.labName !== 'N/A') {
        teamUpdates.labNo = session.labName;
        teamUpdates.assignedLabName = session.labName;
      }
    }
    if (Object.keys(teamUpdates).length > 0) {
      await teamDoc.ref.update(teamUpdates);
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error saving and freezing evaluation:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}

