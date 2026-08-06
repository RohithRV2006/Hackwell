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

export function invalidateTeamCache() {
  // No-op: Cache removed, Firestore is queried directly
}

export async function getAllTeamsFlatCached(_force = false): Promise<AdminTeamData[]> {
  return await getAllTeamsFlatFromDomainDocs();
}

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

export async function findTeamByLeadEmail(
  email: string,
  fallbackToFirst: boolean = false
): Promise<{
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

  let firstFound: { team: AdminTeamData; domainId: string; domainDocRef: any; index: number } | null = null;

  for (const snap of snaps) {
    if (snap.exists) {
      const data = snap.data();
      const teamsArr = Array.isArray(data?.teams) ? data.teams : [];
      if (teamsArr.length > 0 && !firstFound) {
        firstFound = {
          team: teamsArr[0],
          domainId: snap.id,
          domainDocRef: snap.ref,
          index: 0,
        };
      }
      const idx = teamsArr.findIndex((t: any) => {
        const lEmail = String(t.leadEmail || t.leadData?.email || '').toLowerCase().trim();
        if (lEmail === targetEmail) return true;
        if (Array.isArray(t.membersData)) {
          return t.membersData.some((m: any) => String(m.email || '').toLowerCase().trim() === targetEmail);
        }
        return false;
      });
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

  if (fallbackToFirst && firstFound) {
    return firstFound;
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

    invalidateTeamCache();
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
    let found = await findTeamInDomainDocs(teamId);
    if (!found && updates.leadEmail) {
      found = await findTeamByLeadEmail(updates.leadEmail);
    }

    const db = getAdminDb();

    if (found) {
      await db.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(found.domainDocRef);
        if (!snap.exists) throw new Error('Domain document not found');

        const data = snap.data();
        const teamsArr = Array.isArray(data?.teams) ? [...data.teams] : [];
        const idx = teamsArr.findIndex((t: any) => t.id === found.team.id || t.id === teamId);

        if (idx !== -1) {
          teamsArr[idx] = {
            ...teamsArr[idx],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        } else {
          teamsArr.push({
            id: teamId,
            ...updates,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        transaction.set(
          found.domainDocRef,
          {
            teams: teamsArr,
            teamCount: teamsArr.length,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      });
    } else {
      // If team is not found in schema/domain doc yet, create and add it within the teams array
      const domainId = resolveDomainId(updates.theme);
      const domainRef = db.collection('teams').doc(domainId);

      await db.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(domainRef);
        let teamsArr: any[] = [];
        let domainName = DOMAIN_SLUGS[domainId]?.name || 'Domain';

        if (snap.exists) {
          const data = snap.data();
          teamsArr = Array.isArray(data?.teams) ? [...data.teams] : [];
          domainName = data?.domainName || domainName;
        }

        const idx = teamsArr.findIndex((t: any) => t.id === teamId);
        if (idx !== -1) {
          teamsArr[idx] = {
            ...teamsArr[idx],
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        } else {
          teamsArr.push({
            id: teamId,
            teamName: updates.teamName || teamId,
            displayId: updates.displayId || teamId,
            domainId,
            ...updates,
            createdAt: updates.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }

        transaction.set(
          domainRef,
          {
            domainId,
            domainName,
            teamCount: teamsArr.length,
            teams: teamsArr,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      });
    }

    invalidateTeamCache();
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

    invalidateTeamCache();
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
  let rawRecords: any[] = [];

  const snap = await db.collection('evaluations').doc(round).get();
  if (snap.exists) {
    const data = snap.data();
    if (Array.isArray(data?.records)) {
      rawRecords = [...data.records];
    }
  }

  // Also query individual documents in evaluations collection (if any were created separately)
  try {
    const querySnap = await db.collection('evaluations').where('round', '==', round).get();
    querySnap.docs.forEach((doc) => {
      if (doc.id !== round) {
        const d = doc.data();
        const recId = doc.id;
        const existingIdx = rawRecords.findIndex((r) => r.id === recId || (r.teamId === d.teamId && r.juryId === d.juryId));
        const item = { id: recId, ...d };
        if (existingIdx >= 0) {
          rawRecords[existingIdx] = { ...rawRecords[existingIdx], ...item };
        } else {
          rawRecords.push(item);
        }
      }
    });
  } catch (e) {
    // Ignore error if query fails
  }

  return rawRecords.map((r: any) => ({
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
    selectedForFinal: Boolean(r.selectedForFinal),
    selectionReason: r.selectionReason || '',
    highlighted: Boolean(r.highlighted),
    isFrozen: Boolean(r.isFrozen),
    createdAt: r.createdAt ? (typeof r.createdAt === 'string' ? r.createdAt : r.createdAt.toDate?.()?.toISOString() || '') : '',
  }));
}

export async function upsertEvalRecord(
  round: 'prelims' | 'finale',
  recordData: any,
  isAdmin: boolean = false
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
        if (recordsArr[existingIdx].isFrozen && !isAdmin) {
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

export async function publishJurySelectedFinalists(selectedTeamIds: string[]): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const db = getAdminDb();
    const selectedSet = new Set(selectedTeamIds);

    const snaps = await Promise.all(
      ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
    );

    for (const snap of snaps) {
      if (snap.exists) {
        const data = snap.data();
        const teamsArr = Array.isArray(data?.teams) ? [...data.teams] : [];
        let modified = false;

        teamsArr.forEach((t: any) => {
          const isSelected = selectedSet.has(t.id);
          const newPrelimsStatus = isSelected ? 'selected' : 'not_selected';
          const newFinaleQualified = isSelected;

          if (
            t.prelimsStatus !== newPrelimsStatus ||
            t.finaleQualified !== newFinaleQualified ||
            t.draftFinalist !== undefined
          ) {
            t.prelimsStatus = newPrelimsStatus;
            t.finaleQualified = newFinaleQualified;
            t.finalStatus = isSelected ? (t.finalStatus || 'pending') : 'not_qualified';
            delete t.draftFinalist;
            t.updatedAt = new Date().toISOString();
            modified = true;
          }
        });

        if (modified) {
          await snap.ref.update({
            teams: teamsArr,
            updatedAt: new Date(),
          });
        }
      }
    }

    invalidateTeamCache();
    return { success: true, count: selectedSet.size };
  } catch (error: any) {
    console.error('Error publishing finalists:', error);
    return { success: false, error: error.message || 'Failed to publish finalists' };
  }
}

/**
 * Bulk-update multiple teams across the 5 domain documents in a single pass.
 * Reads all 5 domain docs once, groups updates by domain, then applies one
 * transaction per domain document that has teams to update.
 *
 * For fields that should be REMOVED from the team object, pass `null` as the
 * value (equivalent of Firestore's FieldValue.delete() for individual docs).
 */
export async function bulkUpdateTeamsInDomainDocs(
  updates: { teamId: string; fields: Record<string, any> }[]
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  if (updates.length === 0) return { success: true, updatedCount: 0 };

  const db = getAdminDb();

  // Read all 5 domain docs in one pass
  const snaps = await Promise.all(
    ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
  );

  // Build teamId → domain snap mapping
  const teamDomainMap = new Map<string, any>(); // teamId → snap
  snaps.forEach((snap) => {
    if (snap.exists) {
      const teamsArr = Array.isArray(snap.data()?.teams) ? snap.data()!.teams : [];
      teamsArr.forEach((t: any) => {
        if (t.id) teamDomainMap.set(t.id, snap);
      });
    }
  });

  // Group updates by domain doc ref id
  const byDomain = new Map<string, { snap: any; updateMap: Map<string, Record<string, any>> }>();
  updates.forEach(({ teamId, fields }) => {
    const snap = teamDomainMap.get(teamId);
    if (!snap) return;
    const domainId = snap.ref.id;
    if (!byDomain.has(domainId)) {
      byDomain.set(domainId, { snap, updateMap: new Map() });
    }
    byDomain.get(domainId)!.updateMap.set(teamId, fields);
  });

  let updatedCount = 0;

  // One transaction per domain doc
  for (const { snap: domainSnap, updateMap } of byDomain.values()) {
    await db.runTransaction(async (transaction: any) => {
      const freshSnap = await transaction.get(domainSnap.ref);
      if (!freshSnap.exists) return;

      const data = freshSnap.data()!;
      const teamsArr = Array.isArray(data.teams) ? [...data.teams] : [];

      teamsArr.forEach((t: any, idx: number) => {
        if (!updateMap.has(t.id)) return;
        const fields = updateMap.get(t.id)!;
        const updated = { ...teamsArr[idx] };
        for (const [key, value] of Object.entries(fields)) {
          if (value === null) {
            // null = delete this field from the team object
            delete updated[key];
          } else {
            updated[key] = value;
          }
        }
        updated.updatedAt = new Date().toISOString();
        teamsArr[idx] = updated;
        updatedCount++;
      });

      transaction.update(domainSnap.ref, {
        teams: teamsArr,
        updatedAt: new Date(),
      });
    });
  }

  invalidateTeamCache();
  return { success: true, updatedCount };
}
