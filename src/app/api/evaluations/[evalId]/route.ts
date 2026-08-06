import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole, requireRole } from '@/lib/api-utils';
import { patchEvalRecord, removeEvalRecord } from '@/lib/firestore-helpers';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || !requireRole(['admin', 'jury'], user.role)) {
      return apiError('Unauthorized', 401);
    }

    const { evalId } = await params;
    const body = await request.json();
    const round = (body.round || (evalId.startsWith('finale_') ? 'finale' : 'prelims')) as 'prelims' | 'finale';

    const result = await patchEvalRecord(round, evalId, body);
    if (!result.success) {
      return apiError(result.error || 'Failed to patch evaluation record', 400);
    }

    return apiSuccess({ message: 'Evaluation record patched successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/evaluations/[evalId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ evalId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { evalId } = await params;
    const { searchParams } = new URL(request.url);
    const round = (searchParams.get('round') || (evalId.startsWith('finale_') ? 'finale' : 'prelims')) as 'prelims' | 'finale';

    const result = await removeEvalRecord(round, evalId);
    if (!result.success) {
      return apiError(result.error || 'Failed to remove evaluation record', 400);
    }

    return apiSuccess({ message: 'Evaluation record deleted successfully' });
  } catch (error: any) {
    console.error('API DELETE /api/evaluations/[evalId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
