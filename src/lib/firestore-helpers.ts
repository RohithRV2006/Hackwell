import { getAdminDb } from './firebase-admin';
import { AdminTeamData, AdminScoreData, LabData, FinalLabData, JuryOption } from '@/app/admin/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Domain Document Slugs & Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DOMAIN_SLUGS: Record<string, { id: string; name: string }> = {
  'autonomous-agentic-ai': {
    id: 'autonomous-agentic-ai',
    name: 'Autonomous Agentic AI',
  },
  'adaptive-intelligent-systems': {
    id: 'adaptive-intelligent-systems',
    name: 'Adaptive Intelligent Systems',
  },
  'predictive-logistics-industrial-ai': {
    id: 'predictive-logistics-industrial-ai',
    name: 'Predictive Logistics using Industrial AI',
  },
  'ai-smart-business-solution': {
    id: 'ai-smart-business-solution',
    name: 'AI for Smart Business Solution',
  },
  'human-centered-ai': {
    id: 'human-centered-ai',
    name: 'Human Centered AI',
  },
};

export const ALL_DOMAIN_DOC_IDS = Object.keys(DOMAIN_SLUGS);

export function resolveDomainId(theme?: string): string {
  if (!theme) return 'autonomous-agentic-ai';

  const t = theme.toLowerCase().trim();

  if (t.includes('agentic') || t.includes('autonomous')) {
    return 'autonomous-agentic-ai';
  }
  if (t.includes('adaptive') || t.includes('adaptive intelligent')) {
    return 'adaptive-intelligent-systems';
  }
  if (t.includes('predictive') || t.includes('logistics') || t.includes('industrial')) {
    return 'predictive-logistics-industrial-ai';
  }
  if (t.includes('business') || t.includes('smart business')) {
    return 'ai-smart-business-solution';
  }
  if (t.includes('human') || t.includes('human centered')) {
    return 'human-centered-ai';
  }

  return 'autonomous-agentic-ai';
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams Collection Helpers (5 Domain Documents)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllTeamsFlatFromDomainDocs(): Promise<AdminTeamData[]> {
  const db = getAdminDb();
  const snaps = await Promise.all(
    ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
  );

  const allTeams: AdminTeamData[] = [];

  snaps.forEach((snap) => {
    if (snap.exists) {
      const data = snap.data();
      const teamsArr = Array.isArray(data?.teams) ? data.teams : [];
      teamsArr.forEach((t: any) => {
        const hasPpt = Boolean(t.pptLink && String(t.pptLink).trim().length > 0);
        allTeams.push({
          id: t.id,
          displayId: t.displayId || t.id,
          teamName: t.teamName || t.id,
          problemStatement: t.problemStatement || 'Not assigned',
          theme: t.theme || DOMAIN_SLUGS[snap.id]?.name || 'Autonomous Agentic AI',
          leadEmail: t.leadEmail || '',
          leadData: t.leadData || { name: '', batchNumber: '', department: '', year: '', section: '', contactNumber: '' },
          membersData: t.membersData || [],
          score: typeof t.score === 'number' ? t.score : 0,
          judge: t.judge || 'Unassigned',
          labNo: t.labNo || 'Unassigned',
          assignedLabId: t.assignedLabId || '',
          assignedLabName: t.assignedLabName || t.labNo || '',
          feedback: t.feedback || '',
          pptLink: t.pptLink || '',
          pptQualified: t.pptQualified !== false && hasPpt,
          pptStatus: t.pptStatus || (hasPpt ? 'submitted' : 'pending'),
          eliminated: t.eliminated === true || t.pptQualified === false,
          eliminationReason: t.eliminationReason || (hasPpt ? '' : 'No PPT presentation submitted during Phase 2'),
          prelimsStatus: t.prelimsStatus || (t.finaleQualified ? 'selected' : 'pending'),
          finaleQualified: t.finaleQualified === true,
          finalStatus: t.finalStatus || 'pending',
          finalVenue: t.finalVenue || 'TBA',
          isWinner: t.isWinner === true,
          winnerRank: typeof t.winnerRank === 'number' ? t.winnerRank : null,
          winnerTitle: t.winnerTitle || null,
          createdAt: t.createdAt ? (typeof t.createdAt === 'string' ? t.createdAt : t.createdAt.toDate?.()?.toISOString() || '') : '',
        });
      });
    }
  });

  return allTeams;
}

export async function findTeamInDomainDocs(teamId: string): Promise<{
  team: AdminTeamData;
  domainId: string;
  domainDocRef: any;
  index: number;
} | null> {
  const db = getAdminDb();
  const snaps = await Promise.all(
    ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
  );

  for (const snap of snaps) {
    if (snap.exists) {
      const data = snap.data();
      const teamsArr = Array.isArray(data?.teams) ? data.teams : [];
      const idx = teamsArr.findIndex((t: any) => t.id === teamId);
      if (idx !== -1) {
        return {
          team: teamsArr[idx],
          domainId: snap.id,
          domainDocRef: snap.ref,
          index: idx,
        };
      }
    }
  }

  return null;
}

export async function findTeamByLeadEmail(email: string): Promise<{
  team: AdminTeamData;
  domainId: string;
  domainDocRef: any;
  index: number;
} | null> {
  const targetEmail = email.toLowerCase().trim();
  const db = getAdminDb();
  const snaps = await Promise.all(
    ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
  );

  for (const snap of snaps) {
    if (snap.exists) {
      const data = snap.data();
      const teamsArr = Array.isArray(data?.teams) ? data.teams : [];
      const idx = teamsArr.findIndex(
        (t: any) => String(t.leadEmail || '').toLowerCase().trim() === targetEmail
      );
      if (idx !== -1) {
        return {
          team: teamsArr[idx],
          domainId: snap.id,
          domainDocRef: snap.ref,
          index: idx,
        };
      }
    }
  }

  return null;
}

export async function createTeamInDomainDoc(teamData: any): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    const db = getAdminDb();
    const domainId = resolveDomainId(teamData.theme);
    const domainRef = db.collection('teams').doc(domainId);

    const teamId = teamData.id || `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newTeamObj = {
      ...teamData,
      id: teamId,
      domainId,
      createdAt: teamData.createdAt || nowIso,
      updatedAt: nowIso,
    };

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(domainRef);
      let teamsArr = [];
      let domainName = DOMAIN_SLUGS[domainId]?.name || 'Domain';

      if (snap.exists) {
        const data = snap.data();
        teamsArr = Array.isArray(data.teams) ? data.teams : [];
        domainName = data.domainName || domainName;
      }

      // Check teamName or displayId uniqueness inside this domain
      const existingName = teamsArr.find(
        (t: any) => String(t.teamName || '').toLowerCase().trim() === String(teamData.teamName || '').toLowerCase().trim()
      );
      if (existingName) {
        throw new Error(`Team name "${teamData.teamName}" is already registered.`);
      }

      teamsArr.push(newTeamObj);

      transaction.set(
        domainRef,
        {
          domainId,
          domainName,
          teamCount: teamsArr.length,
          updatedAt: new Date(),
          teams: teamsArr,
        },
        { merge: true }
      );
    });

    return { success: true, teamId };
  } catch (error: any) {
    console.error('Error creating team in domain doc:', error);
    return { success: false, error: error.message || 'Failed to create team' };
  }
}

export async function updateTeamInDomainDoc(
  teamId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const found = await findTeamInDomainDocs(teamId);
    if (!found) {
      return { success: false, error: 'Team not found' };
    }

    const db = getAdminDb();

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(found.domainDocRef);
      if (!snap.exists) throw new Error('Domain document not found');

      const data = snap.data();
      const teamsArr = Array.isArray(data.teams) ? [...data.teams] : [];
      const idx = teamsArr.findIndex((t: any) => t.id === teamId);

      if (idx === -1) throw new Error('Team not found in array');

      teamsArr[idx] = {
        ...teamsArr[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      transaction.update(found.domainDocRef, {
        teams: teamsArr,
        updatedAt: new Date(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating team in domain doc:', error);
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

export async function deleteTeamFromDomainDoc(teamId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const found = await findTeamInDomainDocs(teamId);
    if (!found) {
      return { success: false, error: 'Team not found' };
    }

    const db = getAdminDb();

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(found.domainDocRef);
      if (!snap.exists) throw new Error('Domain document not found');

      const data = snap.data();
      const teamsArr = Array.isArray(data.teams) ? data.teams.filter((t: any) => t.id !== teamId) : [];

      transaction.update(found.domainDocRef, {
        teams: teamsArr,
        teamCount: teamsArr.length,
        updatedAt: new Date(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting team from domain doc:', error);
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluations Collection Helpers (2 Round Documents: prelims / finale)
// ─────────────────────────────────────────────────────────────────────────────

export async function getEvalRecords(round: 'prelims' | 'finale'): Promise<AdminScoreData[]> {
  const db = getAdminDb();
  const snap = await db.collection('evaluations').doc(round).get();

  if (!snap.exists) return [];

  const data = snap.data();
  const records = Array.isArray(data?.records) ? data.records : [];

  return records.map((r: any) => ({
    id: r.id || `${round}_${r.juryId}_${r.teamId}`,
    teamId: r.teamId || '',
    teamName: r.teamName || '',
    juryId: r.juryId || '',
    juryName: r.juryName || '',
    round: r.round || round,
    rubric: r.rubric || {
      conceptStrength: 0,
      buildIntelligence: 0,
      deliveryImpact: 0,
      liveDefenseScore: 0,
      communication: 0,
      innovation: 0,
      technicalFeasibility: 0,
      impact: 0,
      presentation: 0,
    },
    totalScore: typeof r.totalScore === 'number' ? r.totalScore : 0,
    remarks: r.remarks || '',
    feedback: r.feedback || '',
    highlighted: Boolean(r.highlighted),
    isFrozen: Boolean(r.isFrozen),
    createdAt: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toDate?.()?.toISOString() || '') : '',
  }));
}

export async function upsertEvalRecord(
  round: 'prelims' | 'finale',
  recordData: any
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    const db = getAdminDb();
    const docRef = db.collection('evaluations').doc(round);
    const evalId = recordData.id || `${round}_${recordData.juryId}_${recordData.teamId}`;
    const nowIso = new Date().toISOString();

    const newRecord = {
      ...recordData,
      id: evalId,
      round,
      updatedAt: nowIso,
      createdAt: recordData.createdAt || nowIso,
    };

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(docRef);
      let recordsArr: any[] = [];

      if (snap.exists) {
        recordsArr = Array.isArray(snap.data()?.records) ? [...snap.data().records] : [];
      }

      const existingIdx = recordsArr.findIndex((r: any) => r.id === evalId || (r.teamId === recordData.teamId && r.juryId === recordData.juryId));

      if (existingIdx !== -1) {
        if (recordsArr[existingIdx].isFrozen) {
          throw new Error('This evaluation is already submitted and frozen.');
        }
        recordsArr[existingIdx] = { ...recordsArr[existingIdx], ...newRecord };
      } else {
        recordsArr.push(newRecord);
      }

      transaction.set(
        docRef,
        {
          round,
          totalCount: recordsArr.length,
          updatedAt: new Date(),
          records: recordsArr,
        },
        { merge: true }
      );
    });

    return { success: true, recordId: evalId };
  } catch (error: any) {
    console.error('Error upserting eval record:', error);
    return { success: false, error: error.message || 'Failed to save evaluation' };
  }
}

export async function patchEvalRecord(
  round: 'prelims' | 'finale',
  evalId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const docRef = db.collection('evaluations').doc(round);

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) throw new Error(`Evaluation round document "${round}" not found.`);

      const recordsArr = Array.isArray(snap.data()?.records) ? [...snap.data().records] : [];
      const idx = recordsArr.findIndex((r: any) => r.id === evalId);

      if (idx === -1) throw new Error('Evaluation record not found.');

      recordsArr[idx] = {
        ...recordsArr[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      transaction.update(docRef, {
        records: recordsArr,
        updatedAt: new Date(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error patching eval record:', error);
    return { success: false, error: error.message || 'Failed to patch evaluation' };
  }
}

export async function removeEvalRecord(
  round: 'prelims' | 'finale',
  evalId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminDb();
    const docRef = db.collection('evaluations').doc(round);

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) return;

      const recordsArr = Array.isArray(snap.data()?.records) ? snap.data().records.filter((r: any) => r.id !== evalId) : [];

      transaction.update(docRef, {
        records: recordsArr,
        totalCount: recordsArr.length,
        updatedAt: new Date(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error removing eval record:', error);
    return { success: false, error: error.message || 'Failed to delete evaluation' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Labs, Final Labs, Roles, Timelines, Winners Helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getLabs(): Promise<LabData[]> {
  const db = getAdminDb();
  const snap = await db.collection('labs').get();
  return snap.docs.map((doc: any) => ({
    labId: doc.id,
    labName: doc.data().labName || doc.id,
    labCode: doc.data().labCode || '',
    capacity: typeof doc.data().capacity === 'number' ? doc.data().capacity : 0,
    assignedJuryName: doc.data().assignedJuryName || 'Unassigned',
    assignedTheme: doc.data().assignedTheme || '',
    currentTeamCount: typeof doc.data().currentTeamCount === 'number' ? doc.data().currentTeamCount : 0,
  }));
}

export async function getFinalLabs(): Promise<FinalLabData[]> {
  const db = getAdminDb();
  const snap = await db.collection('finalLabs').get();
  return snap.docs.map((doc: any) => ({
    labId: doc.id,
    labName: doc.data().labName || doc.id,
    labCode: doc.data().labCode || '',
    capacity: typeof doc.data().capacity === 'number' ? doc.data().capacity : 25,
    coordinator: doc.data().coordinator || 'Unassigned',
    currentTeamCount: typeof doc.data().currentTeamCount === 'number' ? doc.data().currentTeamCount : 0,
  }));
}

export async function getRoles(): Promise<any[]> {
  const db = getAdminDb();
  const snap = await db.collection('roles').get();
  return snap.docs.map((doc: any) => ({ email: doc.id, ...doc.data() }));
}

export async function getEventTimelines(): Promise<any> {
  const db = getAdminDb();
  const snap = await db.collection('metadata').doc('eventTimelines').get();
  if (!snap.exists) return null;
  return snap.data();
}

export async function getWinners(): Promise<any[]> {
  const db = getAdminDb();
  const snap = await db.collection('metadata').doc('eventWinners').get();
  if (!snap.exists) return [];
  return snap.data()?.winners || [];
}
