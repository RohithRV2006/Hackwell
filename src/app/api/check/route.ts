import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const db = getAdminDb();
  const snap = await db.collection('roles').get();
  const data = snap.docs.map(doc => ({ id: doc.id, role: doc.data().role }));
  return NextResponse.json(data);
}
