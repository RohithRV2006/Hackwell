'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession, getCachedDocs, invalidateCollectionCache } from '@/app/admin/actions';
import { getRoles } from '@/lib/firestore-helpers';
import { encryptJSON, decryptJSON } from '@/lib/encryption';
import { isAdminEmail } from '@/app/actions/session';

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
    const rolesList = await getRoles();
    const roleDocs: Record<string, { role: string; name?: string; department?: string; institution?: string }> = {};

    rolesList.forEach((r: any) => {
      const docId = (r.email || '').toLowerCase().trim();
      roleDocs[docId] = {
        role: r.role || 'unknown',
        name: r.name,
        department: r.department,
        institution: r.institution,
      };
    });

    const userPromises = authUsers
      .filter(user => user.email)
      .map(async user => {
        const userEmail = (user.email as string).toLowerCase().trim();
        let userRole = roleDocs[userEmail]?.role;
        const isAdmin = await isAdminEmail(userEmail);
        if (isAdmin) {
          userRole = 'admin';
        } else if (!userRole) {
          userRole = 'team';
        }

        return {
          email: user.email as string,
          role: userRole,
          name: roleDocs[userEmail]?.name,
          department: roleDocs[userEmail]?.department,
          institution: roleDocs[userEmail]?.institution,
          userId: user.uid,
        };
      });

    const users = await Promise.all(userPromises);

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
    let uid = '';
    try {
      const userRecord = await auth.createUser({ email: email.trim(), password });
      uid = userRecord.uid;
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
      const existingUser = await auth.getUserByEmail(email.trim());
      uid = existingUser.uid;
    }
    await auth.setCustomUserClaims(uid, { role: 'jury' });

    const now = new Date();

    // Write to roles collection
    await roleDocRef.set({
      role: 'jury',
      name: name.trim(),
      institution: institution.trim(),
      createdAt: now,
    });

    invalidateCollectionCache('roles');

    return { success: true };
  } catch (error: any) {
    console.error('Error creating jury user:', error);
    return { success: false, error: error.message || 'Failed to create jury user' };
  }
}

/**
 * Create a Coordinator login.
 */
export async function createCoordinatorUser(
  name: string,
  department: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return { success: false, error: 'Name, email, and password are required.' };
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    const roleDocRef = db.collection('roles').doc(email.toLowerCase().trim());
    const roleDocSnap = await roleDocRef.get();
    if (roleDocSnap.exists) {
      return { success: false, error: `A user with email "${email}" already exists.` };
    }

    let uid = '';
    try {
      const userRecord = await auth.createUser({ email: email.trim(), password });
      uid = userRecord.uid;
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
      const existingUser = await auth.getUserByEmail(email.trim());
      uid = existingUser.uid;
    }
    await auth.setCustomUserClaims(uid, { role: 'coordinator' });

    const now = new Date();

    await roleDocRef.set({
      role: 'coordinator',
      name: name.trim(),
      department: department?.trim() || '',
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error creating coordinator:', error);
    return { success: false, error: error.message || 'Failed to create coordinator' };
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

    let uid = '';
    try {
      const userRecord = await auth.createUser({ email, password });
      uid = userRecord.uid;
    } catch (authErr: any) {
      if (authErr.code !== 'auth/email-already-exists') throw authErr;
      const existingUser = await auth.getUserByEmail(email);
      uid = existingUser.uid;
    }
    await auth.setCustomUserClaims(uid, { role });

    await docRef.set({ role, createdAt: new Date() });

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

    // 2. Delete from specific collections based on role
    if (role === 'jury') {
      const juryName = roleDoc.data()?.name || '';
      
      // Unassign deleted Jury from labs
      if (juryName) {
        const labsSnap = await db.collection('labs').get();
        const labBatch = db.batch();
        let labCount = 0;
        labsSnap.docs.forEach((labDoc) => {
          if (labDoc.data().assignedJuryName?.toLowerCase() === juryName.toLowerCase()) {
            labBatch.update(labDoc.ref, { assignedJuryName: 'Unassigned', updatedAt: new Date() });
            labCount++;
          }
        });
        if (labCount > 0) {
          await labBatch.commit();
        }
      }
    }

    // 3. Delete from Firebase Auth
    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.deleteUser(userRecord.uid);
    } catch (authErr: any) {
      if (authErr.code !== 'auth/user-not-found') {
        console.error('Failed to delete auth user', authErr);
      }
    }

    invalidateCollectionCache('roles');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}
