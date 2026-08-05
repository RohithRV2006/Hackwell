/* eslint-disable @typescript-eslint/no-require-imports */
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.join(__dirname, '../../service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error("No service-account.json found. Aborting migration.");
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateRoles() {
  console.log("Migrating roles...");
  const legacyCollections = ['jury', 'studentCoords', 'facultyCoords', 'coordinators'];
  const rolesMap = {
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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
  }
  console.log("Roles migration completed.");
}

async function migrateEvaluations() {
  console.log("Migrating evaluations...");
  const collections = [
    { name: 'prelimsEvaluations', round: 'prelims' },
    { name: 'finaleEvaluations', round: 'finale' },
    { name: 'juryEvaluations', round: 'prelims' } // mapping juryEvaluations to prelims
  ];

  const batch = db.batch();
  let opsCount = 0;

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
}

async function run() {
  try {
    await migrateRoles();
    await migrateEvaluations();
    console.log("Migration finished successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
