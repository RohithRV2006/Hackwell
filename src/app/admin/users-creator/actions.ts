'use server';

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/app/admin/actions';
import { encryptJSON } from '@/lib/encryption';

export interface AdminUser {
  email: string;
  role: string;
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
    const roleDocs: Record<string, string> = {};
    
    snapshot.docs.forEach(doc => {
      roleDocs[doc.id] = doc.data().role || 'unknown';
    });

    const users: AdminUser[] = authUsers
      .filter(user => user.email) // Ensure they have an email
      .map(user => ({
        email: user.email as string,
        role: roleDocs[user.email as string] || 'team'
      }));

    return { success: true, users };
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return { success: false, error: error.message || 'Failed to fetch users' };
  }
}

export async function createUserAdmin(email: string, password: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const valid = await verifyAdminSession();
    if (!valid) return { success: false, error: 'Unauthorized' };

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Ensure the email doesn't already exist in roles
    const docRef = db.collection('roles').doc(email);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return { success: false, error: 'User already exists in roles database' };
    }

    // 1. Create Firebase Auth user
    try {
      await auth.createUser({
        email,
        password,
      });
    } catch (authErr: any) {
      // If user already exists in auth but not in roles, we might just want to update roles
      if (authErr.code !== 'auth/email-already-exists') {
        throw authErr;
      }
      // If it exists in auth but not roles, we'll just link the role below
    }

    // 2. Encrypt credentials and store in roles
    const encryptedCreds = encryptJSON({ password });
    await docRef.set({
      role,
      encryptedCreds
    });

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

    // 1. Delete from Roles DB
    await db.collection('roles').doc(email).delete();

    // 2. Delete from Auth (if possible)
    try {
      const userRecord = await auth.getUserByEmail(email);
      await auth.deleteUser(userRecord.uid);
    } catch (authErr: any) {
      // If user doesn't exist in Auth, just ignore
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
