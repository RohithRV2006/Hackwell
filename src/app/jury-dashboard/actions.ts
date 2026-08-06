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

    // Retrieve assigned lab from labs collection
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
        return ajName === jn || ajName === em || ajId === em || ajId === ji || ajName === ji;
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
      return { success: true, teams: [] };
    }

    // 2. Fetch score records in evaluations/prelims
    const prelimsRecords = await getEvalRecords('prelims');
    const scoreMap = new Map<string, { isFrozen: boolean; totalScore: number; selectedForFinal: boolean }>();

    prelimsRecords.forEach((r) => {
      const matchJury =
        r.juryId === session.juryId ||
        r.juryId === session.email ||
        (r.juryName && r.juryName.toLowerCase() === session.juryName.toLowerCase());

      if (matchJury && r.teamId) {
        const cleanTeamId = r.teamId.trim();
        scoreMap.set(cleanTeamId, {
          isFrozen: r.isFrozen === true,
          totalScore: typeof r.totalScore === 'number' ? r.totalScore : 0,
          selectedForFinal: Boolean(r.selectedForFinal),
        });
      }
    });

    // 3. Check Phase 3 (Prelims Round) timeline status
    let prelimsActive = false;
    let prelimsState: 'not-set' | 'active' | 'ended' = 'not-set';
    try {
      const timelines = await getEventTimelines();
      if (timelines?.timeline3) {
        const t3 = timelines.timeline3;
        prelimsState = t3.state || 'not-set';
        prelimsActive = t3.state === 'active' && t3.enabled !== false;
      }
    } catch (err) {
      console.error('Error checking timeline status:', err);
    }

    // 4. Map teams list with assignment tracking
    const teams: SimpleTeam[] = allTeams.map((t) => {
      const cleanId = t.id.trim();
      const scoreInfo = scoreMap.get(cleanId);

      const judgeVal = t.judge || 'Unassigned';
      const labNoVal = t.labNo || t.assignedLabName || 'Unassigned';

      const isAssignedToJury =
        (judgeVal !== 'Unassigned' &&
          (judgeVal.toLowerCase() === session.juryName.toLowerCase() ||
            judgeVal.toLowerCase() === session.email.toLowerCase() ||
            judgeVal.toLowerCase() === session.juryId.toLowerCase())) ||
        (labNoVal !== 'Unassigned' &&
          session.labName !== 'N/A' &&
          labNoVal.toLowerCase() === session.labName.toLowerCase()) ||
        (t.assignedLabId && session.assignedLabId && t.assignedLabId === session.assignedLabId);

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
      };
    });

    const assignedTeams = teams.filter((t) => t.isAssignedToJury);
    assignedTeams.sort((a, b) => a.teamName.localeCompare(b.teamName));

    return {
      success: true,
      teams: assignedTeams,
      prelimsActive,
      prelimsState,
    };
  } catch (error: any) {
    console.error('Error fetching jury dashboard data:', error);
    return { success: false, error: error.message || 'Failed to fetch dashboard data' };
  }
}

/**
 * Fetch detailed team information.
 */
export async function getTeamDetails(teamId: string) {
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

    // Fetch existing evaluation in evaluations/prelims
    const evalId = `prelims_${session.juryId}_${cleanTeamId}`;
    const records = await getEvalRecords('prelims');
    const existingRec = records.find((r) => r.id === evalId || (r.teamId === cleanTeamId && r.juryId === session.juryId));

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
 * Save evaluation for a team inside evaluations/prelims and freeze it.
 */
export async function submitAndFreezeEvaluation(
  teamId: string,
  teamName: string,
  displayId: string,
  rubric: Rubric,
  feedback: string,
  selectedForFinal: boolean = false,
  selectionReason: string = ''
) {
  const session = await verifyJurySession();
  if (!session.success || !session.email || !session.juryName) {
    return { success: false, error: session.error || 'Unauthorized' };
  }

  const cleanTeamId = teamId.trim();

  // Check Phase 3 (Prelims Round) timeline status
  let prelimsActive = false;
  try {
    const timelines = await getEventTimelines();
    const t3 = timelines?.timeline3;
    prelimsActive = t3?.state === 'active' && t3?.enabled !== false;
  } catch (err) {
    console.error('Error checking timeline status:', err);
  }

  if (!prelimsActive) {
    return {
      success: false,
      error: 'Cannot submit evaluation: Phase 3 (Prelims Round) has not been activated by the admin.',
    };
  }

  // Check if already frozen
  const evalId = `prelims_${session.juryId}_${cleanTeamId}`;
  const records = await getEvalRecords('prelims');
  const existingRec = records.find((r) => r.id === evalId || (r.teamId === cleanTeamId && r.juryId === session.juryId));

  if (existingRec && existingRec.isFrozen) {
    return { success: false, error: 'Cannot save: Your scores for this team are already frozen.' };
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
    const evaluationPayload = {
      id: evalId,
      round: 'prelims',
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
      selectedForFinal: Boolean(selectedForFinal),
      selectionReason: selectionReason.trim(),
      isFrozen: true,
    };

    const res = await upsertEvalRecord('prelims', evaluationPayload);
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to save evaluation' };
    }

    // Update team document's judge and labNo if session has lab info
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

    return { success: true };
  } catch (error: any) {
    console.error('Error saving and freezing evaluation:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}
