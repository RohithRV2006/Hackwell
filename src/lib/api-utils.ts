import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from './firebase-admin';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  role: string;
  name?: string;
  juryId?: string;
  assignedLabId?: string;
}

export function apiSuccess(data: any, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function requireRole(allowedRoles: string[], userRole: string): boolean {
  if (allowedRoles.includes('admin') && userRole === 'admin') return true;
  return allowedRoles.includes(userRole);
}

export async function verifySessionAndGetRole(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    let decodedToken: any = null;

    if (sessionCookie) {
      try {
        decodedToken = await getAdminAuth().verifySessionCookie(sessionCookie, true);
      } catch {
        // Fallback to checking idToken in Authorization header
      }
    }

    if (!decodedToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
      }
    }

    if (!decodedToken || !decodedToken.email) {
      return null;
    }

    const email = decodedToken.email.toLowerCase();
    const db = getAdminDb();

    // Check roles collection
    const roleDoc = await db.collection('roles').doc(email).get();
    let role = 'user';
    let name = '';
    let juryId = '';
    let assignedLabId = '';

    if (roleDoc.exists) {
      const data = roleDoc.data() || {};
      role = data.role || 'user';
      name = data.name || '';
      juryId = data.juryId || email;
      assignedLabId = data.assignedLabId || '';
    } else {
      // Default hardcoded admin check
      const adminEmail = (process.env.ADMIN_EMAIL || 'nidthishselvan@gmail.com').toLowerCase();
      if (email === adminEmail) {
        role = 'admin';
      }
    }

    return {
      uid: decodedToken.uid || email,
      email,
      role,
      name,
      juryId,
      assignedLabId,
    };
  } catch (error) {
    console.error('Error verifying API session:', error);
    return null;
  }
}
