import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');

function encryptJSON(data: any) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const jsonStr = JSON.stringify(data);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export async function GET() {
  const db = getAdminDb();
  const collections = ['teams', 'jury', 'studentCoords', 'facultyCoords', 'prelimsEvaluations', 'finaleEvaluations', 'gameScores', 'roles', 'metadata'];
  
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
  
  for (const adminUser of admins) {
    const encryptedCreds = encryptJSON({ password: adminUser.pass });
    await db.collection('roles').doc(adminUser.email).set({
      role: 'admin',
      encryptedCreds: encryptedCreds,
      createdAt: new Date()
    });
  }
  
  return NextResponse.json({ success: true, deleted: deletedCount, seeded: admins.length });
}
