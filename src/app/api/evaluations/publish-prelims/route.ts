import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import {
  getEvalRecords,
  getAllTeamsFlatFromDomainDocs,
  updateTeamInDomainDoc,
} from '@/lib/firestore-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { searchParams } = new URL(request.url);
    const topN = Number(searchParams.get('topN') || '15');

    const evalRecords = await getEvalRecords('prelims');
    const teams = await getAllTeamsFlatFromDomainDocs();

    // Group evaluation scores per team
    const teamScoresMap: Record<string, number[]> = {};
    evalRecords.forEach((r) => {
      if (r.teamId && typeof r.totalScore === 'number') {
        if (!teamScoresMap[r.teamId]) teamScoresMap[r.teamId] = [];
        teamScoresMap[r.teamId].push(r.totalScore);
      }
    });

    // Compute average score per team
    const teamAverages = teams.map((t) => {
      const scores = teamScoresMap[t.id] || [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : (t.score || 0);
      return { teamId: t.id, avgScore: avg };
    });

    // Sort descending by average score
    teamAverages.sort((a, b) => b.avgScore - a.avgScore);

    const qualifiedSet = new Set(teamAverages.slice(0, topN).map((item) => item.teamId));

    // Update teams in domain docs
    await Promise.all(
      teamAverages.map(({ teamId, avgScore }) => {
        const isQualified = qualifiedSet.has(teamId);
        return updateTeamInDomainDoc(teamId, {
          prelimsAverageScore: avgScore,
          score: avgScore,
          prelimsStatus: isQualified ? 'selected' : 'not_selected',
          finaleQualified: isQualified,
        });
      })
    );

    return apiSuccess({
      message: `Prelims results published successfully. Top ${topN} teams promoted to Final Round.`,
      qualifiedCount: qualifiedSet.size,
    });
  } catch (error: any) {
    console.error('API POST /api/evaluations/publish-prelims error:', error);
    return apiError(error.message || 'Failed to publish prelims results', 500);
  }
}
