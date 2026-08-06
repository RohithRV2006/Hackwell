import { NextRequest } from 'next/server';
import { apiSuccess, apiError, verifySessionAndGetRole } from '@/lib/api-utils';
import { getRoles } from '@/lib/firestore-helpers';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const roles = await getRoles();
    return apiSuccess({ roles, total: roles.length });
  } catch (error: any) {
    console.error('API GET /api/roles error:', error);
    return apiError(error.message || 'Failed to fetch roles', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifySessionAndGetRole(request);
    if (!user || user.role !== 'admin') {
      return apiError('Unauthorized - Admin access required', 401);
    }

    const body = await request.json();
    if (!body.email || !body.role) {
      return apiError('email and role are required');
    }

    const email = body.email.toLowerCase().trim();
    const db = getAdminDb();

    await db.collection('roles').doc(email).set({
      role: body.role,
      name: body.name || '',
      juryId: body.juryId || email,
      assignedLabId: body.assignedLabId || '',
      createdAt: new Date().toISOString(),
    });

    return apiSuccess({ message: 'Role created successfully', email }, 201);
  } catch (error: any) {
    console.error('API POST /api/roles error:', error);
    return apiError(error.message || 'Internal server error', 500);
  }
}
