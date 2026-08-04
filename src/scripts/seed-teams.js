/* eslint-disable @typescript-eslint/no-require-imports */
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Load .env.local manually
const envPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase env variables in .env.local");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();

async function seedTeams() {
  console.log("Seeding 50 dummy teams into Firestore...");
  const teamsSnap = await db.collection('teams').get();
  const existingCount = teamsSnap.size;
  console.log(`Current teams in database: ${existingCount}`);

  const depts = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'AIDS', 'AIML'];
  const problemStatements = [
    'AI-Powered Smart Health Monitoring System',
    'Blockchain-Based Secure Voting System',
    'Autonomous Traffic Signal Management Using Computer Vision',
    'IoT-Based Smart Agriculture and Soil Quality Analyzer',
    'Cybersecurity Threat Detection Using Machine Learning',
    'Automated Resume Parser and Job Matching Platform',
    'Smart Waste Management System for Cities',
    'AI Personal Finance and Expense Tracker',
    'E-Learning Analytics and Dropout Prediction',
    'Disaster Management & Emergency Response Network',
  ];

  const now = new Date();
  const batchSize = 400;
  let batch = db.batch();
  let opCount = 0;
  let createdCount = 0;

  const startIndex = existingCount + 1;
  const count = 50;

  for (let i = startIndex; i < startIndex + count; i++) {
    const teamId = `dummy_team_${String(i).padStart(3, '0')}`;
    const docRef = db.collection('teams').doc(teamId);

    const dept = depts[i % depts.length];
    const ps = problemStatements[i % problemStatements.length];

    const teamData = {
      teamName: `Dummy Team ${String(i).padStart(3, '0')}`,
      displayId: `TEAM-${1000 + i}`,
      problemStatement: ps,
      leadEmail: `lead_team${i}@example.com`,
      leadData: {
        name: `Lead Student ${i}`,
        contactNumber: `98765${String(10000 + i).slice(0, 5)}`,
        department: dept,
        year: '3rd Year',
        section: 'A',
        batchNumber: `BATCH-2026-${i}`,
      },
      membersData: [
        {
          name: `Member 1 of Team ${i}`,
          department: dept,
          year: '3rd Year',
          section: 'A',
          batchNumber: `BATCH-2026-${i}-M1`,
        },
        {
          name: `Member 2 of Team ${i}`,
          department: dept,
          year: '3rd Year',
          section: 'B',
          batchNumber: `BATCH-2026-${i}-M2`,
        },
      ],
      labNo: 'Unassigned',
      judge: 'Unassigned',
      prelimsAverageScore: 0,
      prelimsStatus: 'pending',
      finaleQualified: false,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(docRef, teamData, { merge: true });
    opCount++;
    createdCount++;

    if (opCount === batchSize) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  console.log(`Successfully seeded ${createdCount} dummy teams!`);
  const finalSnap = await db.collection('teams').get();
  console.log(`Total teams in database now: ${finalSnap.size}`);
  process.exit(0);
}

seedTeams().catch((err) => {
  console.error("Error seeding teams:", err);
  process.exit(1);
});
