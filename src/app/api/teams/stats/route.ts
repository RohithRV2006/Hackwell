import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-utils';
import { getAdminDb } from '@/lib/firebase-admin';
import { ALL_DOMAIN_DOC_IDS, DOMAIN_SLUGS } from '@/lib/firestore-helpers';

export async function GET(request: NextRequest) {
  try {
    const db = getAdminDb();
    const snaps = await Promise.all(
      ALL_DOMAIN_DOC_IDS.map((id) => db.collection('teams').doc(id).get())
    );

    const stats: Record<string, number> = {};
    let total = 0;

    snaps.forEach((snap) => {
      if (snap.exists) {
        const count = snap.data()?.teamCount || snap.data()?.teams?.length || 0;
        stats[snap.id] = count;
        total += count;
      } else {
        stats[snap.id] = 0;
      }
    });

    return apiSuccess({ stats, total });
  } catch (error: any) {
    console.error('API GET /api/teams/stats error:', error);
    return apiError(error.message || 'Failed to fetch team stats', 500);
  }
}
