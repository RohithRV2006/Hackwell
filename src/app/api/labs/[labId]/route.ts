import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getAdminDb } from '@/lib/firebase-admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ labId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { labId } = await params;
    const body = await request.json();

    const db = getAdminDb();
    await db.collection('labs').doc(labId).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Lab updated successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/labs/[labId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ labId: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { labId } = await params;

    const db = getAdminDb();
    await db.collection('labs').doc(labId).delete();

    return apiSuccess({ message: 'Lab deleted successfully' });
  } catch (error: any) {
    console.error('API DELETE /api/labs/[labId] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
