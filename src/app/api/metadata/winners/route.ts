import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getWinners } from '@/lib/firestore-helpers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const winners = await getWinners();
    return apiSuccess({ winners });
  } catch (error: any) {
    console.error('API GET /api/metadata/winners error:', error);
    return apiError(error.message || 'Failed to fetch winners', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const body = await request.json();
    if (!Array.isArray(body.winners)) {
      return apiError('winners array is required');
    }

    const db = getAdminDb();
    await db.collection('metadata').doc('eventWinners').set({
      winners: body.winners,
      publishedAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Winners published successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/metadata/winners error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
