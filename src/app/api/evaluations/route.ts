import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole, requireRole } from '@/lib/api-utils';
import { getEvalRecords, upsertEvalRecord } from '@/lib/firestore-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const round = (searchParams.get('round') || 'prelims') as 'prelims' | 'finale';
    const juryIdParam = searchParams.get('juryId');
    const teamIdParam = searchParams.get('teamId');

    let records = await getEvalRecords(round);

    if (juryIdParam) {
      records = records.filter((r) => r.juryId === juryIdParam);
    }
    if (teamIdParam) {
      records = records.filter((r) => r.teamId === teamIdParam);
    }

    return apiSuccess({ records, total: records.length, round });
  } catch (error: any) {
    console.error('API GET /api/evaluations error:', error);
    return apiError(error.message || 'Failed to fetch evaluation records', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || !requireRole(['admin', 'jury'], user.role)) {
      return apiError('Unauthorized - Admin or Jury role required', 401);
    }

    const body = await request.json();
    if (!body.teamId || !body.round) {
      return apiError('teamId and round are required');
    }

    const round = body.round === 'finale' ? 'finale' : 'prelims';
    const recordPayload = {
      ...body,
      juryId: body.juryId || user.juryId || user.email,
      juryName: body.juryName || user.name || 'Jury Member',
    };

    const result = await upsertEvalRecord(round, recordPayload);
    if (!result.success) {
      return apiError(result.error || 'Failed to submit evaluation', 400);
    }

    return apiSuccess({ message: 'Evaluation submitted successfully', recordId: result.recordId }, 201);
  } catch (error: any) {
    console.error('API POST /api/evaluations error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
