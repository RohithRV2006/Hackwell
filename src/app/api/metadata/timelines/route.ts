import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getEventTimelines } from '@/lib/firestore-helpers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const timelines = await getEventTimelines();
    return apiSuccess({ timelines });
  } catch (error: any) {
    console.error('API GET /api/metadata/timelines error:', error);
    return apiError(error.message || 'Failed to fetch timelines', 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const body = await request.json();
    const db = getAdminDb();

    await db.collection('metadata').doc('eventTimelines').set(
      {
        ...body,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return apiSuccess({ message: 'Timelines updated successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/metadata/timelines error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
