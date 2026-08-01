'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/app/admin/actions';
import { encryptJSON, decryptJSON } from '@/lib/encryption';

export interface AdminUser {
  email: string;
  role: string;
  name?: string;
  department?: string;
  institution?: string;
  userId?: string;
}

export async function getAllUsersAdmin(): Promise<{ success: boolean; users?: AdminUser[]; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const auth = getAdminAuth();
    const db = getAdminDb();

    // Fetch all users from Firebase Auth
    const listUsersResult = await auth.listUsers(1000);
    const authUsers = listUsersResult.users;

    // Fetch roles from Firestore
    const snapshot = await db.collection('roles').get();
    const roleDocs: Record<string, { role: string; name?: string; department?: string; institution?: string }> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();

      const docId = doc.id.toLowerCase().trim();
      roleDocs[docId] = {
        role: data.role || 'unknown',
        name: data.name,
        department: data.department,
        institution: data.institution,
      };
    });

    const users: AdminUser[] = authUsers
      .filter(user => user.email)
      .map(user => {
        const userEmail = (user.email as string).toLowerCase().trim();
        return {
          email: user.email as string,
          role: roleDocs[userEmail]?.role || 'team',
          name: roleDocs[userEmail]?.name,
          department: roleDocs[userEmail]?.department,
          institution: roleDocs[userEmail]?.institution,
          userId: user.uid,
        };
      });

    return { success: true, users };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message || 'Failed to fetch users' };
  }
}

/**
 * Create a Jury member login.
 * - Creates Firebase Auth user
 * - Stores role + profile in `roles` collection (keyed by email)
 * - Stores jury profile in `jury` collection
 */
export async function createJuryUser(
  name: string,
  institution: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!name?.trim() || !institution?.trim() || !email?.trim() || !password?.trim()) {
      return { success: false, error: 'All fields (name, institution, email, password) are required.' };
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Check for duplicate in roles
    const roleDocRef = db.collection('roles').doc(email.toLowerCase().trim());
    const roleDocSnap = await roleDocRef.get();
    if (roleDocSnap.exists) {
      return { success: false, error: `A user with email "${email}" already exists.` };
    }

    // Create Firebase Auth user
    try {
      await auth.createUser({ email: email.trim(), password });
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
    }

    const now = new Date();
    const encryptedCreds = encryptJSON({ password });

    // Write to roles collection
    await roleDocRef.set({
      role: 'jury',
      name: name.trim(),
      institution: institution.trim(),
      encryptedCreds,
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating jury user:', error);
    return { success: false, error: error.message || 'Failed to create jury user' };
  }
}

/**
 * Create a Student Coordinator login.
 */
export async function createStudentCoordUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return { success: false, error: 'All fields (name, email, password) are required.' };
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    const roleDocRef = db.collection('roles').doc(email.toLowerCase().trim());
    const roleDocSnap = await roleDocRef.get();
    if (roleDocSnap.exists) {
      return { success: false, error: `A user with email "${email}" already exists.` };
    }

    try {
      await auth.createUser({ email: email.trim(), password });
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
    }

    const now = new Date();
    const encryptedCreds = encryptJSON({ password });

    await roleDocRef.set({
      role: 'student-coord',
      name: name.trim(),
      encryptedCreds,
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating student coordinator:', error);
    return { success: false, error: error.message || 'Failed to create student coordinator' };
  }
}

/**
 * Create a Faculty Coordinator login.
 */
export async function createFacultyCoordUser(
  name: string,
  department: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!name?.trim() || !department?.trim() || !email?.trim() || !password?.trim()) {
      return { success: false, error: 'All fields (name, department, email, password) are required.' };
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    const roleDocRef = db.collection('roles').doc(email.toLowerCase().trim());
    const roleDocSnap = await roleDocRef.get();
    if (roleDocSnap.exists) {
      return { success: false, error: `A user with email "${email}" already exists.` };
    }

    try {
      await auth.createUser({ email: email.trim(), password });
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
    }

    const now = new Date();
    const encryptedCreds = encryptJSON({ password });

    await roleDocRef.set({
      role: 'faculty-coord',
      name: name.trim(),
      department: department.trim(),
      encryptedCreds,
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating faculty coordinator:', error);
    return { success: false, error: error.message || 'Failed to create faculty coordinator' };
  }
}

/**
 * Legacy generic create (kept for backward compatibility / admin role creation).
 */
export async function createUserAdmin(
  email: string,
  password: string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const auth = getAdminAuth();

    const docRef = db.collection('roles').doc(email.toLowerCase().trim());
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { success: false, error: 'User already exists in roles database' };
    }

    try {
      await auth.createUser({ email, password });
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
    }

    const encryptedCreds = encryptJSON({ password });
    await docRef.set({ role, encryptedCreds, createdAt: new Date() });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message || 'Failed to create user' };
  }
}

export async function deleteUserAdmin(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Get role before deleting so we can clean up sub-collections
    const roleDoc = await db.collection('roles').doc(email.toLowerCase()).get();
    const role = roleDoc.data()?.role;

    // 1. Delete from roles collection
    await db.collection('roles').doc(email.toLowerCase()).delete();

    // 3. Delete from Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.deleteUser(userRecord.uid);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') {
        console.error('Failed to delete auth user', authErr);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}
