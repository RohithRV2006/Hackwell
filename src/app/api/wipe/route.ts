import { NextResponse } from 'next/server';
import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { verifyAdminSession } from '@/app/admin/actions';
import { ALL_DOMAIN_DOC_IDS, DOMAIN_SLUGS } from '@/lib/firestore-helpers';

export async function GET() {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();

  // Reset 5 domain docs
  for (const domainId of ALL_DOMAIN_DOC_IDS) {
    await db.collection('teams').doc(domainId).set({
      domainId,
      domainName: DOMAIN_SLUGS[domainId]?.name || 'Domain',
      teamCount: 0,
      updatedAt: new Date(),
      teams: [],
    });
  }

  // Reset 2 evaluation docs
  await db.collection('evaluations').doc('prelims').set({
    round: 'prelims',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });

  await db.collection('evaluations').doc('finale').set({
    round: 'finale',
    totalCount: 0,
    updatedAt: new Date(),
    records: [],
  });

  // Re-seed default admins
  const admins = [
    { email: 'rohithrv2006@gmail.com' },
    { email: 'nidthishselvam@gmail.com' },
    { email: 'nidthishselvan@gmail.com' },
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
      createdAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true, message: 'Database wiped and domain/evaluation docs re-initialized.' });
}
