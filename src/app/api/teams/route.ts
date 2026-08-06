import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole, requireRole } from '@/lib/api-utils';
import {
  getAllTeamsFlatFromDomainDocs,
  findTeamByLeadEmail,
  createTeamInDomainDoc,
} from '@/lib/firestore-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domainFilter = searchParams.get('domain');
    const leadEmailFilter = searchParams.get('leadEmail');

    if (leadEmailFilter) {
      const found = await findTeamByLeadEmail(leadEmailFilter);
      return apiSuccess({ team: found ? found.team : null });
    }

    let teams = await getAllTeamsFlatFromDomainDocs();

    if (domainFilter) {
      teams = teams.filter((t) => t.theme?.toLowerCase().includes(domainFilter.toLowerCase()));
    }

    return apiSuccess({ teams, total: teams.length });
  } catch (error: any) {
    console.error('API GET /api/teams error:', error);
    return apiError(error.message || 'Failed to fetch teams', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.teamName || !body.leadEmail) {
      return apiError('teamName and leadEmail are required fields');
    }

    // Uniqueness check across all domain docs
    const existing = await findTeamByLeadEmail(body.leadEmail);
    if (existing) {
      return apiError(`A team with lead email "${body.leadEmail}" is already registered.`);
    }

    const result = await createTeamInDomainDoc(body);
    if (!result.success) {
      return apiError(result.error || 'Failed to register team', 400);
    }

    return apiSuccess({ message: 'Team registered successfully', teamId: result.teamId }, 201);
  } catch (error: any) {
    console.error('API POST /api/teams error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
