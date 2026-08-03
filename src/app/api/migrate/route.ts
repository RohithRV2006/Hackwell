import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const db = getAdminDb();
    
    console.log("Migrating roles...");
    const legacyCollections = ['jury', 'studentCoords', 'facultyCoords', 'coordinators'];
    const rolesMap: Record<string, string> = {
      'jury': 'jury',
      'studentCoords': 'coordinator',
      'facultyCoords': 'coordinator',
      'coordinators': 'coordinator'
    };

    const batch = db.batch();
    let opsCount = 0;

    for (const collection of legacyCollections) {
      const snap = await db.collection(collection).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        if (!data.email) continue;
        const email = data.email.toLowerCase();
        
        const roleRef = db.collection('roles').doc(email);
        const roleSnap = await roleRef.get();
        
        if (!roleSnap.exists) {
          batch.set(roleRef, {
            role: rolesMap[collection],
            name: data.juryName || data.name || email.split('@')[0],
            createdAt: new Date(),
            migratedFrom: collection
          });
          opsCount++;
        }
        batch.delete(doc.ref);
        opsCount++;

        if (opsCount >= 400) {
          await batch.commit();
          opsCount = 0;
        }
      }
    }
    
    if (opsCount > 0) {
      await batch.commit();
      opsCount = 0;
    }
    console.log("Roles migration completed.");

    console.log("Migrating evaluations...");
    const collections = [
      { name: 'prelimsEvaluations', round: 'prelims' },
      { name: 'finaleEvaluations', round: 'finale' },
      { name: 'juryEvaluations', round: 'prelims' }
    ];

    for (const col of collections) {
      const snap = await db.collection(col.name).get();
      for (const doc of snap.docs) {
        const data = doc.data();
        const juryId = data.juryId || 'unknown';
        const teamId = data.teamId || data.teamName || 'unknown';
        
        const newDocId = `${col.round}_${juryId}_${teamId}`;
        const newRef = db.collection('evaluations').doc(newDocId);
        
        batch.set(newRef, {
          ...data,
          round: col.round,
          migratedFrom: col.name
        });
        batch.delete(doc.ref);
        opsCount += 2;

        if (opsCount >= 400) {
          await batch.commit();
          opsCount = 0;
        }
      }
    }

    if (opsCount > 0) {
      await batch.commit();
    }
    console.log("Evaluations migration completed.");

    return NextResponse.json({ success: true, message: 'Migration successful' });
  } catch (error: any) {
    console.error('Migration failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
