import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { DOMAIN_SLUGS, ALL_DOMAIN_DOC_IDS, resolveDomainId } from '@/lib/firestore-helpers';

export async function GET() {
  try {
    const db = getAdminDb();

    // Migrate teams
    const oldTeamsSnap = await db.collection('teams').get();
    const domainGroupedTeams: Record<string, any[]> = {};
    ALL_DOMAIN_DOC_IDS.forEach((id) => {
      domainGroupedTeams[id] = [];
    });

    oldTeamsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (ALL_DOMAIN_DOC_IDS.includes(doc.id)) return;

      const domainId = resolveDomainId(data.theme || data.problemStatement);
      const hasPpt = Boolean(data.pptLink && String(data.pptLink).trim().length > 0);

      domainGroupedTeams[domainId].push({
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
      });
    });

    for (const domainId of ALL_DOMAIN_DOC_IDS) {
      const teamsArr = domainGroupedTeams[domainId];
      await db.collection('teams').doc(domainId).set({
        domainId,
        domainName: DOMAIN_SLUGS[domainId]?.name || 'Domain',
        teamCount: teamsArr.length,
        updatedAt: new Date(),
        teams: teamsArr,
      });
    }

    // Migrate evaluations
    const oldEvalsSnap = await db.collection('evaluations').get();
    const prelimsRecords: any[] = [];
    const finaleRecords: any[] = [];

    oldEvalsSnap.docs.forEach((doc) => {
      if (doc.id === 'prelims' || doc.id === 'finale') return;

      const data = doc.data();
      const round = data.round || (doc.id.startsWith('finale_') ? 'finale' : 'prelims');
      const rec = {
        id: doc.id,
        teamId: data.teamId || '',
        teamName: data.teamName || '',
        juryId: data.juryId || '',
        juryName: data.juryName || '',
        round,
        rubric: data.rubric || { conceptStrength: 0, buildIntelligence: 0, deliveryImpact: 0, liveDefenseScore: 0, communication: 0 },
        totalScore: typeof data.totalScore === 'number' ? data.totalScore : 0,
        remarks: data.remarks || '',
        feedback: data.feedback || '',
        highlighted: Boolean(data.highlighted),
        isFrozen: Boolean(data.isFrozen),
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (round === 'finale') finaleRecords.push(rec);
      else prelimsRecords.push(rec);
    });

    await db.collection('evaluations').doc('prelims').set({
      round: 'prelims',
      totalCount: prelimsRecords.length,
      updatedAt: new Date(),
      records: prelimsRecords,
    });

    await db.collection('evaluations').doc('finale').set({
      round: 'finale',
      totalCount: finaleRecords.length,
      updatedAt: new Date(),
      records: finaleRecords,
    });

    return NextResponse.json({
      success: true,
      message: 'Migrated teams into 5 domain docs and evaluations into 2 round docs successfully.',
    });
  } catch (error: any) {
    console.error('API GET /api/migrate error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
