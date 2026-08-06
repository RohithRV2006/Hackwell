import './load-env';
import { getAdminDb } from '../lib/firebase-admin';
import { ALL_DOMAIN_DOC_IDS, DOMAIN_SLUGS } from '../lib/firestore-helpers';

async function wipeTeams() {
  console.log('🧹 Starting Firebase Teams & Evaluations Cleanup...');
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

  console.log('🎉 Firebase team data & evaluations successfully wiped!');
}

wipeTeams().catch((err) => {
  console.error('❌ Error wiping teams:', err);
  process.exit(1);
});
