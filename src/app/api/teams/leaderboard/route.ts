import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { getAllTeamsFlatCached } from '@/lib/firestore-helpers';

export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const teams = await getAllTeamsFlatCached();
    const rankedTeams = teams
      .map((t) => ({
        id: t.id,
        displayId: t.displayId,
        teamName: t.teamName,
        theme: t.theme,
        totalGameXP: (t as any).totalGameXP || 0,
        score: t.score || 0,
      }))
      .sort((a, b) => b.totalGameXP - a.totalGameXP || b.score - a.score);

    return apiSuccess({ leaderboard: rankedTeams, total: rankedTeams.length });
  } catch (error: any) {
    console.error('API GET /api/teams/leaderboard error:', error);
    return apiError(error.message || 'Failed to fetch leaderboard', 500);
  }
}
