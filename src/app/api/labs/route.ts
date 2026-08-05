import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getLabs } from '@/lib/firestore-helpers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const labs = await getLabs();
    return apiSuccess({ labs, total: labs.length });
  } catch (error: any) {
    console.error('API GET /api/labs error:', error);
    return apiError(error.message || 'Failed to fetch labs', 500);
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
    const labId = body.labId || `lab_${Date.now()}`;

    await db.collection('labs').doc(labId).set({
      labName: body.labName,
      labCode: body.labCode || '',
      assignedJuryName: body.assignedJuryName || 'Unassigned',
      assignedTheme: body.assignedTheme || '',
      currentTeamCount: typeof body.currentTeamCount === 'number' ? body.currentTeamCount : 0,
      createdAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Lab created successfully', labId }, 201);
  } catch (error: any) {
    console.error('API POST /api/labs error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
