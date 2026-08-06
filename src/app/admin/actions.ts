'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';
import { FieldValue } from 'firebase-admin/firestore';
import { unstable_cache, revalidateTag } from 'next/cache';
import { THEME_NAMES } from '@/lib/data/themes';
import {
  publishJurySelectedFinalists,
  upsertEvalRecord,
  updateTeamInDomainDoc,
  getAllTeamsFlatFromDomainDocs,
  getAllTeamsFlatCached,
  getEvalRecords,
  findTeamInDomainDocs,
  deleteTeamFromDomainDoc,
  createTeamInDomainDoc,
  bulkUpdateTeamsInDomainDocs,
} from '@/lib/firestore-helpers';

function resolveTeamTheme(teamData: any): string {
  if (teamData.theme && String(teamData.theme).trim().length > 0) {
    const raw = String(teamData.theme).trim();
    for (const name of THEME_NAMES) {
      if (name.toLowerCase() === raw.toLowerCase()) return name;
    }
    const lower = raw.toLowerCase();
    if (lower.includes('autonomous') || lower.includes('agentic')) return "Autonomous Agentic AI";
    if (lower.includes('adaptive') || lower.includes('intell')) return "Adaptive Intelligent Systems";
    if (lower.includes('predictive') || lower.includes('logistics')) return "Predictive Logistics using Industrial AI";
    if (lower.includes('business') || lower.includes('smart business')) return "AI for Smart Business Solution";
    if (lower.includes('human') || lower.includes('centered')) return "Human Centered AI";
    return raw;
  }
  if (teamData.problemStatement) {
    const lower = String(teamData.problemStatement).toLowerCase();
    if (lower.includes('autonomous') || lower.includes('agentic') || lower.includes('robot') || lower.includes('drone') || lower.includes('workflow')) return "Autonomous Agentic AI";
    if (lower.includes('adaptive') || lower.includes('intell') || lower.includes('personalized')) return "Adaptive Intelligent Systems";
    if (lower.includes('predictive') || lower.includes('logistics') || lower.includes('supply') || lower.includes('traffic')) return "Predictive Logistics using Industrial AI";
    if (lower.includes('business') || lower.includes('finance') || lower.includes('resume') || lower.includes('waste')) return "AI for Smart Business Solution";
    if (lower.includes('human') || lower.includes('health') || lower.includes('disaster') || lower.includes('education') || lower.includes('voting')) return "Human Centered AI";
  }
  return "Autonomous Agentic AI";
}

const getCachedTeamsData = unstable_cache(
  async () => {
    return await getAllTeamsFlatCached();
  },
  ['admin-all-teams'],
  { revalidate: 300 } // 5 minutes cache
);

export const verifyAdminSession = cache(async function verifyAdminSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return false;

  try {
    const decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    if (!decodedToken.email) return false;
    
    if (decodedToken.role === 'admin') return true;
    
    const role = await getUserRole(decodedToken.email);
    return role === 'admin';
  } catch (error) {
    return false;
  }
});

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const collectionCache = new Map<string, CacheEntry<any>>();
const COLLECTION_CACHE_TTL = 30 * 1000; // 30 seconds TTL

export async function invalidateCollectionCache(collectionName?: string) {
  if (collectionName) {
    collectionCache.delete(collectionName);
  } else {
    collectionCache.clear();
  }
}

export async function getCachedDocs(collectionName: string) {
  const now = Date.now();
  const cached = collectionCache.get(collectionName);
  if (cached && now - cached.timestamp < COLLECTION_CACHE_TTL) {
    return cached.data;
  }

  try {
    const db = getAdminDb();
    let snap: any;
    if (collectionName === 'metadata_eventTimelines') {
      snap = await db.collection('metadata').doc('eventTimelines').get();
    } else if (collectionName === 'gameScores') {
      snap = await db.collection(collectionName).orderBy('createdAt', 'desc').get();
    } else {
      snap = await db.collection(collectionName).get();
    }
    collectionCache.set(collectionName, { data: snap, timestamp: now });
    return snap;
  } catch (error: any) {
    console.error(`Error fetching ${collectionName}:`, error?.message || error);
    if (cached) {
      console.warn(`Returning stale cached data for ${collectionName}`);
      return cached.data;
    }
    // Return safe fallback snapshot on Firestore quota error to avoid UI crash
    return { docs: [], empty: true, size: 0, exists: false, data: () => ({}) };
  }
}

export interface Member {
  name: string;
  batchNumber: string;
  department: string;
  year: string;
  section: string;
}

export interface Lead extends Member {
  contactNumber: string;
  email?: string;
}

export interface AdminTeamData {
  id: string;
  displayId?: string;
  teamName: string;
  problemStatement: string;
  theme?: string;
  leadEmail: string;
  leadData: Lead;
  membersData: Member[];
  score?: number;
  judge?: string;
  labNo?: string;
  assignedLabId?: string;
  assignedLabName?: string;
  feedback?: string;
  pptLink?: string;
  pptQualified?: boolean;
  pptStatus?: string;
  eliminated?: boolean;
  eliminationReason?: string;
  prelimsStatus?: string;
  finaleQualified?: boolean;
  finalStatus?: string;
  finalVenue?: string;
  venue?: string;
  isWinner?: boolean;
  winnerRank?: number | null;
  winnerTitle?: string | null;
  createdAt?: string;
}

export async function getAdminOverviewStats() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }
  
  try {
    const db = getAdminDb();
    const [allTeamsForCount, rolesSnap, jurySnap, prelimsRecords, finaleRecords] = await Promise.all([
      getAllTeamsFlatCached(),
      db.collection('roles').count().get(),
      db.collection('roles').where('role', '==', 'jury').count().get(),
      getEvalRecords('prelims'),
      getEvalRecords('finale'),
    ]);
    
    return {
      success: true,
      stats: {
        totalTeams: allTeamsForCount.length,
        totalRoles: rolesSnap?.data().count || 0,
        totalJuries: jurySnap?.data().count || 0,
        totalPrelims: prelimsRecords.length,
        totalFinale: finaleRecords.length,
      }
    };
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return { success: false, error: error.message || 'Failed to fetch overview stats' };
  }
}

export async function getAllTeamsAdmin(): Promise<{ success: boolean; teams: AdminTeamData[]; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', teams: [] };
  }

  try {
    // getAllTeamsFlatFromDomainDocs already returns AdminTeamData[]
    const teams = await getCachedTeamsData();
    return { success: true, teams };
  } catch (error: any) {
    console.error('Error fetching teams for admin:', error);
    return { success: false, error: error.message || 'Failed to fetch teams', teams: [] };
  }
}

export async function syncLabTeamCountsAdmin(dbInstance?: any) {
  try {
    const db = dbInstance || getAdminDb();
    const [labsSnap, allTeams] = await Promise.all([
      db.collection('labs').get(),
      getAllTeamsFlatCached(),
    ]);

    if (labsSnap.empty) return;

    const countsMap = new Map<string, number>();
    labsSnap.docs.forEach((doc: any) => {
      countsMap.set(doc.id, 0);
    });

    allTeams.forEach((team) => {
      const labId = team.assignedLabId;
      const labName = team.assignedLabName || team.labNo;

      let matchedLabId = '';
      if (labId && countsMap.has(labId)) {
        matchedLabId = labId;
      } else if (labName && labName !== 'Unassigned') {
        const found = labsSnap.docs.find(
          (d: any) =>
            d.data().labName?.toLowerCase() === labName.toLowerCase() ||
            d.data().labCode?.toLowerCase() === labName.toLowerCase()
        );
        if (found) matchedLabId = found.id;
      }

      if (matchedLabId && countsMap.has(matchedLabId)) {
        countsMap.set(matchedLabId, (countsMap.get(matchedLabId) || 0) + 1);
      }
    });

    const batch = db.batch();
    labsSnap.docs.forEach((doc: any) => {
      const realTimeCount = countsMap.get(doc.id) || 0;
      batch.update(doc.ref, {
        currentTeamCount: realTimeCount,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing lab team counts:', error);
  }
}

export async function updateTeamAdmin(
  teamId: string,
  updatedFields: {
    teamName?: string;
    problemStatement?: string;
    leadEmail?: string;
    score?: number;
    judge?: string;
    labNo?: string;
    feedback?: string;
    leadData?: any;
    membersData?: any[];
  }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const found = await findTeamInDomainDocs(teamId);
    if (!found) {
      return { success: false, error: 'Team not found' };
    }

    const currentData = found.team as any;
    const payload: Record<string, any> = {};

    if (updatedFields.teamName !== undefined) {
      payload.teamName = updatedFields.teamName.trim();
      payload.teamNameLower = updatedFields.teamName.trim().toLowerCase();
    }
    if (updatedFields.problemStatement !== undefined) payload.problemStatement = updatedFields.problemStatement;
    if (updatedFields.leadEmail !== undefined) payload.leadEmail = updatedFields.leadEmail.trim().toLowerCase();
    if (updatedFields.score !== undefined) payload.score = Number(updatedFields.score);
    if (updatedFields.judge !== undefined) payload.judge = updatedFields.judge.trim();
    if (updatedFields.labNo !== undefined) payload.labNo = updatedFields.labNo.trim();
    if (updatedFields.feedback !== undefined) payload.feedback = updatedFields.feedback.trim();

    if (updatedFields.leadData) {
      payload.leadData = updatedFields.leadData;
    }

    if (updatedFields.membersData) {
      payload.membersData = updatedFields.membersData;
    }

    // Synchronize Jury and Lab references with labs collection
    if (updatedFields.judge !== undefined || updatedFields.labNo !== undefined) {
      const newJudge = updatedFields.judge !== undefined ? updatedFields.judge.trim() : currentData.judge || '';
      const newLabNo = updatedFields.labNo !== undefined ? updatedFields.labNo.trim() : currentData.labNo || '';

      const labsSnap = await db.collection('labs').get();
      let matchedLab: any = null;

      if (newJudge && newJudge !== 'Unassigned') {
        matchedLab = labsSnap.docs.find(
          (d) => d.data().assignedJuryName?.toLowerCase() === newJudge.toLowerCase()
        );
      }

      if (!matchedLab && newLabNo && newLabNo !== 'Unassigned') {
        matchedLab = labsSnap.docs.find(
          (d) =>
            d.data().labName?.toLowerCase() === newLabNo.toLowerCase() ||
            d.data().labCode?.toLowerCase() === newLabNo.toLowerCase()
        );
      }

      const oldLabId = currentData.assignedLabId;

      if (matchedLab) {
        payload.assignedLabId = matchedLab.id;
        payload.assignedLabName = matchedLab.data().labName || matchedLab.id;
        payload.labNo = matchedLab.data().labName || matchedLab.id;
        payload.venue = matchedLab.data().labName || matchedLab.id;
        if (matchedLab.data().assignedJuryName && matchedLab.data().assignedJuryName !== 'Unassigned') {
          payload.judge = matchedLab.data().assignedJuryName;
        }
      } else if (newLabNo) {
        payload.venue = newLabNo;
      }

      // Update lab counts if lab assignment changed
      const newLabId = payload.assignedLabId;
      if (newLabId !== oldLabId) {
        const labBatch = db.batch();
        if (oldLabId) {
          labBatch.update(db.collection('labs').doc(oldLabId), {
            currentTeamCount: FieldValue.increment(-1),
            updatedAt: new Date()
          });
        }
        if (newLabId) {
          labBatch.update(db.collection('labs').doc(newLabId), {
            currentTeamCount: FieldValue.increment(1),
            updatedAt: new Date()
          });
        }
        await labBatch.commit();
      }
    }

    // Keep allBatchNumbers in sync if leadData or membersData updated
    const finalLead = updatedFields.leadData || currentData.leadData;
    const finalMembers = updatedFields.membersData || currentData.membersData || [];
    if (finalLead || finalMembers.length > 0) {
      const batchSet = new Set<string>();
      if (finalLead?.batchNumber) batchSet.add(finalLead.batchNumber.trim());
      finalMembers.forEach((m: Member) => {
        if (m?.batchNumber) batchSet.add(m.batchNumber.trim());
      });
      payload.allBatchNumbers = Array.from(batchSet);
    }

    const res = await updateTeamInDomainDoc(teamId, payload);
    if (!res.success) return { success: false, error: res.error };

    invalidateCollectionCache('teams');
    invalidateCollectionCache('labs');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating team:', error);
    return { success: false, error: error.message || 'Failed to update team' };
  }
}

export async function deleteTeamAdmin(teamId: string) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    // Get team info before deleting (to decrement lab count)
    const found = await findTeamInDomainDocs(teamId);
    const labId = (found?.team as any)?.assignedLabId;

    const res = await deleteTeamFromDomainDoc(teamId);
    if (!res.success) return { success: false, error: res.error };

    // Decrement lab count if team was assigned to a lab
    if (labId) {
      await db.collection('labs').doc(labId).update({
        currentTeamCount: FieldValue.increment(-1),
        updatedAt: new Date()
      });
    }

    invalidateCollectionCache('teams');
    invalidateCollectionCache('labs');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}




export interface Rubric {
  conceptStrength?: number;
  buildIntelligence?: number;
  deliveryImpact?: number;
  liveDefenseScore?: number;
  communication?: number;
}

export interface AdminScoreData {
  id: string;
  teamId: string;
  teamName?: string;
  problemStatement?: string;
  juryId: string;
  juryName?: string;
  rubric: Rubric;
  totalScore: number;
  remarks: string;
  feedback?: string;
  selectedForFinal?: boolean;
  selectionReason?: string;
  highlighted: boolean;
  isFrozen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllEvaluationsAdmin(round: 'prelims' | 'finale') {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', scores: [] };
  }

  try {
    const db = getAdminDb();
    
    // We fetch eval records, roles and teams for mapping names
    const [records, rolesSnap, allTeams] = await Promise.all([
      getEvalRecords(round),
      db.collection('roles').where('role', '==', 'jury').get(),
      getAllTeamsFlatCached(),
    ]);
    
    const teamMap = new Map<string, { teamName: string; problemStatement: string }>();
    allTeams.forEach((team) => {
      teamMap.set(team.id, {
        teamName: team.teamName || team.id,
        problemStatement: team.problemStatement || 'N/A',
      });
    });

    const juryMap = new Map<string, string>();
    rolesSnap.docs?.forEach((doc: any) => {
      const data = doc.data();
      const name = data.name || doc.id;
      juryMap.set(doc.id, name);
    });

    const scores: AdminScoreData[] = records.map((r) => {
      const teamInfo = teamMap.get(r.teamId || '');
      const juryName = r.juryName || juryMap.get(r.juryId) || 'Unknown Jury';

      return {
        id: r.id,
        teamId: r.teamId || '',
        teamName: teamInfo?.teamName || r.teamName || r.teamId || 'Unknown Team',
        problemStatement: teamInfo?.problemStatement || 'N/A',
        juryId: r.juryId || '',
        juryName,
        rubric: r.rubric || {},
        totalScore: r.totalScore || 0,
        remarks: r.remarks || r.feedback || '',
        highlighted: r.highlighted || false,
        isFrozen: r.isFrozen || false,
        createdAt: r.createdAt || '',
        updatedAt: r.createdAt || '',
      };
    });

    scores.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return { success: true, scores };
  } catch (error: any) {
    console.error('Error fetching scores for admin:', error);
    return { success: false, error: error.message || 'Failed to fetch scores', scores: [] };
  }
}

export async function getAllGameScoresAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', scores: [] };
  }

  try {
    const [snapshot, allTeams] = await Promise.all([
      getCachedDocs('gameScores'),
      getAllTeamsFlatCached(),
    ]);
    
    const teamMap = new Map<string, { teamName: string }>();
    allTeams.forEach((team) => {
      teamMap.set(team.id, { teamName: team.teamName || team.id });
    });

    const scores = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        teamId: data.teamId || '',
        teamName: teamMap.get(data.teamId)?.teamName || data.teamId || 'Unknown Team',
        gameName: data.gameName || 'Unknown Game',
        xpAwarded: data.xpAwarded || 0,
        createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '',
      };
    });

    return { success: true, scores };
  } catch (error: any) {
    console.error('Error fetching game scores:', error);
    return { success: false, error: error.message || 'Failed to fetch game scores', scores: [] };
  }
}

export async function createScoreAdmin(scoreData: {
  teamId: string;
  juryId: string;
  rubric: Rubric;
  remarks?: string;
  highlighted?: boolean;
}) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const scoresRef = db.collection('evaluations');

    // Ensure team exists in domain docs
    const teamFound = await findTeamInDomainDocs(scoreData.teamId);
    if (!teamFound) {
      return { success: false, error: `Team ID "${scoreData.teamId}" does not exist.` };
    }

    // Check if score record already exists for this team (enforce single score record rule)
    const existingSnap = await scoresRef.where('teamId', '==', scoreData.teamId).where('juryId', '==', scoreData.juryId).limit(1).get();
    if (!existingSnap.empty) {
      return { success: false, error: 'A score record already exists for this team by this jury.' };
    }

    const { conceptStrength, buildIntelligence, deliveryImpact, liveDefenseScore, communication } = scoreData.rubric;
    const totalScore = Number(conceptStrength) + Number(buildIntelligence) + Number(deliveryImpact) + Number(liveDefenseScore) + Number(communication);
    const now = new Date();

    const newDocId = `prelims_${scoreData.juryId}_${scoreData.teamId}`;
    const newDoc = scoresRef.doc(newDocId);
    await newDoc.set({
      round: 'prelims',
      teamId: scoreData.teamId,
      juryId: scoreData.juryId,
      rubric: {
        conceptStrength: Number(conceptStrength),
        buildIntelligence: Number(buildIntelligence),
        deliveryImpact: Number(deliveryImpact),
        liveDefenseScore: Number(liveDefenseScore),
        communication: Number(communication),
      },
      totalScore,
      remarks: scoreData.remarks?.trim() || '',
      highlighted: !!scoreData.highlighted,
      isFrozen: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id: newDoc.id };
  } catch (error: any) {
    console.error('Error creating score:', error);
    return { success: false, error: error.message || 'Failed to create score' };
  }
}

export async function updateScoreAdmin(
  scoreId: string,
  updatedFields: {
    juryId?: string;
    rubric?: Rubric;
    remarks?: string;
    highlighted?: boolean;
  }
) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection('evaluations').doc(scoreId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Score record not found' };
    }

    const payload: Record<string, any> = {};
    if (updatedFields.juryId !== undefined) {
      payload.juryId = updatedFields.juryId;
    }
    if (updatedFields.remarks !== undefined) {
      payload.remarks = updatedFields.remarks.trim();
    }
    if (updatedFields.highlighted !== undefined) {
      payload.highlighted = !!updatedFields.highlighted;
    }

    if (updatedFields.rubric !== undefined) {
      const { conceptStrength, buildIntelligence, deliveryImpact, liveDefenseScore, communication } = updatedFields.rubric;
      const parsedRubric = {
        conceptStrength: Number(conceptStrength),
        buildIntelligence: Number(buildIntelligence),
        deliveryImpact: Number(deliveryImpact),
        liveDefenseScore: Number(liveDefenseScore),
        communication: Number(communication),
      };
      payload.rubric = parsedRubric;
      payload.totalScore = parsedRubric.conceptStrength + parsedRubric.buildIntelligence + parsedRubric.deliveryImpact + parsedRubric.liveDefenseScore + parsedRubric.communication;
    }

    payload.updatedAt = new Date();

    await docRef.update(payload);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating score:', error);
    return { success: false, error: error.message || 'Failed to update score' };
  }
}

export async function deleteScoreAdmin(scoreId: string) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    await db.collection('evaluations').doc(scoreId).delete();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting score:', error);
    return { success: false, error: error.message || 'Failed to delete score' };
  }
}

export async function publishPrelimsResults() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    
    // 1. Fetch all prelims evaluations
    const evalsSnap = await db.collection('evaluations').where('round', '==', 'prelims').get();
    
    // Group evaluations by teamId
    const teamScores: Record<string, number[]> = {};
    evalsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!teamScores[data.teamId]) teamScores[data.teamId] = [];
      teamScores[data.teamId].push(data.totalScore || 0);
    });

    // Build bulk update array
    const updates = Object.entries(teamScores)
      .filter(([, scores]) => scores.length > 0)
      .map(([teamId, scores]) => ({
        teamId,
        fields: {
          prelimsAverageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
          prelimsStatus: 'selected',
        },
      }));

    if (updates.length > 0) {
      await bulkUpdateTeamsInDomainDocs(updates);
    }

    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error publishing prelims results:', error);
    return { success: false, error: error.message || 'Failed to publish results' };
  }
}

export type PhaseState = 'not-set' | 'active' | 'paused' | 'ended';

export interface EventTimelinesData {
  timeline1: { name: string; startDate: string; endDate: string; enabled: boolean; state?: PhaseState };
  timeline2: { name: string; startDate: string; endDate: string; enabled: boolean; state?: PhaseState; pptFilterApplied?: boolean };
  timeline3: { name: string; startDate: string; endDate: string; enabled: boolean; topTeamsToFinal?: number; state?: PhaseState; finalistsPromoted?: boolean };
  timeline4: { name: string; startDate: string; endDate: string; enabled: boolean; winnerCount?: number; state?: PhaseState };
}

export async function getEventTimelinesAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const docSnap = await getCachedDocs('metadata_eventTimelines');

    const defaultData: EventTimelinesData = {
      timeline1: { name: 'Registration Phase', startDate: '', endDate: '', enabled: true, state: 'not-set' },
      timeline2: { name: 'PPT Submission Phase', startDate: '', endDate: '', enabled: true, state: 'not-set', pptFilterApplied: false },
      timeline3: { name: 'Prelims Round', startDate: '', endDate: '', enabled: true, topTeamsToFinal: 10, state: 'not-set', finalistsPromoted: false },
      timeline4: { name: 'Final Round', startDate: '', endDate: '', enabled: true, winnerCount: 3, state: 'not-set' },
    };

    if (!docSnap.exists) {
      return { success: true, timelines: defaultData };
    }

    const data = docSnap.data() || {};
    return {
      success: true,
      timelines: {
        timeline1: { ...defaultData.timeline1, ...(data.timeline1 || {}) },
        timeline2: { ...defaultData.timeline2, ...(data.timeline2 || {}) },
        timeline3: { ...defaultData.timeline3, ...(data.timeline3 || {}) },
        timeline4: { ...defaultData.timeline4, ...(data.timeline4 || {}) },
      },
    };
  } catch (error: any) {
    console.error('Error fetching event timelines:', error);
    return { success: false, error: error.message || 'Failed to fetch event timelines' };
  }
}

export async function updateEventTimelinesAdmin(timelines: EventTimelinesData) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const docRef = db.collection('metadata').doc('eventTimelines');
    await docRef.set(timelines, { merge: true });
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating event timelines:', error);
    return { success: false, error: error.message || 'Failed to update event timelines' };
  }
}

export async function getEventManagementDashboardDataAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const [resTime, resTeams, resPrelims, resFinale, resLabs, resFinalLabs, resJuries] = await Promise.all([
      getEventTimelinesAdmin(),
      getAllTeamsAdmin(),
      getAllEvaluationsAdmin('prelims'),
      getAllEvaluationsAdmin('finale'),
      getLabsAdmin(),
      getFinalLabsAdmin(),
      getJuriesAdmin(),
    ]);

    return {
      success: true,
      timelines: resTime.timelines,
      teams: resTeams.teams || [],
      prelimsScores: resPrelims.scores || [],
      finaleScores: resFinale.scores || [],
      labs: resLabs.labs || [],
      finalLabs: resFinalLabs.finalLabs || [],
      juries: resJuries.juries || [],
    };
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error);
    return { success: false, error: error.message || 'Failed to load dashboard' };
  }
}

export async function setTimelinePhaseAdmin(
  timeline: '1' | '2' | '3' | '4',
  startDate: string,
  endDate: string,
  extraFields?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const db = getAdminDb();
    const docRef = db.collection('metadata').doc('eventTimelines');
    await docRef.set(
      {
        [`timeline${timeline}`]: {
          startDate,
          endDate,
          state: 'active',
          enabled: true,
          ...(extraFields || {}),
        },
      },
      { merge: true }
    );
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true };
  } catch (error: any) {
    console.error('Error setting timeline phase:', error);
    return { success: false, error: error.message || 'Failed to set timeline phase' };
  }
}

export async function updateTimelinePhaseAdmin(
  timeline: '1' | '2' | '3' | '4',
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const db = getAdminDb();
    const docRef = db.collection('metadata').doc('eventTimelines');
    await docRef.set(
      { [`timeline${timeline}`]: updates },
      { merge: true }
    );
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating timeline phase:', error);
    return { success: false, error: error.message || 'Failed to update timeline phase' };
  }
}

export async function resetPrelimsFiltersAndAssignmentsAdmin(): Promise<{ success: boolean; resetCount?: number; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const db = getAdminDb();
    const [allTeams, labsSnap] = await Promise.all([
      getAllTeamsFlatCached(),
      db.collection('labs').get(),
    ]);

    // Build bulk update array — reset team filters and lab/jury assignments
    const updates = allTeams.map((team) => {
      const hasPpt = Boolean(team.pptLink && String(team.pptLink).trim().length > 0);
      return {
        teamId: team.id,
        fields: {
          labNo: 'Unassigned',
          judge: 'Unassigned',
          venue: 'TBA',
          assignedLabId: null,    // null = delete field in bulkUpdateTeamsInDomainDocs
          assignedLabName: null,  // null = delete field
          pptQualified: hasPpt,
          pptStatus: hasPpt ? 'submitted' : 'pending',
          eliminated: false,
          eliminationReason: null,
          prelimsStatus: 'pending',
          prelimsAverageScore: 0,
          finaleQualified: false,
        },
      };
    });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Reset current team counts in labs (keep lab config, jury, & theme intact)
    if (!labsSnap.empty) {
      const batch = db.batch();
      labsSnap.docs.forEach((doc) => {
        batch.update(doc.ref, { currentTeamCount: 0, updatedAt: new Date() });
      });
      await batch.commit();
    }

    // Reset timeline metadata filter flags
    await db.collection('metadata').doc('eventTimelines').set(
      {
        timeline2: { pptFilterApplied: false },
        timeline3: { finalistsPromoted: false },
      },
      { merge: true }
    );

    invalidateCollectionCache('teams');
    invalidateCollectionCache('labs');
    invalidateCollectionCache('metadata_eventTimelines');

    return { success: true, resetCount: allTeams.length };
  } catch (error: any) {
    console.error('Error resetting prelims filters:', error);
    return { success: false, error: error.message || 'Failed to reset prelims filters' };
  }
}

export async function resetTimelinePhaseAdmin(
  timeline: '1' | '2' | '3' | '4'
): Promise<{ success: boolean; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const db = getAdminDb();
    const docRef = db.collection('metadata').doc('eventTimelines');
    const resetData: Record<string, any> = {
      startDate: '',
      endDate: '',
      state: 'not-set',
      enabled: false,
    };
    if (timeline === '2' || timeline === '3') {
      resetData.pptFilterApplied = false;
      resetData.finalistsPromoted = false;
      await resetPrelimsFiltersAndAssignmentsAdmin();
    }

    await docRef.set(
      { [`timeline${timeline}`]: resetData },
      { merge: true }
    );
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true };
  } catch (error: any) {
    console.error('Error resetting timeline phase:', error);
    return { success: false, error: error.message || 'Failed to reset timeline phase' };
  }
}

export async function applyPptFilterAdmin(): Promise<{ success: boolean; passed?: number; failed?: number; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized' };

  try {
    const db = getAdminDb();
    const allTeams = await getAllTeamsFlatCached();

    let passed = 0;
    let failed = 0;

    const updates = allTeams.map((team) => {
      const hasPpt = Boolean(team.pptLink && String(team.pptLink).trim().length > 0);
      if (hasPpt) passed++; else failed++;
      return {
        teamId: team.id,
        fields: {
          pptQualified: hasPpt,
          pptStatus: hasPpt ? 'submitted' : 'failed',
        },
      };
    });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Mark filter applied in metadata
    await db.collection('metadata').doc('eventTimelines').set(
      { timeline2: { pptFilterApplied: true } },
      { merge: true }
    );

    invalidateCollectionCache('teams');
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true, passed, failed };
  } catch (error: any) {
    console.error('Error applying PPT filter:', error);
    return { success: false, error: error.message || 'Failed to apply PPT filter' };
  }
}

export interface JuryStat {
  juryId: string;
  juryName: string;
  institution?: string;
  assignedLab?: string;
  prelimsEvaluatedCount: number;
  finaleEvaluatedCount: number;
}

export interface TimelineLiveStats {
  totalTeams: number;
  totalStudents: number;
  pptSubmittedCount: number;
  prelimsEvaluatedCount: number;
  finaleEvaluatedCount: number;
  finalistCount: number;
  juryStats: JuryStat[];
}

export async function getTimelineStatsAdmin(): Promise<{ success: boolean; stats?: TimelineLiveStats; error?: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const [allTeams, prelimsRecords, finaleRecords, rolesSnap, labsSnap] = await Promise.all([
      getAllTeamsFlatCached(),
      getEvalRecords('prelims'),
      getEvalRecords('finale'),
      db.collection('roles').where('role', '==', 'jury').get(),
      db.collection('labs').get(),
    ]);

    const totalTeams = allTeams.length;
    let totalStudents = 0;
    let pptSubmittedCount = 0;
    let finalistCount = 0;

    allTeams.forEach((team) => {
      // Count students (lead + members)
      let count = 0;
      if (team.leadData || team.leadEmail) count += 1;
      if (Array.isArray(team.membersData)) count += team.membersData.length;
      if (count === 0) count = 1; // Fallback
      totalStudents += count;

      if (team.pptLink && String(team.pptLink).trim().length > 0) {
        pptSubmittedCount += 1;
      }
      if (team.finaleQualified === true) {
        finalistCount += 1;
      }
    });

    // Map labs to jury
    const labJuryMap = new Map<string, string>();
    labsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.assignedJuryName) {
        labJuryMap.set(data.assignedJuryName, data.labName || '');
      }
    });

    // Count evals per jury name / ID
    const prelimsCountByJury: Record<string, number> = {};
    prelimsRecords.forEach((data: any) => {
      const juryKey = data.juryName || data.judgeName || data.judgeId || data.juryId || data.judge || 'Unassigned';
      prelimsCountByJury[juryKey] = (prelimsCountByJury[juryKey] || 0) + 1;
    });

    const finaleCountByJury: Record<string, number> = {};
    finaleRecords.forEach((data: any) => {
      const juryKey = data.juryName || data.judgeName || data.judgeId || data.juryId || data.judge || 'Unassigned';
      finaleCountByJury[juryKey] = (finaleCountByJury[juryKey] || 0) + 1;
    });

    const combinedJuriesMap = new Map<string, { id: string; name: string; institution: string }>();

    rolesSnap.docs?.forEach((doc: any) => {
      const data = doc.data();
      if (data.role === 'jury' && !combinedJuriesMap.has(doc.id)) {
        const name = data.name || data.juryName || doc.id;
        combinedJuriesMap.set(doc.id, {
          id: doc.id,
          name,
          institution: data.institution || '',
        });
      }
    });

    const juryStats: JuryStat[] = [];
    combinedJuriesMap.forEach((jury, key) => {
      const juryName = jury.name;
      juryStats.push({
        juryId: jury.id,
        juryName: juryName,
        institution: jury.institution,
        assignedLab: labJuryMap.get(juryName) || 'Unassigned',
        prelimsEvaluatedCount: prelimsCountByJury[juryName] || prelimsCountByJury[jury.id] || 0,
        finaleEvaluatedCount: finaleCountByJury[juryName] || finaleCountByJury[jury.id] || 0,
      });
    });

    return {
      success: true,
      stats: {
        totalTeams,
        totalStudents,
        pptSubmittedCount,
        prelimsEvaluatedCount: prelimsRecords.length,
        finaleEvaluatedCount: finaleRecords.length,
        finalistCount,
        juryStats,
      },
    };
  } catch (error: any) {
    console.error('Error fetching timeline live stats:', error);
    return { success: false, error: error.message || 'Failed to fetch live stats' };
  }
}

export async function setFinalWinnersAdmin(winners: { teamId: string; rank: number; title: string }[]) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const allTeams = await getAllTeamsFlatCached();

    const winnerMap = new Map<string, { rank: number; title: string }>();
    winners.forEach((w) => winnerMap.set(w.teamId, { rank: w.rank, title: w.title }));

    const updates = allTeams.map((team) => {
      const wInfo = winnerMap.get(team.id);
      return {
        teamId: team.id,
        fields: wInfo
          ? { isWinner: true, winnerRank: wInfo.rank, winnerTitle: wInfo.title }
          : { isWinner: false, winnerRank: null, winnerTitle: null },
      };
    });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Also update metadata
    await db.collection('metadata').doc('eventWinners').set(
      {
        winners,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error setting final winners:', error);
    return { success: false, error: error.message || 'Failed to set winners' };
  }
}

export async function toggleTeamFinaleQualifiedAdmin(teamId: string, qualified: boolean) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const updates: Record<string, any> = {
      finaleQualified: qualified,
      prelimsStatus: qualified ? 'selected' : 'rejected',
      finalStatus: qualified ? 'pending' : 'rejected',
    };

    if (qualified) {
      const labsSnap = await db.collection('labs').get();
      if (!labsSnap.empty) {
        updates.finalVenue = labsSnap.docs[0].data().labName || 'Main Auditorium';
      } else {
        updates.finalVenue = 'Main Auditorium';
      }
    } else {
      updates.finalVenue = 'N/A';
    }

    const res = await updateTeamInDomainDoc(teamId, updates);
    if (!res.success) return { success: false, error: res.error };
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling team qualification:', error);
    return { success: false, error: error.message || 'Failed to toggle qualification' };
  }
}

export async function autoAllocateTeamsAdmin(labs: string[], juries: string[]) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    if (labs.length === 0 || juries.length === 0) {
      return { success: false, error: 'Please provide at least one Lab and one Jury.' };
    }

    const allTeams = await getAllTeamsFlatCached();

    if (allTeams.length === 0) {
      return { success: false, error: 'No teams registered yet.' };
    }

    const qualifiedTeams = allTeams.filter((t) => t.pptLink && String(t.pptLink).trim().length > 0);
    const unsubmittedTeams = allTeams.filter((t) => !t.pptLink || String(t.pptLink).trim().length === 0);

    if (qualifiedTeams.length === 0) {
      return { success: false, error: 'No teams have submitted a PPT presentation yet. Cannot assign labs or juries.' };
    }

    const updates: { teamId: string; fields: Record<string, any> }[] = [];

    // Assign ONLY qualified teams to labs & juries
    qualifiedTeams.forEach((team, idx) => {
      const assignedLab = labs[idx % labs.length];
      const assignedJury = juries[idx % juries.length];
      updates.push({
        teamId: team.id,
        fields: {
          labNo: assignedLab,
          assignedLabName: assignedLab,
          venue: assignedLab,
          judge: assignedJury,
          pptQualified: true,
          eliminated: false,
          eliminationReason: null,
        },
      });
    });

    // Mark unsubmitted teams as unassigned & eliminated
    unsubmittedTeams.forEach((team) => {
      updates.push({
        teamId: team.id,
        fields: {
          labNo: 'Unassigned (Eliminated)',
          venue: 'Unassigned (Eliminated)',
          judge: 'Unassigned',
          pptQualified: false,
          eliminated: true,
          eliminationReason: 'Eliminated: Did not submit PPT presentation during Phase 2',
        },
      });
    });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Mark filter applied in metadata
    const db = getAdminDb();
    await db.collection('metadata').doc('eventTimelines').set(
      { timeline2: { pptFilterApplied: true } },
      { merge: true }
    );

    invalidateCollectionCache('teams');
    invalidateCollectionCache('metadata_eventTimelines');
    return { success: true, count: qualifiedTeams.length, eliminatedCount: unsubmittedTeams.length };
  } catch (error: any) {
    console.error('Error auto allocating teams:', error);
    return { success: false, error: error.message || 'Failed to allocate teams' };
  }
}

export async function promoteTopTeamsToFinaleAdmin(topCount: number) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const db = getAdminDb();
    const [evalRecords, allTeams, labsSnap] = await Promise.all([
      getEvalRecords('prelims'),
      getAllTeamsFlatCached(),
      db.collection('labs').get(),
    ]);

    const labs = labsSnap.docs.map((doc) => ({
      labId: doc.id,
      labName: doc.data().labName || doc.id,
    }));

    const teamScores: Record<string, number> = {};
    evalRecords.forEach((rec: any) => {
      if (rec.teamId) {
        teamScores[rec.teamId] = Math.max(teamScores[rec.teamId] || 0, rec.totalScore || 0);
      }
    });

    const teamsWithScore = allTeams.map((team) => ({ id: team.id, score: teamScores[team.id] || 0 }));
    teamsWithScore.sort((a, b) => b.score - a.score);

    const qualifiedList = teamsWithScore.slice(0, topCount).map((t) => t.id);
    const qualifiedIds = new Set(qualifiedList);

    const updates = allTeams.map((team) => {
      const isQualified = qualifiedIds.has(team.id);
      if (isQualified) {
        const qIndex = qualifiedList.indexOf(team.id);
        const assignedVenue = labs.length > 0 ? labs[qIndex % labs.length].labName : 'Main Auditorium';
        return {
          teamId: team.id,
          fields: { finaleQualified: true, prelimsStatus: 'selected', finalStatus: 'pending', finalVenue: assignedVenue },
        };
      } else {
        return {
          teamId: team.id,
          fields: { finaleQualified: false, prelimsStatus: 'rejected', finalStatus: 'rejected', finalVenue: 'N/A' },
        };
      }
    });

    await bulkUpdateTeamsInDomainDocs(updates);
    invalidateCollectionCache('teams');
    return { success: true, promotedCount: qualifiedIds.size };
  } catch (error: any) {
    console.error('Error promoting teams to finale:', error);
    return { success: false, error: error.message || 'Failed to promote teams' };
  }
}

export interface LabData {
  labId: string;
  labName: string;
  labCode?: string;
  capacity: number;
  assignedJuryId?: string;
  assignedJuryName: string;
  assignedTheme?: string;
  currentTeamCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getLabsAdmin(): Promise<{ success: boolean; labs?: LabData[]; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const snapshot = await getCachedDocs('labs');

    const labs: LabData[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        labId: doc.id,
        labName: data.labName || doc.id,
        labCode: data.labCode || '',
        capacity: typeof data.capacity === 'number' ? data.capacity : 25,
        assignedJuryId: data.assignedJuryId || '',
        assignedJuryName: data.assignedJuryName || 'Unassigned',
        assignedTheme: data.assignedTheme || '',
        currentTeamCount: typeof data.currentTeamCount === 'number' ? data.currentTeamCount : 0,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : '',
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : '',
      };
    });

    labs.sort((a, b) => a.labName.localeCompare(b.labName));
    return { success: true, labs };
  } catch (error: any) {
    console.error('Error fetching labs:', error);
    return { success: false, error: error.message || 'Failed to fetch labs' };
  }
}

export async function createLabAdmin(
  labName: string,
  labCode: string,
  capacity?: number,
  assignedJuryName?: string,
  assignedTheme?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!labName?.trim()) {
      return { success: false, error: 'Lab Name is required.' };
    }

    const db = getAdminDb();
    const now = new Date();

    const labRef = db.collection('labs').doc();
    await labRef.set({
      labId: labRef.id,
      labName: labName.trim(),
      labCode: labCode ? labCode.trim() : '',
      capacity: capacity || 0,
      assignedJuryId: '',
      assignedJuryName: assignedJuryName?.trim() || 'Unassigned',
      assignedTheme: assignedTheme?.trim() || '',
      currentTeamCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await syncLabTeamCountsAdmin(db);
    invalidateCollectionCache('labs');
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating lab:', error);
    return { success: false, error: error.message || 'Failed to create lab' };
  }
}

export async function updateLabAdmin(
  labId: string,
  labName: string,
  labCode: string,
  capacity?: number,
  assignedJuryName?: string,
  assignedTheme?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!labName?.trim()) {
      return { success: false, error: 'Lab Name is required.' };
    }

    const db = getAdminDb();
    const docRef = db.collection('labs').doc(labId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Lab not found' };
    }

    const oldLabName = docSnap.data()?.labName;
    const cleanJury = assignedJuryName?.trim() || 'Unassigned';

    const payload: Record<string, any> = {
      labName: labName.trim(),
      labCode: labCode ? labCode.trim() : '',
      updatedAt: new Date(),
    };

    if (capacity !== undefined) {
      payload.capacity = capacity;
    }

    if (assignedJuryName !== undefined) {
      payload.assignedJuryName = cleanJury;
    }

    if (assignedTheme !== undefined) {
      payload.assignedTheme = assignedTheme.trim();
    }

    await docRef.update(payload);

    // Sync teams assigned to this lab with updated Lab Name and Jury Name
    const allTeams = await getAllTeamsFlatCached();
    const matchedTeams = allTeams.filter(
      (t) =>
        t.assignedLabId === labId ||
        (oldLabName && t.assignedLabName === oldLabName) ||
        (oldLabName && t.labNo === oldLabName)
    );

    if (matchedTeams.length > 0) {
      await bulkUpdateTeamsInDomainDocs(
        matchedTeams.map((t) => ({
          teamId: t.id,
          fields: {
            assignedLabId: labId,
            assignedLabName: labName.trim(),
            labNo: labName.trim(),
            judge: cleanJury !== 'Unassigned' ? cleanJury : t.judge || 'Unassigned',
          },
        }))
      );
    }

    await syncLabTeamCountsAdmin(db);
    invalidateCollectionCache('labs');
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating lab:', error);
    return { success: false, error: error.message || 'Failed to update lab' };
  }
}

export async function deleteLabAdmin(labId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const docRef = db.collection('labs').doc(labId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Lab not found' };
    }

    const oldLabName = docSnap.data()?.labName;

    // Unassign teams linked to this lab
    const allTeamsForLab = await getAllTeamsFlatCached();
    const matchedTeamsForLab = allTeamsForLab.filter(
      (t) =>
        t.assignedLabId === labId ||
        (oldLabName && t.assignedLabName === oldLabName) ||
        (oldLabName && t.labNo === oldLabName)
    );

    if (matchedTeamsForLab.length > 0) {
      await bulkUpdateTeamsInDomainDocs(
        matchedTeamsForLab.map((t) => ({
          teamId: t.id,
          fields: {
            assignedLabId: null,    // null = delete field
            assignedLabName: null,  // null = delete field
            labNo: 'Unassigned',
            judge: 'Unassigned',
          },
        }))
      );
    }

    await docRef.delete();
    await syncLabTeamCountsAdmin(db);
    invalidateCollectionCache('labs');
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting lab:', error);
    return { success: false, error: error.message || 'Failed to delete lab' };
  }
}

export async function autoAssignTeamsToLabsAdmin(): Promise<{ success: boolean; assignedCount?: number; eliminatedCount?: number; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const [labsSnap, allTeams] = await Promise.all([
      db.collection('labs').get(),
      getAllTeamsFlatCached(),
    ]);

    if (labsSnap.empty) {
      return { success: false, error: 'No Labs configured. Please create at least one Lab below first.' };
    }

    const labs: (LabData & { ref: any })[] = labsSnap.docs.map((doc) => ({
      labId: doc.id,
      labName: doc.data().labName || doc.id,
      labCode: doc.data().labCode || '',
      capacity: typeof doc.data().capacity === 'number' ? doc.data().capacity : 0,
      assignedJuryName: doc.data().assignedJuryName || 'Unassigned',
      assignedTheme: doc.data().assignedTheme || '',
      currentTeamCount: typeof doc.data().currentTeamCount === 'number' ? doc.data().currentTeamCount : 0,
      ref: doc.ref,
    }));

    if (allTeams.length === 0) {
      return { success: false, error: 'No teams registered yet.' };
    }

    // FILTER ONLY PPT SUBMITTED TEAMS FOR PRELIMS ROUND
    const qualifiedTeams = allTeams.filter((t) => t.pptLink && String(t.pptLink).trim().length > 0);
    const unsubmittedTeams = allTeams.filter((t) => !t.pptLink || String(t.pptLink).trim().length === 0);

    if (qualifiedTeams.length === 0) {
      return { success: false, error: 'No teams have submitted a PPT presentation yet. Cannot assign labs or juries.' };
    }

    // Group labs by theme
    const labsByTheme = new Map<string, (LabData & { ref: any })[]>();
    const generalLabs: (LabData & { ref: any })[] = [];

    labs.forEach((lab) => {
      const theme = (lab.assignedTheme || '').trim();
      if (theme && theme !== 'All Themes' && theme !== 'Any Theme') {
        if (!labsByTheme.has(theme)) labsByTheme.set(theme, []);
        labsByTheme.get(theme)!.push(lab);
      } else {
        generalLabs.push(lab);
      }
    });

    // Track team counts assigned to each lab
    const teamCounts: Record<string, number> = {};
    labs.forEach((l) => { teamCounts[l.labId] = 0; });
    const themeIndexMap: Record<string, number> = {};

    const updates: { teamId: string; fields: Record<string, any> }[] = [];

    // 1. Assign PPT-submitted qualified teams based on Theme matching
    qualifiedTeams.forEach((team) => {
      const teamTheme = resolveTeamTheme(team);
      let targetLab: LabData & { ref: any };

      const matchingThemeLabs = labsByTheme.get(teamTheme);
      if (matchingThemeLabs && matchingThemeLabs.length > 0) {
        const idx = themeIndexMap[teamTheme] || 0;
        targetLab = matchingThemeLabs[idx % matchingThemeLabs.length];
        themeIndexMap[teamTheme] = idx + 1;
      } else if (generalLabs.length > 0) {
        const idx = themeIndexMap['general'] || 0;
        targetLab = generalLabs[idx % generalLabs.length];
        themeIndexMap['general'] = idx + 1;
      } else {
        const idx = themeIndexMap['all_fallback'] || 0;
        targetLab = labs[idx % labs.length];
        themeIndexMap['all_fallback'] = idx + 1;
      }

      teamCounts[targetLab.labId] = (teamCounts[targetLab.labId] || 0) + 1;

      updates.push({
        teamId: team.id,
        fields: {
          assignedLabId: targetLab.labId,
          assignedLabName: targetLab.labName,
          labNo: targetLab.labName,
          venue: targetLab.labName,
          judge: targetLab.assignedJuryName !== 'Unassigned' ? targetLab.assignedJuryName : (team.judge || 'Unassigned'),
          theme: teamTheme,
          pptQualified: true,
          eliminated: false,
          eliminationReason: null,
        },
      });
    });

    // 2. Mark unsubmitted teams as unassigned & eliminated from Prelims round
    unsubmittedTeams.forEach((team) => {
      updates.push({
        teamId: team.id,
        fields: {
          assignedLabId: null,    // null = delete field
          assignedLabName: null,  // null = delete field
          labNo: 'Unassigned (Eliminated)',
          venue: 'Unassigned (Eliminated)',
          judge: 'Unassigned',
          pptQualified: false,
          eliminated: true,
          eliminationReason: 'Eliminated: Did not submit PPT presentation during Phase 2',
        },
      });
    });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Update labs current team counts
    const labsBatch = db.batch();
    labs.forEach((lab) => {
      labsBatch.update(lab.ref, {
        currentTeamCount: teamCounts[lab.labId] || 0,
        updatedAt: new Date(),
      });
    });
    await labsBatch.commit();

    invalidateCollectionCache('labs');
    invalidateCollectionCache('teams');
    return { success: true, assignedCount: qualifiedTeams.length, eliminatedCount: unsubmittedTeams.length };
  } catch (error: any) {
    console.error('Error auto assigning teams:', error);
    return { success: false, error: error.message || 'Failed to auto assign teams' };
  }
}

export interface FinalLabData {
  labId: string;
  labName: string;
  labCode?: string;
  capacity: number;
  coordinator?: string;
  currentTeamCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function getFinalLabsAdmin(): Promise<{ success: boolean; finalLabs?: FinalLabData[]; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const snapshot = await db.collection('finalLabs').get();

    const finalLabs: FinalLabData[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        labId: doc.id,
        labName: data.labName || doc.id,
        labCode: data.labCode || '',
        capacity: typeof data.capacity === 'number' ? data.capacity : 25,
        coordinator: data.coordinator || 'Unassigned',
        currentTeamCount: typeof data.currentTeamCount === 'number' ? data.currentTeamCount : 0,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : '',
        updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : '',
      };
    });

    finalLabs.sort((a, b) => a.labName.localeCompare(b.labName));
    return { success: true, finalLabs };
  } catch (error: any) {
    console.error('Error fetching final labs:', error);
    return { success: false, error: error.message || 'Failed to fetch final labs' };
  }
}

export async function createFinalLabAdmin(
  labName: string,
  labCode: string,
  capacity: number,
  coordinator?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!labName?.trim()) {
      return { success: false, error: 'Lab Name is required.' };
    }

    const db = getAdminDb();
    const now = new Date();
    const labRef = db.collection('finalLabs').doc();

    await labRef.set({
      labId: labRef.id,
      labName: labName.trim(),
      labCode: labCode ? labCode.trim() : '',
      capacity: capacity > 0 ? capacity : 25,
      coordinator: coordinator?.trim() || 'Unassigned',
      currentTeamCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await syncFinalLabTeamCountsAdmin(db);
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating final lab:', error);
    return { success: false, error: error.message || 'Failed to create final lab' };
  }
}

export async function updateFinalLabAdmin(
  labId: string,
  labName: string,
  labCode: string,
  capacity: number,
  coordinator?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!labName?.trim()) {
      return { success: false, error: 'Lab Name is required.' };
    }

    const db = getAdminDb();
    const docRef = db.collection('finalLabs').doc(labId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Final Lab not found' };
    }

    const oldLabName = docSnap.data()?.labName;

    await docRef.update({
      labName: labName.trim(),
      labCode: labCode ? labCode.trim() : '',
      capacity: capacity > 0 ? capacity : 25,
      coordinator: coordinator?.trim() || 'Unassigned',
      updatedAt: new Date(),
    });

    if (oldLabName) {
      const allTeamsFv = await getAllTeamsFlatCached();
      const matchedFv = allTeamsFv.filter((t) => t.finalVenue === oldLabName);
      if (matchedFv.length > 0) {
        await bulkUpdateTeamsInDomainDocs(
          matchedFv.map((t) => ({ teamId: t.id, fields: { finalVenue: labName.trim() } }))
        );
      }
    }

    await syncFinalLabTeamCountsAdmin(db);
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating final lab:', error);
    return { success: false, error: error.message || 'Failed to update final lab' };
  }
}

export async function deleteFinalLabAdmin(labId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const docRef = db.collection('finalLabs').doc(labId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) return { success: false, error: 'Final Lab not found' };

    const oldLabName = docSnap.data()?.labName;

    if (oldLabName) {
      const allTeamsDfl = await getAllTeamsFlatCached();
      const matchedDfl = allTeamsDfl.filter((t) => t.finalVenue === oldLabName);
      if (matchedDfl.length > 0) {
        await bulkUpdateTeamsInDomainDocs(
          matchedDfl.map((t) => ({ teamId: t.id, fields: { finalVenue: 'TBA' } }))
        );
      }
    }

    await docRef.delete();
    await syncFinalLabTeamCountsAdmin(db);
    invalidateCollectionCache('teams');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting final lab:', error);
    return { success: false, error: error.message || 'Failed to delete final lab' };
  }
}

export async function syncFinalLabTeamCountsAdmin(dbInstance?: any) {
  try {
    const db = dbInstance || getAdminDb();
    const [labsSnap, allTeams] = await Promise.all([
      db.collection('finalLabs').get(),
      getAllTeamsFlatCached(),
    ]);

    if (labsSnap.empty) return;

    const countsMap = new Map<string, number>();
    labsSnap.docs.forEach((doc: any) => {
      countsMap.set(doc.id, 0);
    });

    allTeams.forEach((team) => {
      const venue = team.finalVenue;
      if (venue && venue !== 'TBA' && venue !== 'N/A') {
        const found = labsSnap.docs.find(
          (d: any) =>
            d.data().labName?.toLowerCase() === venue.toLowerCase() ||
            d.data().labCode?.toLowerCase() === venue.toLowerCase()
        );
        if (found) {
          countsMap.set(found.id, (countsMap.get(found.id) || 0) + 1);
        }
      }
    });

    const batch = db.batch();
    labsSnap.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        currentTeamCount: countsMap.get(doc.id) || 0,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error syncing final lab team counts:', error);
  }
}

export async function autoAssignFinalTeamsToLabsAdmin(): Promise<{ success: boolean; assignedCount?: number; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const [labsSnap, allTeams] = await Promise.all([
      db.collection('finalLabs').get(),
      getAllTeamsFlatCached(),
    ]);

    if (allTeams.length === 0) {
      return { success: false, error: 'No teams registered.' };
    }

    const finalLabs = labsSnap.docs.map((doc) => ({
      labId: doc.id,
      labName: doc.data().labName || doc.id,
      labCode: doc.data().labCode || '',
      capacity: typeof doc.data().capacity === 'number' ? doc.data().capacity : 25,
      coordinator: doc.data().coordinator || 'Unassigned',
      ref: doc.ref,
    }));

    if (finalLabs.length === 0) {
      return { success: false, error: 'No Final Round Labs configured. Please create at least one Final Lab first.' };
    }

    const qualifiedTeams = allTeams.filter(
      (t) => t.finaleQualified === true || t.prelimsStatus === 'selected'
    );

    if (qualifiedTeams.length === 0) {
      return { success: false, error: 'No qualified teams for Final Round yet.' };
    }

    const labAssignments: Record<string, number> = {};
    finalLabs.forEach((l) => { labAssignments[l.labId] = 0; });

    let currentLabIdx = 0;
    const updates: { teamId: string; fields: Record<string, any> }[] = [];
    const qualifiedIds = new Set(qualifiedTeams.map((t) => t.id));

    qualifiedTeams.forEach((team) => {
      let chosenLab = finalLabs[currentLabIdx % finalLabs.length];

      for (let i = 0; i < finalLabs.length; i++) {
        const candidateIdx = (currentLabIdx + i) % finalLabs.length;
        const candidate = finalLabs[candidateIdx];
        const count = labAssignments[candidate.labId] || 0;
        if (count < candidate.capacity) {
          chosenLab = candidate;
          currentLabIdx = candidateIdx;
          break;
        }
      }

      labAssignments[chosenLab.labId] = (labAssignments[chosenLab.labId] || 0) + 1;
      currentLabIdx++;

      updates.push({
        teamId: team.id,
        fields: {
          finalVenue: chosenLab.labName,
          finalAssignedLabId: chosenLab.labId,
          finalAssignedLabName: chosenLab.labName,
          finalStatus: team.finalStatus || 'pending',
        },
      });
    });

    // Mark non-qualified teams
    allTeams
      .filter((t) => !qualifiedIds.has(t.id) && !t.finaleQualified && t.prelimsStatus !== 'selected')
      .forEach((team) => {
        updates.push({
          teamId: team.id,
          fields: { finalVenue: 'N/A', finalStatus: 'rejected' },
        });
      });

    await bulkUpdateTeamsInDomainDocs(updates);

    // Update final lab counts
    const labsBatch = db.batch();
    finalLabs.forEach((lab) => {
      labsBatch.update(lab.ref, {
        currentTeamCount: labAssignments[lab.labId] || 0,
        updatedAt: new Date(),
      });
    });
    await labsBatch.commit();

    invalidateCollectionCache('teams');
    return { success: true, assignedCount: qualifiedTeams.length };
  } catch (error: any) {
    console.error('Error auto assigning final teams to labs:', error);
    return { success: false, error: error.message || 'Failed to auto assign final venues' };
  }
}


export interface JuryOption {
  id: string;
  name: string;
  email: string;
  institution?: string;
}

export async function getJuriesAdmin(): Promise<{ success: boolean; juries?: JuryOption[]; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const rolesSnap = await getCachedDocs('roles');
    const juryMap = new Map<string, JuryOption>();

    rolesSnap.docs?.forEach((doc: any) => {
      const data = doc.data();
      if (data.role === 'jury') {
        juryMap.set(doc.id, {
          id: doc.id,
          name: data.name || data.juryName || doc.id,
          email: doc.id,
          institution: data.institution || '',
        });
      }
    });

    const juries = Array.from(juryMap.values());
    juries.sort((a, b) => a.name.localeCompare(b.name));
    return { success: true, juries };
  } catch (error: any) {
    console.error('Error fetching juries:', error);
    return { success: false, error: error.message || 'Failed to fetch juries' };
  }
}

export async function seedDummyTeamsAdmin(count: number = 100): Promise<{ success: boolean; seededCount?: number; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AIDS', 'AIML'];
    const problemStatements = [
      'AI-Powered Smart Health Monitoring System',
      'Blockchain-Based Secure Voting System',
      'Autonomous Traffic Signal Management Using Computer Vision',
      'IoT-Based Smart Agriculture and Soil Quality Analyzer',
      'Cybersecurity Threat Detection Using Machine Learning',
      'Automated Resume Parser and Job Matching Platform',
      'Smart Waste Management System for Cities',
      'AI Personal Finance and Expense Tracker',
      'E-Learning Analytics and Dropout Prediction',
      'Disaster Management & Emergency Response Network',
    ];
    const themes = [
      'Autonomous Agentic AI',
      'Adaptive Intelligent Systems',
      'Predictive Logistics using Industrial AI',
      'AI for Smart Business Solution',
      'Human Centered AI',
    ];

    const now = new Date().toISOString();
    let seededCount = 0;

    for (let i = 1; i <= count; i++) {
      const dept = depts[i % depts.length];
      const ps = problemStatements[i % problemStatements.length];
      const theme = themes[i % themes.length];

      const teamData = {
        id: `dummy_team_${String(i).padStart(3, '0')}`,
        teamName: `Dummy Team ${String(i).padStart(3, '0')}`,
        displayId: `TEAM-${1000 + i}`,
        theme,
        problemStatement: ps,
        leadEmail: `lead_team${i}@example.com`,
        leadData: {
          name: `Lead Student ${i}`,
          contactNumber: `98765${String(10000 + i).slice(0, 5)}`,
          department: dept,
          year: '3rd Year',
          section: 'A',
          registerNumber: `REG2026${String(100 + i)}`,
        },
        membersData: [
          { name: `Member 1 of Team ${i}`, department: dept, year: '3rd Year', section: 'A', registerNumber: `REG2026M1_${i}` },
          { name: `Member 2 of Team ${i}`, department: dept, year: '3rd Year', section: 'B', registerNumber: `REG2026M2_${i}` },
        ],
        labNo: 'Unassigned',
        judge: 'Unassigned',
        prelimsAverageScore: 0,
        prelimsStatus: 'pending',
        finaleQualified: false,
        createdAt: now,
        updatedAt: now,
      };

      const res = await createTeamInDomainDoc(teamData);
      if (res.success) seededCount++;
    }

    invalidateCollectionCache('teams');
    return { success: true, seededCount };
  } catch (error: any) {
    console.error('Error seeding dummy teams:', error);
    return { success: false, error: error.message || 'Failed to seed dummy teams' };
  }
}

export async function publishJurySelectedFinalistsAdmin(selectedTeamIds: string[]) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized - Admin session required' };
  return await publishJurySelectedFinalists(selectedTeamIds);
}

export async function upsertEvalRecordAdmin(round: 'prelims' | 'finale', recordData: any) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized - Admin session required' };
  return await upsertEvalRecord(round, recordData);
}

export async function updateTeamInDomainDocAdmin(teamId: string, updates: Record<string, any>) {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { success: false, error: 'Unauthorized - Admin session required' };
  return await updateTeamInDomainDoc(teamId, updates);
}


