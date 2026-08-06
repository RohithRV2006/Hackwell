import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole, requireRole } from '@/lib/api-utils';
import {
  findTeamInDomainDocs,
  updateTeamInDomainDoc,
  deleteTeamFromDomainDoc,
} from '@/lib/firestore-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await params;
    const found = await findTeamInDomainDocs(teamId);

    if (!found) {
      return apiError('Team not found', 404);
    }

    return apiSuccess({ team: found.team, domainId: found.domainId });
  } catch (error: any) {
    console.error('API GET /api/teams/[teamId] error:', error);
    return apiError(error.message || 'Failed to fetch team', 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || !requireRole(['admin', 'coordinator'], user.role)) {
      return apiError('Unauthorized', 401);
    }

    const { teamId } = await params;
    const body = await request.json();

    const result = await updateTeamInDomainDoc(teamId, body);
    if (!result.success) {
      return apiError(result.error || 'Failed to update team', 400);
    }

    return apiSuccess({ message: 'Team updated successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/teams/[teamId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { teamId } = await params;
    const result = await deleteTeamFromDomainDoc(teamId);

    if (!result.success) {
      return apiError(result.error || 'Failed to delete team', 400);
    }

    return apiSuccess({ message: 'Team deleted successfully' });
  } catch (error: any) {
    console.error('API DELETE /api/teams/[teamId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
