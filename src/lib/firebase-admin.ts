import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else {
      console.warn('Firebase Admin is not fully configured in env vars. Initializing with default application default credentials if available.');
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const getAdminAuth = () => getAuth();
export const getAdminDb = () => getFirestore();
