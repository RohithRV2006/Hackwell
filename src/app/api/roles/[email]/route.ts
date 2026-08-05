import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getAdminDb } from '@/lib/firebase-admin';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { email } = await params;
    const body = await request.json();
    const targetEmail = decodeURIComponent(email).toLowerCase().trim();

    const db = getAdminDb();
    await db.collection('roles').doc(targetEmail).update({
      ...body,
      updatedAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Role updated successfully' });
  } catch (error: any) {
    console.error('API PATCH /api/roles/[email] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const { email } = await params;
    const targetEmail = decodeURIComponent(email).toLowerCase().trim();

    const db = getAdminDb();
    await db.collection('roles').doc(targetEmail).delete();

    return apiSuccess({ message: 'Role deleted successfully' });
  } catch (error: any) {
    console.error('API DELETE /api/roles/[email] error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
