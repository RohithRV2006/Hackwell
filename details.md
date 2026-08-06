# ⚙️ Hackwell 2.0 — Complete Backend & Firebase Implementation Guide

This document provides a comprehensive technical blueprint of the **Hackwell 2.0** hackathon management platform's backend architecture, Firebase Firestore schema, authentication mechanisms, data transformation engines, REST API endpoints, and utility scripts. Using this guide, a developer can completely replicate the entire backend infrastructure and data layer from scratch.

---

## 📋 Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Environment Configuration & Dependencies](#2-environment-configuration--dependencies)
3. [Firebase Initialization & Administration](#3-firebase-initialization--administration)
4. [Firestore Database Architecture & Schema](#4-firestore-database-architecture--schema)
5. [Authentication & Role-Based Access Control (RBAC)](#5-authentication--role-based-access-control-rbac)
6. [Data Encryption & Security Layer](#6-data-encryption--security-layer)
7. [Core Firestore Helper Functions](#7-core-firestore-helper-functions)
8. [Backend Server Actions](#8-backend-server-actions)
9. [Automated Admin Pipeline Algorithms](#9-automated-admin-pipeline-algorithms)
10. [Google Apps Script & Drive Integration](#10-google-apps-script--drive-integration)
11. [REST API Layer Specification](#11-rest-api-layer-specification)
12. [Database Migration & Maintenance Scripts](#12-database-migration--maintenance-scripts)
13. [Step-by-Step Replication Checklist](#13-step-by-step-replication-checklist)

---

## 1. System Architecture Overview

Hackwell 2.0 is built on the **Next.js App Router paradigm**, utilizing Node.js asynchronous runtime, React Server Components, and Server Actions for secure backend execution.

### Architectural Highlights
- **Firestore Read-Cost Optimization (5 Domain Docs / 2 Round Docs):** Instead of storing hundreds of isolated documents, all hackathon teams are consolidated into **5 domain-specific documents** under the `teams` collection, and all scores are consolidated into **2 round-specific documents** under `evaluations`. This reduces Firestore read operations by over 95%.
- **Decoupled Auth State & HTTP-Only Session Cookies:** Firebase Client Auth handles initial login, while Firebase Admin SDK mints secure, server-side HTTP-Only session cookies (40-minute TTL) for all protected routes and API calls.
- **Strict Server-Side Authorization:** Route access is guarded at the middleware (`src/proxy.ts`) and layout/action levels. User roles are fetched server-side from Firestore or verified via in-memory role caching.
- **Transactional Consistency:** Critical state mutations (team registration counters, evaluation record upserts, lab assignment counts) execute within Firestore transactions (`db.runTransaction`) to guarantee atomic consistency under high concurrent load.

```
                      +----------------------------------+
                      |       Client Browser Request     |
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |     Next.js Middleware Proxy     |
                      |          (src/proxy.ts)          |
                      +----------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
      +------------------------+              +------------------------+
      |  Server Actions (POST) |              |  REST API Handler (GET)|
      | (src/app/actions/*.ts) |              |  (src/app/api/*/route) |
      +------------------------+              +------------------------+
                   |                                       |
                   +-------------------+-------------------+
                                       |
                                       v
                      +----------------------------------+
                      |   Firebase Admin SDK (Node.js)   |
                      |   (src/lib/firebase-admin.ts)    |
                      +----------------------------------+
                                       |
                                       v
                      +----------------------------------+
                      |     Google Firestore Database    |
                      |  (5 Domain Docs / 2 Round Docs)  |
                      +----------------------------------+
```

---

## 2. Environment Configuration & Dependencies

### Core Node.js Dependencies (`package.json`)
```json
{
  "dependencies": {
    "firebase": "^12.16.0",
    "firebase-admin": "^14.2.0",
    "googleapis": "^173.0.0",
    "next": "16.2.12",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.4.3"
  }
}
```

### Environment Variables (`.env.local`)

To run the backend, create a `.env.local` file with the following keys:

| Environment Variable | Scope | Description |
|----------------------|-------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client & Server | Firebase Project Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Firebase Auth Domain (e.g. `app.firebaseapp.com`) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client & Server | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Firebase Storage Bucket URI |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Firebase Cloud Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | Firebase App Identifier |
| `FIREBASE_CLIENT_EMAIL` | Server-Only | Service Account Client Email |
| `FIREBASE_PRIVATE_KEY` | Server-Only | Service Account Private Key (with `\n` line breaks) |
| `ENCRYPTION_KEY` | Server-Only | 64-character hex string (32 bytes) for AES-256-GCM encryption |
| `ADMIN_EMAIL` | Server-Only | Primary Super-Admin fallback email address |
| `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` | Client & Server | Google Apps Script Web App deployment URL for Drive PPT uploads |

---

## 3. Firebase Initialization & Administration

### 3.1 Client-Side Initialization (`src/lib/firebase.ts`)
Ensures singleton initialization of Firebase Web App instance.

```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

### 3.2 Server-Side Admin SDK Initialization (`src/lib/firebase-admin.ts`)
Initializes `firebase-admin` using Service Account credentials. Handles string replacement for newline escape characters in private keys.

```typescript
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
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export const getAdminAuth = () => getAuth();
export const getAdminDb = () => getFirestore();
```

---

## 4. Firestore Database Architecture & Schema

The database consists of **7 top-level Firestore collections**.

```
Firestore Root
 ├── teams/                      (5 Domain Documents containing teams[] arrays)
 │    ├── autonomous-agentic-ai
 │    ├── adaptive-intelligent-systems
 │    ├── predictive-logistics-industrial-ai
 │    ├── ai-smart-business-solution
 │    └── human-centered-ai
 ├── evaluations/                (2 Round Documents containing records[] arrays)
 │    ├── prelims
 │    └── finale
 ├── roles/                      (Doc ID = lowercase user email)
 ├── labs/                       (Prelims venue documents)
 ├── finalLabs/                  (Finale venue documents)
 ├── gameScores/                 (Log of awarded Game XP entries)
 └── metadata/                   (Singleton configuration documents)
      ├── teamCounter            (Sequential team ID counter)
      ├── eventTimelines         (Phase timeline state & gating)
      └── eventWinners           (Finalists and winner standings)
```

---

### 4.1 Collection: `teams` (5 Domain Documents Architecture)

Instead of individual documents per team, teams are grouped into **5 fixed domain documents** matching event problem tracks.

#### Domain Document IDs & Track Mapping (`src/lib/firestore-helpers.ts`):
1. `autonomous-agentic-ai`: Autonomous Agentic AI
2. `adaptive-intelligent-systems`: Adaptive Intelligent Systems
3. `predictive-logistics-industrial-ai`: Predictive Logistics using Industrial AI
4. `ai-smart-business-solution`: AI for Smart Business Solution
5. `human-centered-ai`: Human Centered AI

#### Domain Document Structure:
```json
{
  "domainId": "autonomous-agentic-ai",
  "domainName": "Autonomous Agentic AI",
  "teamCount": 42,
  "updatedAt": "2026-08-06T09:00:00.000Z",
  "teams": [ /* Array of Team Data Objects */ ]
}
```

#### Team Data Object Schema:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | `string` | Unique team identifier (e.g. `team_1722934800000_abc12`) |
| `displayId` | `string` | Human-readable sequential ID (e.g. `H2O-001`, `H2O-042`) |
| `teamName` | `string` | Official team name |
| `teamNameLower` | `string` | Lowercase team name for case-insensitive indexing |
| `theme` | `string` | Registered domain/track name |
| `psId` | `string` | Problem Statement ID |
| `problemStatement` | `string` | Full title/description of problem statement |
| `leadEmail` | `string` | Team lead's lowercase email (Auth linkage) |
| `leadData` | `object` | `{ name, batchNumber, department, year, section, contactNumber, email }` |
| `membersData` | `array` | Array of member objects: `[{ name, batchNumber, department, year, section }]` |
| `allBatchNumbers` | `array` | Flattened list of lead & member batch numbers for duplicate validation |
| `pptLink` | `string \| null` | Google Drive web view URL of uploaded PPT |
| `pptDriveFileId` | `string \| null` | Google Drive file ID |
| `pptQualified` | `boolean` | `true` if passed Phase 2 PPT screening filter |
| `pptStatus` | `string` | `"submitted"` \| `"pending"` \| `"rejected"` |
| `venue` | `string \| null` | Prelims lab venue name |
| `labNo` | `string` | Prelims lab number (Default: `"Unassigned"`) |
| `assignedLabId` | `string` | Reference to `labs` document ID |
| `assignedLabName` | `string` | Denormalized lab name |
| `judge` | `string` | Assigned jury name/email (Default: `"Unassigned"`) |
| `score` | `number` | Prelims score |
| `feedback` | `string` | Qualitative feedback from jury |
| `eliminated` | `boolean` | Elimination flag |
| `eliminationReason` | `string` | Reason string if team is eliminated |
| `prelimsAverageScore`| `number` | Calculated average across all jury evaluations in Prelims |
| `prelimsStatus` | `string` | `"pending"` \| `"selected"` \| `"not_selected"` |
| `finaleQualified` | `boolean` | Flag indicating advancement to Finale round |
| `finalStatus` | `string` | `"pending"` \| `"completed"` \| `"not_qualified"` |
| `finalVenue` | `string \| null` | Finale lab venue assignment |
| `isWinner` | `boolean` | Flag set if team wins a prize rank |
| `winnerRank` | `number \| null` | 1 = 1st Place, 2 = 2nd Place, etc. |
| `winnerTitle` | `string \| null` | Prize title (e.g. `"Champion"`, `"Runner Up"`) |
| `totalGameXP` | `number` | Aggregated total of all awarded side-game XP |
| `createdAt` | `string` | ISO timestamp of registration |
| `updatedAt` | `string` | ISO timestamp of last update |

---

### 4.2 Collection: `evaluations` (2 Round Documents Architecture)

Evaluations are stored in **2 round documents**:
- `evaluations/prelims`
- `evaluations/finale`

#### Round Document Structure:
```json
{
  "round": "prelims",
  "totalCount": 84,
  "updatedAt": "2026-08-06T09:00:00.000Z",
  "records": [ /* Array of Evaluation Records */ ]
}
```

#### Evaluation Record Schema:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | `string` | Composite Key: `{round}_{juryId}_{teamId}` |
| `teamId` | `string` | Reference to team's `id` inside `teams[]` array |
| `teamName` | `string` | Denormalized team name |
| `displayId` | `string` | Denormalized team display ID |
| `juryId` | `string` | Jury email or role ID |
| `juryName` | `string` | Jury display name |
| `round` | `string` | `"prelims"` or `"finale"` |
| `rubric` | `object` | Criterion scores map (see Rubric breakdown below) |
| `totalScore` | `number` | Calculated sum of rubric criteria |
| `remarks` | `string` | Short remarks |
| `feedback` | `string` | Detailed jury feedback |
| `selectedForFinal` | `boolean` | Jury flag for recommending team to Finale |
| `selectionReason` | `string` | Reason for finale recommendation |
| `highlighted` | `boolean` | Starred/flagged evaluation indicator |
| `isFrozen` | `boolean` | `true` once submitted. Locked against further editing |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp |

#### Evaluation Rubric Criteria & Max Weightage:
```typescript
interface Rubric {
  conceptStrength: number;     // Max score: 12 (Idea originality & problem fit)
  buildIntelligence: number;   // Max score: 12 (Technical complexity & code quality)
  deliveryImpact: number;      // Max score: 8  (Demo readiness & practical impact)
  liveDefenseScore: number;    // Max score: 8  (Q&A performance)
  communication: number;       // Max score: 10 (Clarity & presentation quality)
}
// Max Total Score = 50 Points
```

---

### 4.3 Collection: `roles` (Privileged User Directory)

Stores access permissions for non-student users. 

> **Important Scaling Design:** Participant student teams are **not** saved in `roles`. Any authenticated user not found in `roles` defaults to the `"team"` role.

- **Document ID:** Lowercase user email (e.g. `jury1@example.com`).

| Field Name | Type | Description |
|------------|------|-------------|
| `role` | `string` | Role classification: `"admin"`, `"jury"`, or `"coordinator"` |
| `name` | `string` | Full name of user |
| `department` | `string` | Academic department |
| `institution` | `string` | Institution/college |
| `juryId` | `string` | *(Jury only)* Unique identifier used in evaluation composite keys |
| `juryName` | `string` | *(Jury only)* Display name on scorecards |
| `createdAt` | `timestamp` | Creation timestamp |

---

### 4.4 Collection: `labs` (Prelims Lab Venues)

- **Document ID:** Auto-generated Firestore ID or Lab ID (e.g. `LAB-01`).

| Field Name | Type | Description |
|------------|------|-------------|
| `labId` | `string` | Lab ID key |
| `labName` | `string` | Display lab name (e.g., `"Computer Lab 1"`) |
| `labCode` | `string` | Short lab code |
| `capacity` | `number` | Maximum team limit for lab |
| `assignedJuryId` | `string` | Email/ID of assigned jury |
| `assignedJuryName` | `string` | Display name of assigned jury |
| `assignedTheme` | `string` | Assigned domain track |
| `currentTeamCount` | `number` | Live count of teams allocated to lab |

---

### 4.5 Collection: `finalLabs` (Finale Lab Venues)

- **Document ID:** Auto-generated Firestore ID.

| Field Name | Type | Description |
|------------|------|-------------|
| `labId` | `string` | Lab ID key |
| `labName` | `string` | Display lab name |
| `labCode` | `string` | Short lab code |
| `capacity` | `number` | Maximum team capacity |
| `coordinator` | `string` | Assigned coordinator name/email |
| `currentTeamCount` | `number` | Live count of finale teams in lab |

---

### 4.6 Collection: `gameScores` (Side-Event Live XP Log)

- **Document ID:** Auto-generated Firestore ID.

| Field Name | Type | Description |
|------------|------|-------------|
| `teamId` | `string` | Target team ID |
| `studentCoordId` | `string` | Coordinator email awarding XP |
| `gameName` | `string` | Side event name |
| `xpAwarded` | `number` | XP point value awarded |
| `createdAt` | `timestamp` | Log timestamp |

---

### 4.7 Collection: `metadata` (Singleton Configurations)

Fixed document IDs housing global event states:

#### 1. Document `metadata/teamCounter`:
```json
{
  "count": 42
}
```
*Atomic transaction increments `count` to generate sequential display IDs (`H2O-001`, `H2O-002`, ...).*

#### 2. Document `metadata/eventTimelines`:
Controls stage gating across the platform UI.
```json
{
  "timeline1": {
    "name": "Phase 1 - Team Registration",
    "state": "active", // "upcoming" | "active" | "paused" | "ended"
    "enabled": true,
    "startDate": "2026-08-01T00:00:00.000Z",
    "endDate": "2026-08-10T23:59:59.000Z"
  },
  "timeline2": {
    "name": "Phase 2 - PPT Submission",
    "state": "active",
    "enabled": true,
    "startDate": "2026-08-11T00:00:00.000Z",
    "endDate": "2026-08-15T23:59:59.000Z",
    "pptFilterApplied": false
  },
  "timeline3": {
    "name": "Phase 3 - Prelims Round",
    "state": "upcoming",
    "enabled": true,
    "topTeamsToFinal": 20,
    "finalistsPromoted": false
  },
  "timeline4": {
    "name": "Phase 4 - Grand Finale",
    "state": "upcoming",
    "enabled": true,
    "winnerCount": 3
  }
}
```

#### 3. Document `metadata/eventWinners`:
```json
{
  "winners": [
    { "teamId": "team_123", "rank": 1, "title": "First Prize Champion" },
    { "teamId": "team_456", "rank": 2, "title": "Runner Up" }
  ],
  "updatedAt": "2026-08-06T09:00:00.000Z"
}
```

---

## 5. Authentication & Role-Based Access Control (RBAC)

Authentication combines Firebase Auth (Client) and HTTP-Only Session Cookies verified via Firebase Admin SDK.

### 5.1 Session Cookie Generation (`src/app/actions/session.ts`)

```typescript
'use server';

import { cookies } from 'next/headers';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

const ADMIN_EMAILS = new Set(['rohithrv2006@gmail.com', 'nidthishselvam@gmail.com']);

export async function createSessionCookie(idToken: string) {
  try {
    const expiresIn = 40 * 60 * 1000; // 40 minutes TTL
    
    // Verify client idToken
    const decodedIdToken = await getAdminAuth().verifyIdToken(idToken);
    
    // Prevent old tokens (issued > 5 minutes ago)
    if (new Date().getTime() / 1000 - decodedIdToken.auth_time > 5 * 60) {
      throw new Error('Recent sign-in required.');
    }
    
    // Generate HTTP-Only session cookie
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    
    const sanitizedEmail = decodedIdToken.email?.trim().toLowerCase();
    let role = 'team';
    if (sanitizedEmail && ADMIN_EMAILS.has(sanitizedEmail)) {
      role = 'admin';
    } else if (sanitizedEmail) {
      role = await getUserRole(sanitizedEmail);
    }

    return { success: true, role };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### 5.2 Role Resolution & In-Memory TTL Caching
`getUserRole` queries the `roles` collection and maintains an in-memory cache with a 5-minute TTL to reduce database reads under continuous API requests.

```typescript
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000;

export async function getUserRole(email: string): Promise<string> {
  const sanitizedEmail = email.trim().toLowerCase();
  
  if (ADMIN_EMAILS.has(sanitizedEmail)) return 'admin';
  
  const now = Date.now();
  const cached = roleCache.get(sanitizedEmail);
  if (cached && now - cached.timestamp < ROLE_CACHE_TTL) {
    return cached.role;
  }
  
  try {
    const roleDoc = await getAdminDb().collection('roles').doc(sanitizedEmail).get();
    let fetchedRole = 'team';
    if (roleDoc.exists) {
      fetchedRole = roleDoc.data()?.role || 'team';
    }
    roleCache.set(sanitizedEmail, { role: fetchedRole, timestamp: now });
    return fetchedRole;
  } catch (error) {
    if (cached) return cached.role;
  }
  
  return 'team';
}
```

### 5.3 Edge Middleware Proxy (`src/proxy.ts`)
Intercepts incoming HTTP requests to protected routes before Next.js page rendering.

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value;

  const protectedRoutes = [
    '/team-dashboard',
    '/admin',
    '/jury-dashboard',
    '/student-coord-dashboard',
    '/faculty-coord-dashboard'
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register'))) {
    return NextResponse.redirect(new URL('/team-dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/team-dashboard/:path*', 
    '/admin/:path*', 
    '/jury-dashboard/:path*', 
    '/student-coord-dashboard/:path*', 
    '/faculty-coord-dashboard/:path*', 
    '/login', 
    '/register'
  ],
};
```

---

## 6. Data Encryption & Security Layer

Sensitive role data or payloads are encrypted using **AES-256-GCM** authenticated ciphering (`src/lib/encryption.ts`).

### AES-256-GCM Implementation

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''; // Must be 64 hex chars (32 bytes)

export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key is missing');
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Encrypted Payload Format: iv:authTag:encryptedText
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  if (!ENCRYPTION_KEY) throw new Error('Encryption key is missing');
  
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export function encryptJSON(data: any): string {
  return encrypt(JSON.stringify(data));
}

export function decryptJSON(encryptedData: string): any {
  return JSON.parse(decrypt(encryptedData));
}
```

---

## 7. Core Firestore Helper Functions

All read/write operations against the consolidated domain and round documents are executed via standard helpers (`src/lib/firestore-helpers.ts`).

### 7.1 Dynamic Domain Resolution
Maps raw theme or track strings to document IDs.

```typescript
export const ALL_DOMAIN_DOC_IDS = [
  'autonomous-agentic-ai',
  'adaptive-intelligent-systems',
  'predictive-logistics-industrial-ai',
  'ai-smart-business-solution',
  'human-centered-ai',
];

export function resolveDomainId(theme?: string): string {
  if (!theme) return 'autonomous-agentic-ai';
  const t = theme.toLowerCase().trim();

  if (t.includes('agentic') || t.includes('autonomous')) return 'autonomous-agentic-ai';
  if (t.includes('adaptive')) return 'adaptive-intelligent-systems';
  if (t.includes('predictive') || t.includes('logistics')) return 'predictive-logistics-industrial-ai';
  if (t.includes('business')) return 'ai-smart-business-solution';
  if (t.includes('human')) return 'human-centered-ai';

  return 'autonomous-agentic-ai';
}
```

### 7.2 Read All Teams Across 5 Domain Documents
Executes 5 simultaneous Firestore reads (`Promise.all`) and flattens team arrays into a unified dataset.

```typescript
export async function getAllTeamsFlatFromDomainDocs(): Promise<AdminTeamData[]> {
  const db = getAdminDb();
  const snaps = await Promise.all(
    ALL_DOMAIN_DOC_IDS.map((docId) => db.collection('teams').doc(docId).get())
  );

  const allTeams: AdminTeamData[] = [];

  snaps.forEach((snap) => {
    if (snap.exists) {
      const teamsArr = Array.isArray(snap.data()?.teams) ? snap.data()!.teams : [];
      teamsArr.forEach((t: any) => {
        allTeams.push({ ...t });
      });
    }
  });

  return allTeams;
}
```

### 7.3 Transactional Team Insertion (`createTeamInDomainDoc`)
Reads the target domain document, performs uniqueness validation inside the transaction, and appends the team to the `teams` array.

```typescript
export async function createTeamInDomainDoc(teamData: any) {
  try {
    const db = getAdminDb();
    const domainId = resolveDomainId(teamData.theme);
    const domainRef = db.collection('teams').doc(domainId);
    const teamId = teamData.id || `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newTeamObj = {
      ...teamData,
      id: teamId,
      domainId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(domainRef);
      let teamsArr = snap.exists && Array.isArray(snap.data()?.teams) ? snap.data().teams : [];

      const existingName = teamsArr.find(
        (t: any) => String(t.teamName).toLowerCase().trim() === String(teamData.teamName).toLowerCase().trim()
      );
      if (existingName) throw new Error(`Team name "${teamData.teamName}" is already registered.`);

      teamsArr.push(newTeamObj);

      transaction.set(domainRef, {
        domainId,
        teamCount: teamsArr.length,
        updatedAt: new Date(),
        teams: teamsArr,
      }, { merge: true });
    });

    return { success: true, teamId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### 7.4 Transactional Evaluation Upsert (`upsertEvalRecord`)
Manages score submissions into `evaluations/prelims` or `evaluations/finale`. Prevents edits if `isFrozen === true`.

```typescript
export async function upsertEvalRecord(round: 'prelims' | 'finale', recordData: any) {
  try {
    const db = getAdminDb();
    const docRef = db.collection('evaluations').doc(round);
    const evalId = recordData.id || `${round}_${recordData.juryId}_${recordData.teamId}`;
    const nowIso = new Date().toISOString();

    const newRecord = {
      ...recordData,
      id: evalId,
      round,
      updatedAt: nowIso,
      createdAt: recordData.createdAt || nowIso,
    };

    await db.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(docRef);
      let recordsArr = snap.exists && Array.isArray(snap.data()?.records) ? snap.data().records : [];

      const idx = recordsArr.findIndex((r: any) => r.id === evalId || (r.teamId === recordData.teamId && r.juryId === recordData.juryId));

      if (idx !== -1) {
        if (recordsArr[idx].isFrozen) throw new Error('This evaluation is locked and frozen.');
        recordsArr[idx] = { ...recordsArr[idx], ...newRecord };
      } else {
        recordsArr.push(newRecord);
      }

      transaction.set(docRef, {
        round,
        totalCount: recordsArr.length,
        updatedAt: new Date(),
        records: recordsArr,
      }, { merge: true });
    });

    return { success: true, recordId: evalId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

## 8. Backend Server Actions

### 8.1 Team Registration Action (`src/app/actions/auth.ts`)
1. Checks Phase 1 timeline (`timeline1.state === 'active'`).
2. Validates team name uniqueness and checks for duplicate member batch numbers across all domain documents.
3. Executes a Firestore transaction on `metadata/teamCounter` to acquire a sequential integer count, formatting it as `H2O-XXX`.
4. Saves team object into target domain document.

### 8.2 Password Change & Re-Authentication (`src/app/actions/forgot-password.ts`)
Validates user session, ensures role is `"team"`, verifies current password against Google Identity Toolkit REST API, and updates password via Admin SDK.

```typescript
// Identity Toolkit Re-Auth Call
const verifyRes = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  {
    method: 'POST',
    body: JSON.stringify({ email, password: oldPassword, returnSecureToken: true }),
    headers: { 'Content-Type': 'application/json' },
  }
);

if (!verifyRes.ok) throw new Error('Old password is incorrect');

// Admin Password Update
const userRecord = await getAdminAuth().getUserByEmail(email);
await getAdminAuth().updateUser(userRecord.uid, { password: newPassword });
```

---

## 9. Automated Admin Pipeline Algorithms

Located in `src/app/admin/actions.ts`.

### 9.1 Auto Lab Allocation Engine (`autoAssignTeamsToLabsAdmin`)
Distributes teams evenly to available Prelims lab venues based on track matching and lab capacities.

```
Algorithm Flow:
1. Fetch all flat teams and active labs (`getLabsAdmin`).
2. Filter out teams marked as eliminated.
3. Group labs by `assignedTheme`.
4. Iterate over unassigned teams:
   - Match team.theme with corresponding theme lab pool.
   - Select lab with (currentTeamCount < capacity).
   - Assign `assignedLabId`, `assignedLabName`, `labNo` to team.
   - Increment lab.currentTeamCount.
5. Batch update all affected team domain documents in Firestore (`bulkUpdateTeamsInDomainDocs`).
6. Update live team counts on lab documents (`labs`).
```

### 9.2 Phase 2 PPT Screening Filter (`applyPptFilterAdmin`)
Iterates through all domain documents and evaluates team `pptLink` values:
- If `pptLink` is valid non-empty string: sets `pptQualified = true`, `pptStatus = "approved"`.
- If `pptLink` is empty: sets `pptQualified = false`, `eliminated = true`, `eliminationReason = "No PPT presentation submitted during Phase 2"`.

### 9.3 Automated Finale Promotion Algorithm (`promoteTopTeamsToFinaleAdmin`)
Promotes the top $N$ scoring teams from Prelims to the Grand Finale.

```typescript
export async function promoteTopTeamsToFinaleAdmin(topCount: number) {
  // 1. Fetch all prelims score records from evaluations/prelims
  const prelimsScores = await getEvalRecords('prelims');

  // 2. Map & aggregate scores per teamId
  const teamScoreTotals = new Map<string, { total: number; count: number }>();
  prelimsScores.forEach((r) => {
    const existing = teamScoreTotals.get(r.teamId) || { total: 0, count: 0 };
    teamScoreTotals.set(r.teamId, {
      total: existing.total + r.totalScore,
      count: existing.count + 1,
    });
  });

  // 3. Compute average score per team
  const allTeams = await getAllTeamsFlatFromDomainDocs();
  const rankedTeams = allTeams.map((t) => {
    const scoreData = teamScoreTotals.get(t.id);
    const avg = scoreData && scoreData.count > 0 ? scoreData.total / scoreData.count : 0;
    return { teamId: t.id, avgScore: avg };
  });

  // 4. Sort descending by average score
  rankedTeams.sort((a, b) => b.avgScore - a.avgScore);

  // 5. Slice top N team IDs
  const promotedSet = new Set(rankedTeams.slice(0, topCount).map((t) => t.teamId));

  // 6. Bulk update domain docs: set finaleQualified & prelimsStatus
  const updates = allTeams.map((t) => ({
    teamId: t.id,
    fields: {
      prelimsAverageScore: teamScoreTotals.get(t.id)?.total ? (teamScoreTotals.get(t.id)!.total / teamScoreTotals.get(t.id)!.count) : 0,
      finaleQualified: promotedSet.has(t.id),
      prelimsStatus: promotedSet.has(t.id) ? 'selected' : 'not_selected',
      finalStatus: promotedSet.has(t.id) ? 'pending' : 'not_qualified',
    },
  }));

  await bulkUpdateTeamsInDomainDocs(updates);
  return { success: true, count: promotedSet.size };
}
```

---

## 10. Google Apps Script & Drive Integration

To bypass browser CORS restrictions and upload presentation files directly to Google Drive, presentation files are converted to Base64 on the server and POSTed to a Google Apps Script Web App (`src/app/actions/drive.ts`).

### 10.1 Drive Upload Server Action (`uploadPPTToDrive`)
```typescript
export async function uploadPPTToDrive(
  teamId: string,
  payload: { fileName: string; mimeType: string; base64Data: string; oldFileId?: string }
) {
  const scriptUrl = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;
  if (!scriptUrl) return { success: false, error: 'Google Script URL unconfigured' };

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await response.json();
  if (res.status === 'success' && res.url) {
    // Save generated Google Drive link to team record in domain doc
    await savePPTLink(teamId, res.url, res.fileId);
    return { success: true, url: res.url, fileId: res.fileId };
  }
  return { success: false, error: res.message };
}
```

### 10.2 Google Apps Script Code (`Code.gs` for Deployment)
Deploy this script as a **Web App** (Execute as: *Me*, Who has access: *Anyone*):

```javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var folderId = "YOUR_GOOGLE_DRIVE_FOLDER_ID"; 
    var folder = DriveApp.getFolderById(folderId);
    
    // Delete previous file version if re-uploading
    if (data.oldFileId) {
      try { DriveApp.getFileById(data.oldFileId).setTrashed(true); } catch(err) {}
    }
    
    var bytes = Utilities.base64Decode(data.base64Data);
    var blob = Utilities.newBlob(bytes, data.mimeType, data.fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      url: file.getUrl(),
      fileId: file.getId()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

---

## 11. REST API Layer Specification

All Firestore data queries are encapsulated behind Next.js API Route Handlers in `src/app/api/`.

### Summary of REST Endpoints:

| Method | Route Path | Description | Access Level |
|--------|------------|-------------|--------------|
| `GET` | `/api/teams` | List all flat teams across 5 domain docs | Admin / Jury |
| `GET` | `/api/teams?domain={id}` | List teams within specific domain doc | Admin / Jury |
| `GET` | `/api/teams?leadEmail={email}`| Get team profile by lead email | Authenticated Team |
| `GET` | `/api/teams/[teamId]` | Get team details by team ID | Authenticated User |
| `POST` | `/api/teams` | Register a new team | Public (Phase 1 Active) |
| `PATCH` | `/api/teams/[teamId]` | Update specific team fields | Admin / System |
| `DELETE`| `/api/teams/[teamId]` | Remove team from domain doc | Admin |
| `GET` | `/api/evaluations?round={prelims\|finale}` | Get all evaluation records for round | Admin / Jury |
| `POST` | `/api/evaluations` | Upsert evaluation scorecard record | Jury / Admin |
| `PATCH` | `/api/evaluations/[evalId]` | Patch remarks or freeze state | Admin |
| `DELETE`| `/api/evaluations/[evalId]` | Delete evaluation record | Admin |
| `POST` | `/api/evaluations/publish-prelims` | Publish finalist team selection | Admin |
| `GET` | `/api/roles` | List all privileged accounts | Admin |
| `POST` | `/api/roles` | Create new privileged role (Jury/Coord) | Admin |
| `DELETE`| `/api/roles/[email]` | Remove privileged user role | Admin |
| `GET` | `/api/labs` | List all Prelims labs | Admin / Jury |
| `POST` | `/api/labs` | Create new lab venue | Admin |
| `PATCH` | `/api/labs/[labId]` | Update lab details or assigned jury | Admin |
| `DELETE`| `/api/labs/[labId]` | Delete lab venue | Admin |
| `GET` | `/api/final-labs` | List all Finale lab venues | Admin |
| `POST` | `/api/final-labs` | Create Finale lab venue | Admin |
| `GET` | `/api/metadata/timelines` | Get event timeline configurations | Public |
| `POST` | `/api/metadata/timelines` | Update phase timelines & switches | Admin |
| `GET` | `/api/metadata/winners` | Get event winners list | Public |
| `POST` | `/api/metadata/winners` | Save finale event winners | Admin |
| `POST` | `/api/upload-ppt` | Relay base64 file to Google Apps Script | Team User |
| `POST` | `/api/migrate` | Execute legacy database migration | Admin Script |

---

## 12. Database Migration & Maintenance Scripts

Located under `src/scripts/`.

### 12.1 Schema Restructure Migration Script (`src/scripts/migrate-to-new-schema.ts`)
Converts legacy isolated Firestore team & evaluation documents into the 5 Domain Docs and 2 Round Docs structure.

```typescript
import './load-env';
import { getAdminDb } from '../lib/firebase-admin';
import { DOMAIN_SLUGS, ALL_DOMAIN_DOC_IDS, resolveDomainId } from '../lib/firestore-helpers';

async function migrateData() {
  console.log('🚀 Starting Data Migration...');
  const db = getAdminDb();

  // 1. Group teams into 5 domain arrays
  const oldTeamsSnap = await db.collection('teams').get();
  const domainGroupedTeams: Record<string, any[]> = {};
  ALL_DOMAIN_DOC_IDS.forEach((id) => domainGroupedTeams[id] = []);

  oldTeamsSnap.docs.forEach((doc) => {
    if (ALL_DOMAIN_DOC_IDS.includes(doc.id)) return; // Skip if already migrated
    const data = doc.data();
    const domainId = resolveDomainId(data.theme || data.problemStatement);
    domainGroupedTeams[domainId].push({ id: doc.id, ...data });
  });

  // 2. Write 5 Domain Documents
  for (const domainId of ALL_DOMAIN_DOC_IDS) {
    const teamsArr = domainGroupedTeams[domainId];
    await db.collection('teams').doc(domainId).set({
      domainId,
      domainName: DOMAIN_SLUGS[domainId]?.name || 'Domain',
      teamCount: teamsArr.length,
      updatedAt: new Date(),
      teams: teamsArr,
    });
  }

  // 3. Group evaluations into 2 Round Docs
  const oldEvalsSnap = await db.collection('evaluations').get();
  const prelimsRecords: any[] = [];
  const finaleRecords: any[] = [];

  oldEvalsSnap.docs.forEach((doc) => {
    if (doc.id === 'prelims' || doc.id === 'finale') return;
    const data = doc.data();
    const round = data.round || (doc.id.startsWith('finale_') ? 'finale' : 'prelims');
    if (round === 'finale') finaleRecords.push({ id: doc.id, ...data });
    else prelimsRecords.push({ id: doc.id, ...data });
  });

  // 4. Write 2 Round Documents
  await db.collection('evaluations').doc('prelims').set({
    round: 'prelims',
    totalCount: prelimsRecords.length,
    updatedAt: new Date(),
    records: prelimsRecords,
  });

  await db.collection('evaluations').doc('finale').set({
    round: 'finale',
    totalCount: finaleRecords.length,
    updatedAt: new Date(),
    records: finaleRecords,
  });

  console.log('✅ Full Migration Complete!');
}

migrateData();
```

---

## 13. Step-by-Step Replication Checklist

Follow these steps to replicate the complete backend codebase:

1. **Initialize Next.js Project:**
   ```bash
   npx create-next-app@latest hackwell --typescript --eslint --app
   cd hackwell
   npm install firebase firebase-admin googleapis zod
   ```

2. **Configure Firebase Project & Credentials:**
   - Create a Firebase project in [Firebase Console](https://console.firebase.google.com/).
   - Enable **Email/Password** under Authentication.
   - Create a **Cloud Firestore Database** in Native mode.
   - Generate Service Account JSON key from **Project Settings > Service Accounts**.

3. **Setup Environment (.env.local):**
   - Populate client variables (`NEXT_PUBLIC_FIREBASE_*`).
   - Add `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`.
   - Set `ENCRYPTION_KEY` to a random 64-character hex string (`crypto.randomBytes(32).toString('hex')`).

4. **Add Backend Core Files:**
   - Create `src/lib/firebase.ts` (Client SDK).
   - Create `src/lib/firebase-admin.ts` (Admin SDK).
   - Create `src/lib/encryption.ts` (AES-256-GCM cipher).
   - Create `src/lib/firestore-helpers.ts` (Domain and Round document handlers).
   - Create `src/lib/api-utils.ts` (Session validation and response formatters).

5. **Configure Security & Access Control:**
   - Create `src/proxy.ts` middleware for Edge routing protection.
   - Create `src/app/actions/session.ts` for HTTP-Only session cookies.
   - Create `src/app/actions/auth.ts` for transactional team registrations.

6. **Deploy Google Apps Script for PPT Uploads:**
   - Paste `doPost` script into Google Apps Script connected to a dedicated Google Drive folder.
   - Deploy as Web App with access set to *Anyone*.
   - Add deployment URL to `NEXT_PUBLIC_GOOGLE_SCRIPT_URL`.

7. **Initialize Firestore Collections & Timelines:**
   - Seed `metadata/teamCounter` document with `{ count: 0 }`.
   - Seed `metadata/eventTimelines` document with default phase objects (`timeline1` through `timeline4`).
   - Run `npx ts-node src/scripts/migrate-to-new-schema.ts` to transform existing database structures if migrating.

8. **Deploy & Verify Backend:**
   - Run `npm run build` to verify TypeScript compile checks.
   - Run `npm run dev` and test registration, login session cookie creation, lab allocation, and scoring pipelines.

---
*Maintained by the Hackwell 2.0 Engineering Team • August 2026*
