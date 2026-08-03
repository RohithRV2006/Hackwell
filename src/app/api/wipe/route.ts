import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/app/admin/actions';

export async function GET() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const collections = ['teams', 'evaluations', 'gameScores', 'roles', 'metadata'];
  
  let deletedCount = 0;
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    let batch = db.batch();
    let count = 0;
    
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
    deletedCount += snapshot.docs.length;
  }
  
  const admins = [
    { email: 'rohithrv2006@gmail.com', pass: 'My.kaumodaki7' },
    { email: 'nidthishselvam@gmail.com', pass: 'Nidthish@123' }
  ];
  
  const auth = getAdminAuth();
  for (const adminUser of admins) {
    try {
      const userRecord = await auth.getUserByEmail(adminUser.email);
      await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
    } catch (e: any) {
      console.warn(`Could not set claim for admin ${adminUser.email}:`, e.message);
    }

    await db.collection('roles').doc(adminUser.email).set({
      role: 'admin',
      createdAt: new Date()
    });
  }
  
  return NextResponse.json({ success: true, deleted: deletedCount, seeded: admins.length });
}
