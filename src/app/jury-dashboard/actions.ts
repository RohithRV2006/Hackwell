'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface JuryMember {
  id: string;
  juryName: string;
  institution: string;
  createdAt?: string;
}

export interface Rubric {
  idea: number;
  output: number;
  innovation: number;
  presentation: number;
  finalOutput: number;
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

export interface SimpleTeam {
  id: string;
  teamName: string;
  problemStatement: string;
  assignedJury?: string;
  currentScore?: number;
}

/**
 * Add a new Jury member to the `jury` collection (auto-generated document ID).
 */
export async function addJuryMember(juryName: string, institution: string) {
  try {
    if (!juryName?.trim() || !institution?.trim()) {
      return { success: false, error: 'Jury name and institution are required.' };
    }

    const db = getAdminDb();
    const juryRef = db.collection('jury').doc(); // Auto-generated ID

    await juryRef.set({
      juryName: juryName.trim(),
      institution: institution.trim(),
      createdAt: new Date(),
    });

    return { success: true, id: juryRef.id };
  } catch (error: any) {
    console.error('Error adding jury member:', error);
    return { success: false, error: error.message || 'Failed to add jury member' };
  }
}

/**
 * Get all Jury members from the `jury` collection.
 */
export async function getAllJuryMembers() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('jury').orderBy('createdAt', 'desc').get();

    const juryList: JuryMember[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        juryName: data.juryName || '',
        institution: data.institution || '',
        createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '',
      };
    });

    return { success: true, juryList };
  } catch (error: any) {
    console.error('Error fetching jury list:', error);
    return { success: false, error: error.message || 'Failed to fetch jury members', juryList: [] };
  }
}

/**
 * Get all Teams with their score information.
 */
export async function getTeamsWithScores() {
  try {
    const db = getAdminDb();
    const teamsSnap = await db.collection('teams').get();
    const scoresSnap = await db.collection('scores').get();

    // Map existing scores by teamId
    const scoreMap = new Map<string, { id: string; juryName: string; score: number }>();
    scoresSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.teamId) {
        const scoreVal = typeof data.score === 'number' ? data.score : 0;
        const totalScoreVal = typeof data.totalScore === 'number' ? data.totalScore : scoreVal;
        scoreMap.set(data.teamId, {
          id: doc.id,
          juryName: data.juryName || '',
          score: totalScoreVal,
        });
      }
    });

    const teams: SimpleTeam[] = teamsSnap.docs.map((doc) => {
      const data = doc.data();
      const scoreData = scoreMap.get(doc.id);
      return {
        id: doc.id,
        teamName: data.teamName || doc.id,
        problemStatement: data.problemStatement || 'N/A',
        assignedJury: scoreData?.juryName || 'Unassigned',
        currentScore: scoreData?.score,
      };
    });

    return { success: true, teams };
  } catch (error: any) {
    console.error('Error fetching teams with scores:', error);
    return { success: false, error: error.message || 'Failed to fetch teams', teams: [] };
  }
}

/**
 * Submit or update a Team's score by a Jury member in the `scores` collection.
 * Enforces business rules:
 * - Each Team has ONLY ONE score record (no duplicates).
 * - Auto-generated document ID when creating a new record.
 */
export async function submitOrUpdateScore(teamId: string, juryName: string, score: number) {
  try {
    if (!teamId || !juryName?.trim() || score === undefined || score === null) {
      return { success: false, error: 'Team ID, Jury Name, and Score are required.' };
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return { success: false, error: 'Score must be a number between 0 and 100.' };
    }

    const db = getAdminDb();
    const scoresRef = db.collection('scores');

    // Check if score record already exists for this team
    const existingSnap = await scoresRef.where('teamId', '==', teamId).limit(1).get();

    const base = Math.floor(numericScore / 5);
    const remainder = numericScore % 5;
    const rubricObj = {
      idea: base + (remainder >= 1 ? 1 : 0),
      output: base + (remainder >= 2 ? 1 : 0),
      innovation: base + (remainder >= 3 ? 1 : 0),
      presentation: base + (remainder >= 4 ? 1 : 0),
      finalOutput: base,
    };
    const now = new Date();

    if (!existingSnap.empty) {
      // Update existing single score record
      const docRef = existingSnap.docs[0].ref;
      await docRef.update({
        juryName: juryName.trim(),
        rubric: rubricObj,
        totalScore: numericScore,
        updatedAt: now,
        score: FieldValue.delete(),
      });
      return { success: true, docId: docRef.id, updated: true };
    } else {
      // Create new score record with auto-generated document ID
      const newDocRef = scoresRef.doc();
      await newDocRef.set({
        teamId: teamId,
        juryName: juryName.trim(),
        rubric: rubricObj,
        totalScore: numericScore,
        feedback: '',
        starred: false,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, docId: newDocRef.id, updated: false };
    }
  } catch (error: any) {
    console.error('Error submitting score:', error);
    return { success: false, error: error.message || 'Failed to submit score' };
  }
}

/**
 * Get all score records from the `scores` collection.
 */
export async function getAllScores() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection('scores').orderBy('createdAt', 'desc').get();

    const scoresList: TeamScore[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const scoreVal = typeof data.score === 'number' ? data.score : 0;
      const totalScoreVal = typeof data.totalScore === 'number' ? data.totalScore : scoreVal;
      const base = Math.floor(scoreVal / 5);
      const remainder = scoreVal % 5;
      const rubricObj: Rubric = data.rubric || {
        idea: base + (remainder >= 1 ? 1 : 0),
        output: base + (remainder >= 2 ? 1 : 0),
        innovation: base + (remainder >= 3 ? 1 : 0),
        presentation: base + (remainder >= 4 ? 1 : 0),
        finalOutput: base,
      };

      return {
        id: doc.id,
        teamId: data.teamId || '',
        juryName: data.juryName || '',
        rubric: rubricObj,
        totalScore: totalScoreVal,
        score: totalScoreVal, // backward compatibility
        feedback: data.feedback || '',
        starred: typeof data.starred === 'boolean' ? data.starred : false,
        createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : '',
        updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt).toISOString() : (data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt).toISOString() : ''),
      };
    });

    return { success: true, scoresList };
  } catch (error: any) {
    console.error('Error fetching scores:', error);
    return { success: false, error: error.message || 'Failed to fetch scores', scoresList: [] };
  }
}
