import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getFinalLabs } from '@/lib/firestore-helpers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const finalLabs = await getFinalLabs();
    return apiSuccess({ finalLabs, total: finalLabs.length });
  } catch (error: any) {
    console.error('API GET /api/final-labs error:', error);
    return apiError(error.message || 'Failed to fetch final labs', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const body = await request.json();
    if (!body.labName) {
      return apiError('labName is required');
    }

    const db = getAdminDb();
    const labId = body.labId || `final_lab_${Date.now()}`;

    await db.collection('finalLabs').doc(labId).set({
      labName: body.labName,
      labCode: body.labCode || '',
      capacity: typeof body.capacity === 'number' ? body.capacity : 25,
      coordinator: body.coordinator || 'Unassigned',
      currentTeamCount: typeof body.currentTeamCount === 'number' ? body.currentTeamCount : 0,
      createdAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Final lab created successfully', labId }, 201);
  } catch (error: any) {
    console.error('API POST /api/final-labs error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
