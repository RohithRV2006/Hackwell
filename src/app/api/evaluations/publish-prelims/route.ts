import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { publishJurySelectedFinalists } from '@/lib/firestore-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const body = await request.json();
    const selectedTeamIds = Array.isArray(body.selectedTeamIds) ? body.selectedTeamIds : [];

    const res = await publishJurySelectedFinalists(selectedTeamIds);
    if (!res.success) {
      return apiError(res.error || 'Failed to publish finalists', 400);
    }

    return apiSuccess({
      message: `Successfully published ${res.count} teams to the Final Round.`,
      qualifiedCount: res.count,
    });
  } catch (error: any) {
    console.error('API POST /api/evaluations/publish-prelims error:', error);
    return apiError(error.message || 'Failed to publish prelims results', 500);
  }
}
