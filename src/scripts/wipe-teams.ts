import './load-env';
import { getAdminDb } from '../lib/firebase-admin';
import { ALL_DOMAIN_DOC_IDS, DOMAIN_SLUGS, invalidateTeamCache } from '../lib/firestore-helpers';

async function wipeTeams() {
  console.log('🧹 Starting Firebase Teams & Team Evaluations Cleanup...');
  const db = getAdminDb();

  // 1. Reset 5 Domain Documents in `teams`
  console.log('📦 Resetting 5 domain documents in `teams` collection...');
  for (const domainId of ALL_DOMAIN_DOC_IDS) {
    await db.collection('teams').doc(domainId).set({
      domainId,
      domainName: DOMAIN_SLUGS[domainId]?.name || 'Domain',
      teamCount: 0,
      updatedAt: new Date(),
      teams: [],
    });
    console.log(`  ✓ Reset domain doc: teams/${domainId}`);
  }

  // 2. Delete any legacy individual team documents in `teams` collection
  const teamsSnap = await db.collection('teams').get();
  let deletedLegacyCount = 0;
  const domainSet = new Set(ALL_DOMAIN_DOC_IDS);
  for (const doc of teamsSnap.docs) {
    if (!domainSet.has(doc.id)) {
      await doc.ref.delete();
      deletedLegacyCount++;
    }
  }
  if (deletedLegacyCount > 0) {
    console.log(`  ✓ Deleted ${deletedLegacyCount} legacy individual team documents from \`teams\`.`);
  }

  // 3. Reset 2 Evaluation Documents in `evaluations`
  console.log('📊 Resetting 2 round documents in `evaluations` collection...');
  await db.collection('evaluations').doc('prelims').set({
    round: 'prelims',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });
  console.log('  ✓ Reset evaluations/prelims');

  await db.collection('evaluations').doc('finale').set({
    round: 'finale',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });
  console.log('  ✓ Reset evaluations/finale');

  // 4. Delete any legacy individual evaluation documents in `evaluations`
  const evalsSnap = await db.collection('evaluations').get();
  let deletedLegacyEvals = 0;
  for (const doc of evalsSnap.docs) {
    if (doc.id !== 'prelims' && doc.id !== 'finale') {
      await doc.ref.delete();
      deletedLegacyEvals++;
    }
  }
  if (deletedLegacyEvals > 0) {
    console.log(`  ✓ Deleted ${deletedLegacyEvals} legacy evaluation documents.`);
  }

  // 5. Delete all records in `gameScores`
  console.log('🎮 Wiping `gameScores` collection...');
  const gameScoresSnap = await db.collection('gameScores').get();
  let deletedGameScores = 0;
  for (const doc of gameScoresSnap.docs) {
    await doc.ref.delete();
    deletedGameScores++;
  }
  console.log(`  ✓ Deleted ${deletedGameScores} game score records.`);

  // 6. Reset metadata team counter & winners
  console.log('🔢 Resetting metadata counters & event winners...');
  await db.collection('metadata').doc('teamCounter').set({ count: 0 }, { merge: true });
  await db.collection('metadata').doc('eventWinners').set({ winners: [], updatedAt: new Date().toISOString() }, { merge: true });
  console.log('  ✓ Reset metadata/teamCounter & metadata/eventWinners');

  // 7. Reset currentTeamCount in `labs` and `finalLabs`
  console.log('🏛️ Resetting team counts in labs & finalLabs...');
  const labsSnap = await db.collection('labs').get();
  for (const doc of labsSnap.docs) {
    await doc.ref.update({ currentTeamCount: 0, updatedAt: new Date() });
  }
  const finalLabsSnap = await db.collection('finalLabs').get();
  for (const doc of finalLabsSnap.docs) {
    await doc.ref.update({ currentTeamCount: 0, updatedAt: new Date() });
  }
  console.log('  ✓ Reset lab team counts.');

  invalidateTeamCache();
  console.log('🎉 Firebase team data & evaluations successfully wiped! (Roles, Juries, Labs, and Timelines preserved)');
}

wipeTeams().catch((err) => {
  console.error('❌ Error wiping teams:', err);
  process.exit(1);
});
