import './load-env';
import { getAdminDb } from '../lib/firebase-admin';
import { DOMAIN_SLUGS, ALL_DOMAIN_DOC_IDS, resolveDomainId } from '../lib/firestore-helpers';

async function migrateData() {
  console.log('🚀 Starting Data Migration to 5-Domain Teams & 2-Round Evaluations Schema...');

  const db = getAdminDb();

  // ───────────────────────────────────────────────────────────────────────────
  // 1. MIGRATE TEAMS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('📦 Reading existing `teams` collection...');
  const oldTeamsSnap = await db.collection('teams').get();
  console.log(`Found ${oldTeamsSnap.size} team documents in old collection.`);

  const domainGroupedTeams: Record<string, any[]> = {};
  ALL_DOMAIN_DOC_IDS.forEach((id) => {
    domainGroupedTeams[id] = [];
  });

  oldTeamsSnap.docs.forEach((doc) => {
    const data = doc.data();
    // Skip if this doc is already one of the 5 domain docs!
    if (ALL_DOMAIN_DOC_IDS.includes(doc.id)) {
      return;
    }

    const domainId = resolveDomainId(data.theme || data.problemStatement);
    const hasPpt = Boolean(data.pptLink && String(data.pptLink).trim().length > 0);

    const teamObj = {
      id: doc.id,
      displayId: data.displayId || doc.id,
      teamName: data.teamName || doc.id,
      problemStatement: data.problemStatement || 'Not assigned',
      theme: data.theme || DOMAIN_SLUGS[domainId]?.name || 'Autonomous Agentic AI',
      leadEmail: data.leadEmail || '',
      leadData: data.leadData || { name: '', batchNumber: '', department: '', year: '', section: '', contactNumber: '' },
      membersData: data.membersData || [],
      score: typeof data.score === 'number' ? data.score : 0,
      judge: data.judge || 'Unassigned',
      labNo: data.labNo || 'Unassigned',
      assignedLabId: data.assignedLabId || '',
      assignedLabName: data.assignedLabName || data.labNo || '',
      feedback: data.feedback || '',
      pptLink: data.pptLink || '',
      pptQualified: data.pptQualified !== false && hasPpt,
      pptStatus: data.pptStatus || (hasPpt ? 'submitted' : 'pending'),
      eliminated: data.eliminated === true || data.pptQualified === false,
      eliminationReason: data.eliminationReason || (hasPpt ? '' : 'No PPT presentation submitted during Phase 2'),
      prelimsStatus: data.prelimsStatus || (data.finaleQualified ? 'selected' : 'pending'),
      finaleQualified: data.finaleQualified === true,
      finalStatus: data.finalStatus || 'pending',
      finalVenue: data.finalVenue || 'TBA',
      isWinner: data.isWinner === true,
      winnerRank: typeof data.winnerRank === 'number' ? data.winnerRank : null,
      winnerTitle: data.winnerTitle || null,
      totalGameXP: typeof data.totalGameXP === 'number' ? data.totalGameXP : 0,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migratedFrom: `teams/${doc.id}`,
    };

    domainGroupedTeams[domainId].push(teamObj);
  });

  let totalMigratedTeams = 0;

  for (const domainId of ALL_DOMAIN_DOC_IDS) {
    const teamsArr = domainGroupedTeams[domainId];
    const domainName = DOMAIN_SLUGS[domainId]?.name || 'Domain';
    const docRef = db.collection('teams').doc(domainId);

    console.log(`💾 Writing ${teamsArr.length} teams into domain document: \`teams/${domainId}\`...`);
    await docRef.set({
      domainId,
      domainName,
      teamCount: teamsArr.length,
      updatedAt: new Date(),
      teams: teamsArr,
    });

    totalMigratedTeams += teamsArr.length;
  }

  console.log(`✅ Teams Migration Complete! Total teams migrated across 5 domain docs: ${totalMigratedTeams}`);

  // ───────────────────────────────────────────────────────────────────────────
  // 2. MIGRATE EVALUATIONS
  // ───────────────────────────────────────────────────────────────────────────
  console.log('\n📊 Reading existing `evaluations` collection...');
  const oldEvalsSnap = await db.collection('evaluations').get();
  console.log(`Found ${oldEvalsSnap.size} evaluation documents in old collection.`);

  const prelimsRecords: any[] = [];
  const finaleRecords: any[] = [];

  oldEvalsSnap.docs.forEach((doc) => {
    const data = doc.data();
    // Skip if this doc is already one of the 2 round docs!
    if (doc.id === 'prelims' || doc.id === 'finale') {
      return;
    }

    const round = data.round || (doc.id.startsWith('finale_') ? 'finale' : 'prelims');
    const recordObj = {
      id: doc.id,
      teamId: data.teamId || '',
      teamName: data.teamName || '',
      juryId: data.juryId || '',
      juryName: data.juryName || '',
      round,
      rubric: data.rubric || {
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
      totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
      remarks: data.remarks || '',
      feedback: data.feedback || '',
      highlighted: Boolean(data.highlighted),
      isFrozen: Boolean(data.isFrozen),
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      migratedFrom: `evaluations/${doc.id}`,
    };

    if (round === 'finale') {
      finaleRecords.push(recordObj);
    } else {
      prelimsRecords.push(recordObj);
    }
  });

  console.log(`💾 Writing ${prelimsRecords.length} records into \`evaluations/prelims\`...`);
  await db.collection('evaluations').doc('prelims').set({
    round: 'prelims',
    totalCount: prelimsRecords.length,
    updatedAt: new Date(),
    records: prelimsRecords,
  });

  console.log(`💾 Writing ${finaleRecords.length} records into \`evaluations/finale\`...`);
  await db.collection('evaluations').doc('finale').set({
    round: 'finale',
    totalCount: finaleRecords.length,
    updatedAt: new Date(),
    records: finaleRecords,
  });

  console.log('✅ Evaluations Migration Complete!');
  console.log(`Summary: ${prelimsRecords.length} prelims records + ${finaleRecords.length} finale records migrated.`);
  console.log('🎉 Full Schema Restructure Migration Complete successfully!');
}

migrateData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration error:', err);
    process.exit(1);
  });
