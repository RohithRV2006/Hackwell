import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/app/admin/actions';
import { ALL_DOMAIN_DOC_IDS, DOMAIN_SLUGS, invalidateTeamCache } from '@/lib/firestore-helpers';

export async function GET() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();

  // 1. Reset 5 domain documents in `teams`
  for (const domainId of ALL_DOMAIN_DOC_IDS) {
    await db.collection('teams').doc(domainId).set({
      domainId,
      domainName: DOMAIN_SLUGS[domainId]?.name || 'Domain',
      teamCount: 0,
      updatedAt: new Date(),
      teams: [],
    });
  }

  // 2. Delete any legacy individual team documents
  const teamsSnap = await db.collection('teams').get();
  const domainSet = new Set(ALL_DOMAIN_DOC_IDS);
  for (const doc of teamsSnap.docs) {
    if (!domainSet.has(doc.id)) {
      await doc.ref.delete();
    }
  }

  // 3. Reset 2 evaluation documents (`prelims` and `finale`)
  await db.collection('evaluations').doc('prelims').set({
    round: 'prelims',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });

  await db.collection('evaluations').doc('finale').set({
    round: 'finale',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });

  // 4. Delete legacy evaluation docs
  const evalsSnap = await db.collection('evaluations').get();
  for (const doc of evalsSnap.docs) {
    if (doc.id !== 'prelims' && doc.id !== 'finale') {
      await doc.ref.delete();
    }
  }

  // 5. Delete all records in `gameScores`
  const gameScoresSnap = await db.collection('gameScores').get();
  for (const doc of gameScoresSnap.docs) {
    await doc.ref.delete();
  }

  // 6. Reset metadata team counter & winners
  await db.collection('metadata').doc('teamCounter').set({ count: 0 }, { merge: true });
  await db.collection('metadata').doc('eventWinners').set({ winners: [], updatedAt: new Date().toISOString() }, { merge: true });

  // 7. Reset currentTeamCount in `labs` and `finalLabs`
  const labsSnap = await db.collection('labs').get();
  for (const doc of labsSnap.docs) {
    await doc.ref.update({ currentTeamCount: 0, updatedAt: new Date() });
  }
  const finalLabsSnap = await db.collection('finalLabs').get();
  for (const doc of finalLabsSnap.docs) {
    await doc.ref.update({ currentTeamCount: 0, updatedAt: new Date() });
  }

  invalidateTeamCache();

  return NextResponse.json({
    success: true,
    message: 'All teams, evaluations, gameScores, and team counts successfully wiped. Roles, Juries, Labs, and Timelines remain intact.',
  });
}

