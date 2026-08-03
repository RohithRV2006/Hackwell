'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { getUserRole } from '@/app/actions/session';
import { FieldValue } from 'firebase-admin/firestore';
import { unstable_cache, revalidateTag } from 'next/cache';

const getCachedTeamsData = unstable_cache(
  async () => {
    const db = getAdminDb();
    const snapshot = await db.collection('teams').get();
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        data: {
          ...data,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
        } as any
      };
    });
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
    } else if (collectionName === 'prelimsEvaluations' || collectionName === 'finaleEvaluations' || collectionName === 'gameScores') {
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
  leadEmail: string;
  leadData: Lead;
  membersData: Member[];
  score?: number;
  judge?: string;
  labNo?: string;
  feedback?: string;
  pptLink?: string;
  finaleQualified?: boolean;
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
    const [teamsSnap, rolesSnap, jurySnap, prelimsSnap, finaleSnap] = await Promise.all([
      getCachedDocs('teams'),
      getCachedDocs('roles'),
      getCachedDocs('jury'),
      getCachedDocs('prelimsEvaluations'),
      getCachedDocs('finaleEvaluations')
    ]);
    
    return {
      success: true,
      stats: {
        totalTeams: teamsSnap?.size || 0,
        totalRoles: rolesSnap?.size || 0,
        totalJuries: jurySnap?.size || 0,
        totalPrelims: prelimsSnap?.size || 0,
        totalFinale: finaleSnap?.size || 0
      }
    };
  } catch (error: any) {
    console.error('Error fetching admin stats:', error?.message || error);
    return { success: false, error: error.message || 'Failed to fetch stats' };
  }
}

export async function getAllTeamsAdmin() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', teams: [] };
  }

  try {
    const cachedDocs = await getCachedTeamsData();

    const teams: AdminTeamData[] = [];

    for (const doc of cachedDocs) {
      const data = doc.data;
      let decryptedLead: Lead = data.leadData || { name: '', batchNumber: '', department: '', year: '', section: '', contactNumber: '' };
      let decryptedMembers: Member[] = data.membersData || [];

      teams.push({
        id: doc.id,
        displayId: data.displayId || doc.id,
        teamName: data.teamName || doc.id,
        problemStatement: data.problemStatement || 'Not assigned',
        leadEmail: data.leadEmail || '',
        leadData: decryptedLead,
        membersData: decryptedMembers,
        score: typeof data.score === 'number' ? data.score : 0,
        judge: data.judge || 'Unassigned',
        labNo: data.labNo || 'Unassigned',
        feedback: data.feedback || '',
        pptLink: data.pptLink || '',
        finaleQualified: data.finaleQualified === true,
        isWinner: data.isWinner === true,
        winnerRank: data.winnerRank || null,
        winnerTitle: data.winnerTitle || null,
        createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '',
      });
    }

    return { success: true, teams };
  } catch (error: any) {
    console.error('Error fetching teams for admin:', error);
    return { success: false, error: error.message || 'Failed to fetch teams', teams: [] };
  }
}

export async function syncLabTeamCountsAdmin(dbInstance?: any) {
  try {
    const db = dbInstance || getAdminDb();
    const [labsSnap, teamsSnap] = await Promise.all([
      db.collection('labs').get(),
      db.collection('teams').get(),
    ]);

    if (labsSnap.empty) return;

    const countsMap = new Map<string, number>();
    labsSnap.docs.forEach((doc: any) => {
      countsMap.set(doc.id, 0);
    });

    teamsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const labId = data.assignedLabId;
      const labName = data.assignedLabName || data.labNo;

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
    const docRef = db.collection('teams').doc(teamId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return { success: false, error: 'Team not found' };
    }

    const currentData = docSnap.data() || {};
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

      if (matchedLab) {
        payload.assignedLabId = matchedLab.id;
        payload.assignedLabName = matchedLab.data().labName || matchedLab.id;
        payload.labNo = matchedLab.data().labName || matchedLab.id;
        if (matchedLab.data().assignedJuryName && matchedLab.data().assignedJuryName !== 'Unassigned') {
          payload.judge = matchedLab.data().assignedJuryName;
        }
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

    await docRef.update(payload);
    await syncLabTeamCountsAdmin(db);
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
    await db.collection('teams').doc(teamId).delete();
    await syncLabTeamCountsAdmin(db);
    invalidateCollectionCache('teams');
    invalidateCollectionCache('labs');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting team:', error);
    return { success: false, error: error.message || 'Failed to delete team' };
  }
}




export interface Rubric {
  problemStatement?: number;
  presentation?: number;
  communication?: number;
  solution?: number;
  idea?: number;
  innovation?: number;
  technicalFeasibility?: number;
  impact?: number;
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
  highlighted: boolean;
  isFrozen: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export async function getAllEvaluationsAdmin(collectionName: 'prelimsEvaluations' | 'finaleEvaluations') {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized', scores: [] };
  }

  try {
    const [snapshot, teamsSnap, jurySnap] = await Promise.all([
      getCachedDocs(collectionName),
      getCachedDocs('teams'),
      getCachedDocs('jury'),
    ]);
    
    const teamMap = new Map<string, { teamName: string; problemStatement: string }>();
    teamsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      teamMap.set(doc.id, {
        teamName: data.teamName || doc.id,
        problemStatement: data.problemStatement || 'N/A',
      });
    });

    const juryMap = new Map<string, string>();
    jurySnap.docs.forEach((doc: any) => {
      juryMap.set(doc.id, doc.data().juryName || doc.id);
    });

    const scores: AdminScoreData[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      const rubricObj: Rubric = data.rubric || {
        problemStatement: 0,
        presentation: 0,
        communication: 0,
        solution: 0,
        idea: 0,
      };
      
      const totalScoreVal = typeof data.totalScore === 'number' ? data.totalScore : 0;
      const remarksVal = data.remarks || '';
      const highlightedVal = typeof data.highlighted === 'boolean' ? data.highlighted : false;
      const isFrozenVal = typeof data.isFrozen === 'boolean' ? data.isFrozen : false;
      
      const createdAtStr = data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '';
      const updatedAtStr = data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt).toISOString() : createdAtStr;

      const teamInfo = teamMap.get(data.teamId || '');
      const juryName = juryMap.get(data.juryId) || 'Unknown Jury';

      scores.push({
        id: doc.id,
        teamId: data.teamId || '',
        teamName: teamInfo?.teamName || data.teamId || 'Unknown Team',
        problemStatement: teamInfo?.problemStatement || 'N/A',
        juryId: data.juryId || '',
        juryName,
        rubric: rubricObj,
        totalScore: totalScoreVal,
        remarks: remarksVal,
        highlighted: highlightedVal,
        isFrozen: isFrozenVal,
        createdAt: createdAtStr,
        updatedAt: updatedAtStr,
      });
    }

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
    const [snapshot, teamsSnap] = await Promise.all([
      getCachedDocs('gameScores'),
      getCachedDocs('teams'),
    ]);
    
    const teamMap = new Map<string, { teamName: string }>();
    teamsSnap.docs.forEach((doc: any) => {
      teamMap.set(doc.id, { teamName: doc.data().teamName || doc.id });
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
    const scoresRef = db.collection('prelimsEvaluations');

    // Ensure team exists
    const teamDoc = await db.collection('teams').doc(scoreData.teamId).get();
    if (!teamDoc.exists) {
      return { success: false, error: `Team ID "${scoreData.teamId}" does not exist.` };
    }

    // Check if score record already exists for this team (enforce single score record rule)
    const existingSnap = await scoresRef.where('teamId', '==', scoreData.teamId).where('juryId', '==', scoreData.juryId).limit(1).get();
    if (!existingSnap.empty) {
      return { success: false, error: 'A score record already exists for this team by this jury.' };
    }

    const { innovation, technicalFeasibility, impact, presentation } = scoreData.rubric;
    const totalScore = Number(innovation) + Number(technicalFeasibility) + Number(impact) + Number(presentation);
    const now = new Date();

    const newDoc = scoresRef.doc();
    await newDoc.set({
      teamId: scoreData.teamId,
      juryId: scoreData.juryId,
      rubric: {
        innovation: Number(innovation),
        technicalFeasibility: Number(technicalFeasibility),
        impact: Number(impact),
        presentation: Number(presentation),
      },
      totalScore,
      remarks: scoreData.remarks?.trim() || '',
      highlighted: !!scoreData.highlighted,
      isFrozen: false,
      createdAt: now,
      updatedAt: now,
    });

    invalidateCollectionCache('prelimsEvaluations');
    invalidateCollectionCache('finaleEvaluations');
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
    const docRef = db.collection('prelimsEvaluations').doc(scoreId);
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
      const { innovation, technicalFeasibility, impact, presentation } = updatedFields.rubric;
      const parsedRubric = {
        innovation: Number(innovation),
        technicalFeasibility: Number(technicalFeasibility),
        impact: Number(impact),
        presentation: Number(presentation),
      };
      payload.rubric = parsedRubric;
      payload.totalScore = parsedRubric.innovation + parsedRubric.technicalFeasibility + parsedRubric.impact + parsedRubric.presentation;
    }

    payload.updatedAt = new Date();

    await docRef.update(payload);
    invalidateCollectionCache('prelimsEvaluations');
    invalidateCollectionCache('finaleEvaluations');
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
    await db.collection('prelimsEvaluations').doc(scoreId).delete();
    invalidateCollectionCache('prelimsEvaluations');
    invalidateCollectionCache('finaleEvaluations');
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
    
    // 1. Fetch all prelimsEvaluations
    const evalsSnap = await db.collection('prelimsEvaluations').get();
    
    // Group evaluations by teamId
    const teamScores: Record<string, number[]> = {};
    evalsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (!teamScores[data.teamId]) teamScores[data.teamId] = [];
      teamScores[data.teamId].push(data.totalScore || 0);
    });

    const batch = db.batch();
    
    // Calculate average and update team
    for (const [teamId, scores] of Object.entries(teamScores)) {
      if (scores.length > 0) {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const teamRef = db.collection('teams').doc(teamId);
        batch.update(teamRef, {
          prelimsAverageScore: averageScore,
          prelimsStatus: 'selected', // Default behavior for now, can be changed via admin dashboard later
        });
      }
    }

    await batch.commit();
    invalidateCollectionCache('teams');
    invalidateCollectionCache('prelimsEvaluations');
    return { success: true };
  } catch (error: any) {
    console.error('Error publishing prelims results:', error);
    return { success: false, error: error.message || 'Failed to publish results' };
  }
}

export type PhaseState = 'not-set' | 'active' | 'ended';

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
    const [resTime, resTeams, resPrelims, resFinale, resLabs, resJuries] = await Promise.all([
      getEventTimelinesAdmin(),
      getAllTeamsAdmin(),
      getAllEvaluationsAdmin('prelimsEvaluations'),
      getAllEvaluationsAdmin('finaleEvaluations'),
      getLabsAdmin(),
      getJuriesAdmin(),
    ]);

    return {
      success: true,
      timelines: resTime.timelines,
      teams: resTeams.teams || [],
      prelimsScores: resPrelims.scores || [],
      finaleScores: resFinale.scores || [],
      labs: resLabs.labs || [],
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
    if (timeline === '2') resetData.pptFilterApplied = false;
    if (timeline === '3') resetData.finalistsPromoted = false;

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
    const teamsSnap = await db.collection('teams').get();

    const batch = db.batch();
    let passed = 0;
    let failed = 0;

    teamsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const hasPpt = data.pptLink && String(data.pptLink).trim().length > 0;
      batch.update(doc.ref, {
        pptQualified: hasPpt ? true : false,
        pptStatus: hasPpt ? 'submitted' : 'failed',
      });
      if (hasPpt) passed++;
      else failed++;
    });

    await batch.commit();

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
    const [teamsSnap, prelimsSnap, finaleSnap, jurySnap, labsSnap] = await Promise.all([
      getCachedDocs('teams'),
      getCachedDocs('prelimsEvaluations'),
      getCachedDocs('finaleEvaluations'),
      getCachedDocs('jury'),
      getCachedDocs('labs'),
    ]);

    let totalTeams = teamsSnap.size;
    let totalStudents = 0;
    let pptSubmittedCount = 0;
    let finalistCount = 0;

    teamsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      // Count students (lead + members)
      let count = 0;
      if (data.leadData || data.leadEmail) count += 1;
      if (Array.isArray(data.membersData)) count += data.membersData.length;
      if (count === 0) count = 1; // Fallback
      totalStudents += count;

      if (data.pptLink && String(data.pptLink).trim().length > 0) {
        pptSubmittedCount += 1;
      }
      if (data.finaleQualified === true) {
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
    prelimsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const juryKey = data.judgeName || data.judgeId || data.judge || 'Unassigned';
      prelimsCountByJury[juryKey] = (prelimsCountByJury[juryKey] || 0) + 1;
    });

    const finaleCountByJury: Record<string, number> = {};
    finaleSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const juryKey = data.judgeName || data.judgeId || data.judge || 'Unassigned';
      finaleCountByJury[juryKey] = (finaleCountByJury[juryKey] || 0) + 1;
    });

    const juryStats: JuryStat[] = [];
    jurySnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const juryName = data.juryName || doc.id;
      juryStats.push({
        juryId: doc.id,
        juryName: juryName,
        institution: data.institution || '',
        assignedLab: labJuryMap.get(juryName) || 'Unassigned',
        prelimsEvaluatedCount: prelimsCountByJury[juryName] || prelimsCountByJury[doc.id] || 0,
        finaleEvaluatedCount: finaleCountByJury[juryName] || finaleCountByJury[doc.id] || 0,
      });
    });

    return {
      success: true,
      stats: {
        totalTeams,
        totalStudents,
        pptSubmittedCount,
        prelimsEvaluatedCount: prelimsSnap.size,
        finaleEvaluatedCount: finaleSnap.size,
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
    const teamsSnap = await db.collection('teams').get();

    const winnerMap = new Map<string, { rank: number; title: string }>();
    winners.forEach((w) => winnerMap.set(w.teamId, { rank: w.rank, title: w.title }));

    const batch = db.batch();
    teamsSnap.docs.forEach((doc) => {
      const wInfo = winnerMap.get(doc.id);
      if (wInfo) {
        batch.update(doc.ref, {
          isWinner: true,
          winnerRank: wInfo.rank,
          winnerTitle: wInfo.title,
        });
      } else {
        batch.update(doc.ref, {
          isWinner: false,
          winnerRank: null,
          winnerTitle: null,
        });
      }
    });

    await batch.commit();

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
    await db.collection('teams').doc(teamId).update({
      finaleQualified: qualified,
      prelimsStatus: qualified ? 'selected' : 'rejected',
    });
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

    const db = getAdminDb();
    const snapshot = await db.collection('teams').get();

    if (snapshot.empty) {
      return { success: false, error: 'No teams registered yet.' };
    }

    const batch = db.batch();
    const docs = snapshot.docs;

    docs.forEach((doc, idx) => {
      const assignedLab = labs[idx % labs.length];
      const assignedJury = juries[idx % juries.length];

      batch.update(doc.ref, {
        labNo: assignedLab,
        judge: assignedJury,
      });
    });

    await batch.commit();
    invalidateCollectionCache('teams');
    return { success: true, count: docs.length };
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
    const [evalsSnap, teamsSnap] = await Promise.all([
      db.collection('prelimsEvaluations').get(),
      db.collection('teams').get(),
    ]);

    const teamScores: Record<string, number> = {};
    evalsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.teamId) {
        // Keep highest or latest total score for team
        teamScores[data.teamId] = Math.max(teamScores[data.teamId] || 0, data.totalScore || 0);
      }
    });

    const teamsWithScore: { id: string; score: number }[] = [];
    teamsSnap.docs.forEach((doc) => {
      const score = teamScores[doc.id] || 0;
      teamsWithScore.push({ id: doc.id, score });
    });

    // Sort descending by score
    teamsWithScore.sort((a, b) => b.score - a.score);

    const qualifiedIds = new Set(teamsWithScore.slice(0, topCount).map((t) => t.id));

    const batch = db.batch();
    teamsSnap.docs.forEach((doc) => {
      const isQualified = qualifiedIds.has(doc.id);
      batch.update(doc.ref, {
        finaleQualified: isQualified,
        prelimsStatus: isQualified ? 'selected' : 'rejected',
      });
    });

    await batch.commit();
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
  assignedJuryName?: string
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
  assignedJuryName?: string
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

    await docRef.update(payload);

    // Sync teams assigned to this lab with updated Lab Name and Jury Name
    const teamsSnap = await db.collection('teams').get();
    const batch = db.batch();
    let count = 0;

    teamsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (
        data.assignedLabId === labId ||
        (oldLabName && data.assignedLabName === oldLabName) ||
        (oldLabName && data.labNo === oldLabName)
      ) {
        batch.update(doc.ref, {
          assignedLabId: labId,
          assignedLabName: labName.trim(),
          labNo: labName.trim(),
          judge: cleanJury !== 'Unassigned' ? cleanJury : data.judge || 'Unassigned',
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
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
    const teamsSnap = await db.collection('teams').get();
    const batch = db.batch();
    let count = 0;

    teamsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (
        data.assignedLabId === labId ||
        (oldLabName && data.assignedLabName === oldLabName) ||
        (oldLabName && data.labNo === oldLabName)
      ) {
        batch.update(doc.ref, {
          assignedLabId: FieldValue.delete(),
          assignedLabName: FieldValue.delete(),
          labNo: 'Unassigned',
          judge: 'Unassigned',
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
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

export async function autoAssignTeamsToLabsAdmin(): Promise<{ success: boolean; assignedCount?: number; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const [labsSnap, teamsSnap] = await Promise.all([
      db.collection('labs').get(),
      db.collection('teams').get(),
    ]);

    if (labsSnap.empty) {
      return { success: false, error: 'No Labs configured. Please create at least one Lab below first.' };
    }

    const labs: (LabData & { ref: any })[] = labsSnap.docs.map((doc) => ({
      labId: doc.id,
      labName: doc.data().labName || doc.id,
      capacity: typeof doc.data().capacity === 'number' ? doc.data().capacity : 0,
      assignedJuryName: doc.data().assignedJuryName || 'Unassigned',
      currentTeamCount: typeof doc.data().currentTeamCount === 'number' ? doc.data().currentTeamCount : 0,
      ref: doc.ref,
    }));

    labs.sort((a, b) => a.labName.localeCompare(b.labName));
    const allTeams = teamsSnap.docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }));

    if (allTeams.length === 0) {
      return { success: false, error: 'No teams registered yet.' };
    }

    const batch = db.batch();
    const teamCounts: Record<string, number> = {};
    labs.forEach((l) => { teamCounts[l.labId] = 0; });

    allTeams.forEach((team, idx) => {
      const assignedLab = labs[idx % labs.length];
      teamCounts[assignedLab.labId] = (teamCounts[assignedLab.labId] || 0) + 1;

      batch.update(team.ref, {
        assignedLabId: assignedLab.labId,
        assignedLabName: assignedLab.labName,
        labNo: assignedLab.labName,
        judge: assignedLab.assignedJuryName !== 'Unassigned' ? assignedLab.assignedJuryName : (team as any).judge || 'Unassigned',
      });
    });

    labs.forEach((lab) => {
      batch.update(lab.ref, {
        currentTeamCount: teamCounts[lab.labId] || 0,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    invalidateCollectionCache('labs');
    invalidateCollectionCache('teams');
    return { success: true, assignedCount: allTeams.length };
  } catch (error: any) {
    console.error('Error auto assigning teams:', error);
    return { success: false, error: error.message || 'Failed to auto assign teams' };
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

    const snapshot = await getCachedDocs('jury');

    const juries: JuryOption[] = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.juryName || data.name || doc.id,
        email: data.email || '',
        institution: data.institution || '',
      };
    });

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

    const db = getAdminDb();
    const batchSize = 400;
    let batch = db.batch();
    let opCount = 0;

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

    const now = new Date();

    for (let i = 1; i <= count; i++) {
      const teamId = `dummy_team_${String(i).padStart(3, '0')}`;
      const docRef = db.collection('teams').doc(teamId);

      const dept = depts[i % depts.length];
      const ps = problemStatements[i % problemStatements.length];

      const teamData = {
        teamName: `Dummy Team ${String(i).padStart(3, '0')}`,
        displayId: `TEAM-${1000 + i}`,
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
          {
            name: `Member 1 of Team ${i}`,
            department: dept,
            year: '3rd Year',
            section: 'A',
            registerNumber: `REG2026M1_${i}`,
          },
          {
            name: `Member 2 of Team ${i}`,
            department: dept,
            year: '3rd Year',
            section: 'B',
            registerNumber: `REG2026M2_${i}`,
          },
        ],
        labNo: 'Unassigned',
        judge: 'Unassigned',
        prelimsAverageScore: 0,
        prelimsStatus: 'pending',
        finaleQualified: false,
        createdAt: now,
        updatedAt: now,
      };

      batch.set(docRef, teamData, { merge: true });
      opCount++;

      if (opCount === batchSize) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }

    invalidateCollectionCache('teams');
    return { success: true, seededCount: count };
  } catch (error: any) {
    console.error('Error seeding dummy teams:', error);
    return { success: false, error: error.message || 'Failed to seed dummy teams' };
  }
}


