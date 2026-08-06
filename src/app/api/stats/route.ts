import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { getAllTeamsFlatCached, getEvalRecords } from '@/lib/firestore-helpers';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const teams = await getAllTeamsFlatCached();
    const evalRecords = await getEvalRecords('prelims');

    const totalTeams = teams.length;
    const totalStudents = teams.reduce(
      (acc, t) => acc + (t.leadData ? 1 : 0) + (t.membersData ? t.membersData.length : 0),
      0
    );
    const pptSubmittedCount = teams.filter((t) => t.pptLink && String(t.pptLink).trim().length > 0).length;
    const prelimsQualifiedCount = teams.filter((t) => t.prelimsStatus === 'selected' || t.finaleQualified).length;
    const evaluationsCompletedCount = evalRecords.filter((r) => r.isFrozen).length;

    return apiSuccess({
      totalTeams,
      totalStudents,
      pptSubmittedCount,
      prelimsQualifiedCount,
      evaluationsCompletedCount,
    });
  } catch (error: any) {
    console.error('API GET /api/stats error:', error);
    return apiError(error.message || 'Failed to fetch overview stats', 500);
  }
}
