'use server';

import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';
import {
  getAllTeamsFlatCached,
  findTeamInDomainDocs,
  updateTeamInDomainDoc,
  getEvalRecords,
  upsertEvalRecord,
  patchEvalRecord,
  getEventTimelines,
  getLabs,
  getRoles,
} from '@/lib/firestore-helpers';

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
  selectedForFinal?: boolean;
  selectionReason?: string;
  theme?: string;
  problemStatement?: string;
  evaluatedBy?: string;
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
  selectedForFinal?: boolean;
  selectionReason?: string;
  isFrozen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Helper to normalize string for flexible matching (removes non-alphanumeric chars)
 */
const cleanNorm = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Verify session and ensure role is 'jury'.
 * Fetches the lab assigned to this jury with robust fuzzy string matching.
 */
export async function verifyJurySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return { success: false, error: 'No active session' };

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return { success: false, error: 'Invalid session' };

    const email = decodedToken.email.trim().toLowerCase();
    const role = decodedToken.role || (await getUserRole(email));

    if (role !== 'jury') {
      return { success: false, error: 'Unauthorized: Jury role required' };
    }

    let juryName = email.split('@')[0];
    juryName = juryName.charAt(0).toUpperCase() + juryName.slice(1);
    let juryId = email;

    // Retrieve name and info from roles collection
    const roles = await getRoles();
    const roleData = roles.find((r) => String(r.email).toLowerCase() === email);

    if (roleData) {
      juryName = roleData.name || roleData.juryName || juryName;
      if (roleData.juryId) juryId = roleData.juryId;
    }

    // Retrieve assigned lab from labs collection with robust matching
    let labName = 'N/A';
    let assignedLabId = '';
    try {
      const labs = await getLabs();
      const matchedLab = labs.find((data: any) => {
        const ajName = (data.assignedJuryName || '').trim().toLowerCase();
        const ajId = (data.assignedJuryId || '').trim().toLowerCase();
        const em = email.toLowerCase();
        const jn = juryName.toLowerCase();
        const ji = juryId.toLowerCase();

        return (
          ajName === jn ||
          ajName === em ||
          ajId === em ||
          ajId === ji ||
          ajName === ji ||
          (ajName && cleanNorm(ajName) === cleanNorm(jn)) ||
          (ajId && cleanNorm(ajId) === cleanNorm(em)) ||
          (ajName && cleanNorm(ajName) === cleanNorm(em))
        );
      });
      if (matchedLab) {
        labName = matchedLab.labName || matchedLab.labCode || matchedLab.labId;
        assignedLabId = matchedLab.labId;
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
      assignedLabId,
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
    // 1. Fetch all teams from domain cache
    const allTeams = await getAllTeamsFlatCached();
    if (allTeams.length === 0) {
      return {
        success: true,
        teams: [],
        prelimsTeams: [],
        finaleTeams: [],
        prelimsActive: false,
        prelimsState: 'not-set',
        finaleActive: false,
        finaleState: 'not-set',
      };
    }

    // 2. Fetch score records in evaluations/prelims and evaluations/finale
    const [prelimsRecords, finaleRecords] = await Promise.all([
      getEvalRecords('prelims'),
      getEvalRecords('finale'),
    ]);

    const scoreMap = new Map<string, { isFrozen: boolean; totalScore: number; selectedForFinal: boolean; selectionReason: string }>();

    prelimsRecords.forEach((r) => {
      const matchJury =
        r.juryId === session.juryId ||
        r.juryId === session.email ||
        (r.juryName && r.juryName.toLowerCase() === session.juryName.toLowerCase()) ||
        cleanNorm(r.juryName || '') === cleanNorm(session.juryName) ||
        cleanNorm(r.juryId || '') === cleanNorm(session.email);

      if (matchJury && r.teamId) {
        const cleanTeamId = r.teamId.trim();
        scoreMap.set(cleanTeamId, {
          isFrozen: r.isFrozen === true,
          totalScore: typeof r.totalScore === 'number' ? r.totalScore : 0,
          selectedForFinal: Boolean(r.selectedForFinal),
          selectionReason: r.selectionReason || '',
        });
      }
    });

    // In Finale Round, any jury can view finale records. Store who evaluated each team.
    const finaleScoreMap = new Map<string, { isFrozen: boolean; totalScore: number; juryName: string; juryId: string }>();
    finaleRecords.forEach((r) => {
      if (r.teamId) {
        const cleanTeamId = r.teamId.trim();
        finaleScoreMap.set(cleanTeamId, {
          isFrozen: r.isFrozen === true,
          totalScore: typeof r.totalScore === 'number' ? r.totalScore : 0,
          juryName: r.juryName || r.juryId || 'Jury',
          juryId: r.juryId || '',
        });
      }
    });

    // 3. Check timelines status
    let prelimsActive = false;
    let prelimsState: 'not-set' | 'active' | 'ended' = 'not-set';
    let finaleActive = false;
    let finaleState: 'not-set' | 'active' | 'ended' = 'not-set';

    try {
      const timelines = await getEventTimelines();
      if (timelines?.timeline3) {
        const t3 = timelines.timeline3;
        prelimsState = t3.state || 'not-set';
        prelimsActive = t3.state === 'active' && t3.enabled !== false;
      }
      if (timelines?.timeline4) {
        const t4 = timelines.timeline4;
        finaleState = t4.state || 'not-set';
        finaleActive = t4.state === 'active' && t4.enabled !== false;
      }
    } catch (err) {
      console.error('Error checking timeline status:', err);
    }

    // 4. Map prelims assigned teams list with robust lab and judge matching
    const teams: SimpleTeam[] = allTeams.map((t) => {
      const cleanId = t.id.trim();
      const scoreInfo = scoreMap.get(cleanId);

      const judgeVal = t.judge || 'Unassigned';
      const labNoVal = t.labNo || t.assignedLabName || 'Unassigned';

      const isAssignedToJury =
        (judgeVal !== 'Unassigned' &&
          (judgeVal.toLowerCase() === session.juryName.toLowerCase() ||
            judgeVal.toLowerCase() === session.email.toLowerCase() ||
            judgeVal.toLowerCase() === session.juryId.toLowerCase() ||
            cleanNorm(judgeVal) === cleanNorm(session.juryName) ||
            cleanNorm(judgeVal) === cleanNorm(session.email))) ||
        (labNoVal !== 'Unassigned' &&
          session.labName !== 'N/A' &&
          (labNoVal.toLowerCase() === session.labName.toLowerCase() ||
            cleanNorm(labNoVal) === cleanNorm(session.labName))) ||
        (t.assignedLabId &&
          session.assignedLabId &&
          (t.assignedLabId === session.assignedLabId ||
            cleanNorm(t.assignedLabId) === cleanNorm(session.assignedLabId)));

      return {
        id: t.id,
        teamName: t.teamName || t.id,
        displayId: t.displayId || t.id,
        evaluationStatus: scoreInfo !== undefined ? 'Evaluated' : 'Pending',
        isFrozen: scoreInfo ? scoreInfo.isFrozen : false,
        totalScore: scoreInfo ? scoreInfo.totalScore : undefined,
        judge: judgeVal,
        labNo: labNoVal,
        isAssignedToJury: !!isAssignedToJury,
        selectedForFinal: scoreInfo ? scoreInfo.selectedForFinal : false,
        selectionReason: scoreInfo ? scoreInfo.selectionReason : '',
        theme: t.theme || '',
        problemStatement: t.problemStatement || '',
      };
    });

    const assignedTeams = teams.filter((t) => t.isAssignedToJury);
    assignedTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));

    // 5. Map finale qualified teams list (No jury pre-assignment filter for finale)
    const finaleQualifiedTeams: SimpleTeam[] = allTeams
      .filter((t) => t.finaleQualified === true || t.prelimsStatus === 'selected')
      .map((t) => {
        const cleanId = t.id.trim();
        const scoreInfo = finaleScoreMap.get(cleanId);
        return {
          id: t.id,
          teamName: t.teamName || t.id,
          displayId: t.displayId || t.id,
          evaluationStatus: scoreInfo !== undefined ? 'Evaluated' : 'Pending',
          isFrozen: scoreInfo ? scoreInfo.isFrozen : false,
          totalScore: scoreInfo ? scoreInfo.totalScore : undefined,
          evaluatedBy: scoreInfo ? scoreInfo.juryName : undefined,
          judge: t.judge || 'Unassigned',
          labNo: t.finalVenue || t.labNo || 'Unassigned',
          isAssignedToJury: true,
          theme: t.theme || '',
          problemStatement: t.problemStatement || '',
        };
      });

    finaleQualifiedTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));

    return {
      success: true,
      teams: assignedTeams,
      prelimsTeams: assignedTeams,
      finaleTeams: finaleQualifiedTeams,
      prelimsActive,
      prelimsState,
      finaleActive,
      finaleState,
      sessionInfo: {
        juryName: session.juryName,
        email: session.email,
        labName: session.labName,
      },
    };
  } catch (error: any) {
    console.error('Error fetching jury dashboard data:', error);
    return { success: false, error: error.message || 'Failed to fetch dashboard data' };
  }
}

/**
 * Fetch detailed team information.
 */
export async function getTeamDetails(teamId: string, round: 'prelims' | 'finale' = 'prelims') {
  const session = await verifyJurySession();
  if (!session.success || !session.email) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  try {
    const cleanTeamId = teamId.trim();

    // Fetch team details from domain docs
    const found = await findTeamInDomainDocs(cleanTeamId);
    if (!found) {
      return { success: false, error: 'Team not found' };
    }

    const data = found.team;
    const leadData = data.leadData || {
      name: 'N/A',
      batchNumber: 'N/A',
      department: 'N/A',
      year: 'N/A',
      section: 'N/A',
      contactNumber: 'N/A',
    };
    const membersData = data.membersData || [];

    const teamDetails: DetailedTeam = {
      id: data.id,
      teamName: data.teamName || data.id,
      displayId: data.displayId || data.id,
      leadData,
      membersData,
    };

    // Fetch existing evaluation in evaluations/prelims or evaluations/finale
    const records = await getEvalRecords(round);
    let existingRec;
    if (round === 'finale') {
      existingRec = records.find((r) => r.teamId === cleanTeamId);
    } else {
      const evalId = `${round}_${session.juryId}_${cleanTeamId}`;
      existingRec = records.find(
        (r) =>
          r.id === evalId ||
          (r.teamId === cleanTeamId &&
            (r.juryId === session.juryId ||
              r.juryId === session.email ||
              (r.juryName && r.juryName.toLowerCase() === session.juryName.toLowerCase())))
      );
    }

    let scoreData: EvaluationData | undefined = undefined;
    if (existingRec) {
      const r = existingRec.rubric || ({} as any);
      scoreData = {
        teamName: existingRec.teamName || data.teamName || data.id,
        displayId: (existingRec as any).displayId || data.displayId || data.id,
        teamId: existingRec.teamId || cleanTeamId,
        juryId: existingRec.juryId || session.juryId,
        juryName: existingRec.juryName || session.juryName,
        rubric: {
          conceptStrength: r.conceptStrength ?? 0,
          buildIntelligence: r.buildIntelligence ?? 0,
          deliveryImpact: r.deliveryImpact ?? 0,
          liveDefenseScore: r.liveDefenseScore ?? 0,
          communication: r.communication ?? 0,
        },
        feedback: existingRec.feedback || existingRec.remarks || '',
        totalScore: existingRec.totalScore ?? 0,
        selectedForFinal: Boolean(existingRec.selectedForFinal),
        selectionReason: existingRec.selectionReason || '',
        isFrozen: existingRec.isFrozen === true,
        createdAt: existingRec.createdAt || undefined,
      };
    }

    return { success: true, teamDetails, scoreData };
  } catch (error: any) {
    console.error('Error fetching team details:', error);
    return { success: false, error: error.message || 'Failed to fetch team details' };
  }
}

/**
 * Save evaluation for a team inside evaluations/prelims or evaluations/finale and freeze it.
 */
export async function submitAndFreezeEvaluation(
  teamId: string,
  teamName: string,
  displayId: string,
  rubric: Rubric,
  feedback: string,
  selectedForFinal: boolean = false,
  selectionReason: string = '',
  round: 'prelims' | 'finale' = 'prelims'
) {
  const session = await verifyJurySession();
  if (!session.success || !session.email || !session.juryName) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  const cleanTeamId = teamId.trim();

  // Check timeline status
  let roundActive = false;
  try {
    const timelines = await getEventTimelines();
    if (round === 'prelims') {
      const t3 = timelines?.timeline3;
      roundActive = t3?.state === 'active' && t3?.enabled !== false;
    } else {
      const t4 = timelines?.timeline4;
      roundActive = t4?.state === 'active' && t4?.enabled !== false;
    }
  } catch (err) {
    console.error('Error checking timeline status:', err);
  }

  if (!roundActive) {
    return {
      success: false,
      error: `Cannot submit evaluation: ${round === 'prelims' ? 'Phase 3 (Prelims Round)' : 'Phase 4 (Grand Finale)'} has not been activated by the admin.`,
    };
  }

  // Check if already frozen
  const records = await getEvalRecords(round);
  let existingRec;
  if (round === 'finale') {
    existingRec = records.find((r) => r.teamId === cleanTeamId);
  } else {
    const evalId = `${round}_${session.juryId}_${cleanTeamId}`;
    existingRec = records.find(
      (r) =>
        r.id === evalId ||
        (r.teamId === cleanTeamId &&
          (r.juryId === session.juryId ||
            r.juryId === session.email ||
            (r.juryName && r.juryName.toLowerCase() === session.juryName.toLowerCase())))
    );
  }

  if (existingRec && existingRec.isFrozen) {
    return {
      success: false,
      error: `Cannot save: This team has already been evaluated by ${existingRec.juryName || 'another jury'}.`,
    };
  }

  // Validate rubric scores
  const scoreConfig = [
    { key: 'conceptStrength', max: 12, label: 'Concept Strength' },
    { key: 'buildIntelligence', max: 12, label: 'Build Intelligence' },
    { key: 'deliveryImpact', max: 8, label: 'Delivery Impact' },
    { key: 'liveDefenseScore', max: 8, label: 'Live Defense Score' },
    { key: 'communication', max: 10, label: 'Communication' },
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

  const totalScore =
    rubric.conceptStrength +
    rubric.buildIntelligence +
    rubric.deliveryImpact +
    rubric.liveDefenseScore +
    rubric.communication;

  try {
    const evalId = round === 'finale' ? `finale_${cleanTeamId}` : `prelims_${session.juryId}_${cleanTeamId}`;

    const evaluationPayload = {
      id: evalId,
      round,
      teamName,
      displayId,
      teamId: cleanTeamId,
      juryId: session.juryId,
      juryName: session.juryName,
      rubric: {
        conceptStrength: rubric.conceptStrength,
        buildIntelligence: rubric.buildIntelligence,
        deliveryImpact: rubric.deliveryImpact,
        liveDefenseScore: rubric.liveDefenseScore,
        communication: rubric.communication,
      },
      totalScore,
      feedback: feedback.trim(),
      remarks: feedback.trim(),
      selectedForFinal: existingRec ? Boolean(existingRec.selectedForFinal) : Boolean(selectedForFinal),
      selectionReason: existingRec ? (existingRec.selectionReason || '') : selectionReason.trim(),
      isFrozen: true,
    };

    const res = await upsertEvalRecord(round, evaluationPayload);
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to save evaluation' };
    }

    // Update team document's judge and labNo if session has lab info
    if (round === 'prelims') {
      const teamUpdates: Record<string, any> = {};
      if (session.juryName) {
        teamUpdates.judge = session.juryName;
      }
      if (session.labName && session.labName !== 'N/A') {
        teamUpdates.labNo = session.labName;
        teamUpdates.assignedLabName = session.labName;
      }
      if (Object.keys(teamUpdates).length > 0) {
        await updateTeamInDomainDoc(cleanTeamId, teamUpdates);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error saving and freezing evaluation:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}

/**
 * Update the final round recommendation (selectedForFinal & selectionReason) for an evaluated team.
 * Persists immediately in evaluations/prelims Firestore document with proper sync.
 */
export async function updateFinalRoundRecommendation(
  teamId: string,
  selectedForFinal: boolean,
  selectionReason: string = ''
) {
  const session = await verifyJurySession();
  if (!session.success || !session.email || !session.juryId) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  const cleanTeamId = teamId.trim();

  // Find evaluation record in evaluations/prelims
  const records = await getEvalRecords('prelims');
  const existingRec = records.find(
    (r) =>
      r.id === `prelims_${session.juryId}_${cleanTeamId}` ||
      (r.teamId === cleanTeamId &&
        (r.juryId === session.juryId ||
          r.juryId === session.email ||
          (r.juryName && r.juryName.toLowerCase() === session.juryName.toLowerCase())))
  );

  if (!existingRec) {
    return { success: false, error: 'Team must be evaluated in the Score tab before managing final round recommendation.' };
  }

  const evalId = existingRec.id || `prelims_${session.juryId}_${cleanTeamId}`;

  const res = await patchEvalRecord('prelims', evalId, {
    selectedForFinal: Boolean(selectedForFinal),
    selectionReason: selectionReason.trim(),
  });

  if (!res.success) {
    return { success: false, error: res.error || 'Failed to save recommendation changes to database.' };
  }

  return { success: true };
}
