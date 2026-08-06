# Firebase Read/Write Optimization Plan — Hackwell 2.0

Reduce unnecessary Firestore API calls to prevent hitting the free-tier (Spark Plan) limits of **50,000 reads/day** and **20,000 writes/day**.

---

## Background: What's Causing Unnecessary API Calls

After reading `details.md` and auditing the actual codebase, the following problem patterns were identified. Most of them are **not bugs** — they're architectural patterns that compound on each other.

---

## Identified Problems (Ranked by Severity)

### 🔴 CRITICAL — Multiple Redundant 5-doc Reads Per Action

**Location:** `src/app/admin/actions.ts`

`getAllTeamsFlatFromDomainDocs()` reads **5 Firestore documents simultaneously** every time it's called.
It is called **32 times** across the entire codebase, including in `admin/actions.ts` alone where it's called redundantly on nearly every action. These calls are **not cached** — each triggers 5 fresh reads.

**Examples of redundant stacked reads:**
- `updateTeamAdmin()` — calls `findTeamInDomainDocs()` (5 reads) → then `getAllTeamsFlatFromDomainDocs()` inside `syncLabTeamCountsAdmin()` (5 more reads) = **10 reads for 1 team update**
- `deleteTeamAdmin()` — calls `findTeamInDomainDocs()` (5 reads) → then `syncLabTeamCountsAdmin()` → another `getAllTeamsFlatFromDomainDocs()` (5 reads) = **10 reads for 1 delete**
- `createLabAdmin()` — creates 1 lab, then calls `syncLabTeamCountsAdmin()` which reads all 5 team docs again unnecessarily
- `deleteLabAdmin()` — calls `getAllTeamsFlatFromDomainDocs()` (5 reads) to find affected teams, then `syncLabTeamCountsAdmin()` (5 reads again) = **10 reads for 1 lab delete**
- `getEventManagementDashboardDataAdmin()` — calls 7 functions in `Promise.all`, of which `getAllTeamsAdmin()`, `getAllEvaluationsAdmin('prelims')`, `getAllEvaluationsAdmin('finale')`, `getLabsAdmin()`, `getFinalLabsAdmin()`, `getJuriesAdmin()` each make **their own reads independently** — none share any fetched data

**Current cached `getAllTeamsAdmin()`:** Uses `unstable_cache` with `revalidate: 300` (5 minutes). However, `syncLabTeamCountsAdmin()` and all bulk operations bypass this cache and call `getAllTeamsFlatFromDomainDocs()` directly.

---

### 🔴 CRITICAL — `syncLabTeamCountsAdmin` Called After Every Mutating Operation

**Location:** `admin/actions.ts` — `updateTeamAdmin`, `deleteTeamAdmin`, `createLabAdmin`, `updateLabAdmin`, `deleteLabAdmin`

`syncLabTeamCountsAdmin` **reads all 5 domain docs + all labs** just to recalculate `currentTeamCount`. This is called immediately after each admin mutation even though:
- `updateTeamAdmin` already applies a targeted `FieldValue.increment` to the affected lab documents
- The `currentTeamCount` can be maintained incrementally without a full re-scan

---

### 🔴 CRITICAL — Team Dashboard Fetches All 5 Domain Docs Just to Calculate Leaderboard Rank

**Location:** `src/app/team-dashboard/page.tsx` (lines 64–75)

```typescript
// Every team member visiting their dashboard triggers 5 reads:
const allTeams = await getAllTeamsFlatFromDomainDocs(); // 5 reads
```

This fetches **every team's full data** just to calculate one user's rank position. With 100 teams, this is 5 reads that return hundreds of KB of data just to compute a position number. Every page refresh by any student triggers this.

---

### 🔴 CRITICAL — `getAdminOverviewStats` Issues Broken/Wrong Queries on New Schema

**Location:** `admin/actions.ts` lines 170–176

```typescript
db.collection('evaluations').where('round', '==', 'prelims').count().get(),
db.collection('evaluations').where('round', '==', 'finale').count().get(),
```

In the new schema, `evaluations` only has **2 documents** (`prelims` and `finale`), not hundreds. The `where('round', '==', ...)` query now scans those 2 docs and returns a count of **1 or 0**, not the number of evaluations inside the `records[]` array. This means the stats shown on the dashboard are wrong, **and** the query is still charged as 2 reads.

---

### 🔴 CRITICAL — `getAllEvaluationsAdmin` Uses Wrong Collection Query

**Location:** `admin/actions.ts` lines 463–465

```typescript
db.collection('evaluations').where('round', '==', round).get(),
```

In the new schema, `evaluations/prelims` and `evaluations/finale` are **single documents containing a `records[]` array** — not a collection of documents with a `round` field. This `where` query scans and returns the 1 matching document (not the records). The data returned will be `{ records: [...] }` and `docMap.get()` will construct scores incorrectly. This is a schema mismatch bug that wastes reads AND produces wrong data.

---

### 🟡 HIGH — `getTimelineStatsAdmin` Makes 5 Separate Parallel Collection Fetches

**Location:** `admin/actions.ts` line 1059–1064

```typescript
const [allTeams, prelimsSnap, finaleSnap, rolesSnap, labsSnap] = await Promise.all([
  getAllTeamsFlatFromDomainDocs(),              // 5 reads
  db.collection('evaluations').where(...).get(), // wrong schema query
  db.collection('evaluations').where(...).get(), // wrong schema query
  db.collection('roles').where(...).get(),
  db.collection('labs').get(),
]);
```

If an admin calls `getEventManagementDashboardDataAdmin()`, it calls both `getAllEvaluationsAdmin('prelims')` and `getAllEvaluationsAdmin('finale')` (which each call `getAllTeamsFlatFromDomainDocs()`) plus `getTimelineStatsAdmin()` (which calls it again). One dashboard load = **15+ reads on the teams collection alone**.

---

### 🟡 HIGH — Coordinator Dashboard Fetches All Teams On Every Page Load

**Location:** `src/app/coord-dashboard/page.tsx` line 48

```typescript
teams = await getAllTeamsFlatFromDomainDocs(); // 5 reads every page load
```

Coordinators use this to award Game XP to teams. The full team list is loaded on every visit even though coordinators only need the team names and IDs for a dropdown selector.

---

### 🟡 HIGH — `getJuriesAdmin` Reads From Non-Existent `jury` Collection

**Location:** `admin/actions.ts` line 2043

```typescript
const [jurySnap, rolesSnap] = await Promise.all([
  getCachedDocs('jury'),   // reads a collection that no longer exists
  getCachedDocs('roles'),  // reads roles
]);
```

The `jury` collection was replaced by the `roles` collection. Every call to `getJuriesAdmin()` attempts to read a ghost collection unnecessarily, burning a read quota check even if it returns empty.

---

### 🟡 HIGH — `promoteTopTeamsToFinaleAdmin` Reads Deprecated `prelimsEvaluations` Collection

**Location:** `admin/actions.ts` line 1321

```typescript
db.collection('prelimsEvaluations').get(),
```

This reads a **collection that no longer exists** in the new schema. The function fetches from `prelimsEvaluations` (old schema) but all data is now in `evaluations/prelims.records[]`. This function will always return empty scores and promote teams incorrectly.

---

### 🟠 MEDIUM — `submitAndFreezeEvaluation` Makes 3 Sequential Reads for 1 Submit

**Location:** `jury-dashboard/actions.ts` lines 336–390

For every jury evaluation submission:
1. `getEventTimelines()` — 1 read on `metadata/eventTimelines`
2. `getEvalRecords('prelims')` — 1 read on `evaluations/prelims` (to check if frozen)
3. `findTeamInDomainDocs(teamId)` — 5 reads on all domain docs

3 separate read operations before any write. The `findTeamInDomainDocs()` call can be eliminated — the team data was already loaded when `getTeamDetails()` was called just before submission.

---

### 🟠 MEDIUM — `checkTeamNameUnique` and `checkBatchNumbers` Both Read All 5 Domain Docs

**Location:** `src/app/actions/auth.ts` lines 15, 28

During registration, two separate actions are called for validation:
```typescript
const allTeams = await getAllTeamsFlatFromDomainDocs(); // called in checkTeamNameUnique
const allTeams = await getAllTeamsFlatFromDomainDocs(); // called again in checkBatchNumbers
```

And then when `registerTeamData()` is called, it calls `checkTeamNameUnique()` **again** internally (line 95). A single registration flow may trigger **15+ reads** on the teams collection.

---

### 🟠 MEDIUM — `/api/teams`, `/api/teams/leaderboard`, `/api/stats` Have No Caching

**Location:** `src/app/api/teams/route.ts`, `leaderboard/route.ts`, `stats/route.ts`

These API endpoints are called by client components (e.g., the public leaderboard). Each hit fires 5 fresh Firestore reads with no `Cache-Control` headers and no `next: { revalidate }` configuration. These are unauthenticated public reads triggered potentially many times per minute during a live event.

---

## Optimization Plan

---

### Fix 1 — Create a Singleton In-Memory Team Data Cache in `firestore-helpers.ts`

**Replaces:** All 32 bare calls to `getAllTeamsFlatFromDomainDocs()` across the codebase.

Create a module-level cache for team data with a configurable TTL. All internal callers (server actions, API routes, helpers) go through this instead of directly calling Firestore.

```typescript
// src/lib/firestore-helpers.ts

let teamDataCache: { data: AdminTeamData[]; timestamp: number } | null = null;
const TEAM_CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export async function getAllTeamsFlatCached(force = false): Promise<AdminTeamData[]> {
  const now = Date.now();
  if (!force && teamDataCache && (now - teamDataCache.timestamp) < TEAM_CACHE_TTL_MS) {
    return teamDataCache.data;
  }
  const fresh = await getAllTeamsFlatFromDomainDocs();
  teamDataCache = { data: fresh, timestamp: now };
  return fresh;
}

export function invalidateTeamCache() {
  teamDataCache = null;
}
```

**What changes:**
- All action functions call `getAllTeamsFlatCached()` instead of `getAllTeamsFlatFromDomainDocs()`
- All mutating actions (update, delete, create) call `invalidateTeamCache()` at the end
- Reduces repetitive 5-read calls within the same server action request chain

---

### Fix 2 — Remove `syncLabTeamCountsAdmin` Calls From Mutations

**Problem:** Every single team update/delete triggers a full rescan of all 5 domain docs + all labs just to recalculate `currentTeamCount`.

**Solution:** The mutations already have enough context to update the count incrementally using `FieldValue.increment`. Remove the `syncLabTeamCountsAdmin()` call from `updateTeamAdmin`, `deleteTeamAdmin`, `createLabAdmin`, `updateLabAdmin`, `deleteLabAdmin`. Keep `syncLabTeamCountsAdmin` as an admin-only explicit "resync" tool they can call manually when needed.

**Write savings:** Removes ~5 reads + N batch-writes per admin action. For 10 team updates in a session, this saves **50 reads and 10 write batches**.

---

### Fix 3 — Fix `getAdminOverviewStats` to Read Actual Record Counts

**Problem:** The stats query uses `where('round', ...)` on the new 2-document schema, which returns a wrong count of 1.

**Solution:** Read `evaluations/prelims` and `evaluations/finale` directly and count the `records[]` array lengths:

```typescript
// Replace the broken .where().count().get() calls with:
const [prelimsDoc, finaleDoc] = await Promise.all([
  db.collection('evaluations').doc('prelims').get(),
  db.collection('evaluations').doc('finale').get(),
]);
const totalPrelims = Array.isArray(prelimsDoc.data()?.records) 
  ? prelimsDoc.data()!.records.length : 0;
const totalFinale = Array.isArray(finaleDoc.data()?.records) 
  ? finaleDoc.data()!.records.length : 0;
```

This fixes the data and drops from **4 reads** (2 wrong `.where().count()` + 5 teams reads) to **7 reads** total (5 teams + 2 eval docs) — but now returns correct values.

---

### Fix 4 — Fix `getAllEvaluationsAdmin` to Match New Schema

**Problem:** Uses `db.collection('evaluations').where('round', '==', round).get()` which scans for documents with a `round` field, not the records inside the 2 aggregate documents.

**Solution:** Use `getEvalRecords(round)` from `firestore-helpers.ts` which already correctly reads `evaluations/prelims` or `evaluations/finale` and returns the `records[]` array:

```typescript
// Replace the 3-collection parallel fetch:
const [allTeams, rolesSnap] = await Promise.all([
  getAllTeamsFlatCached(),
  db.collection('roles').where('role', '==', 'jury').get(),
]);
const scores = await getEvalRecords(round);
// Map scores with allTeams and rolesSnap for name lookups
```

**Read savings:** Drops from ~5+1 (wrong) reads to 5+1 (correct) reads. Fixes the broken data.

---

### Fix 5 — Fix `promoteTopTeamsToFinaleAdmin` to Use New Evaluations Schema

**Problem:** Reads `prelimsEvaluations` collection (deleted) instead of `evaluations/prelims`.

**Solution:**
```typescript
// Replace:
db.collection('prelimsEvaluations').get(),

// With:
getEvalRecords('prelims'), // 1 read on evaluations/prelims
```

And aggregate scores by averaging across jury evaluations per team, not taking max.

---

### Fix 6 — Remove Redundant `jury` Collection Fetch in `getJuriesAdmin`

**Problem:** `getCachedDocs('jury')` reads a non-existent collection on every call.

**Solution:** Remove the `jurySnap` parallel fetch. Juries are now fully in `roles` collection:

```typescript
// Replace two-collection fetch:
const rolesSnap = await getCachedDocs('roles');
rolesSnap.docs?.forEach((doc) => {
  const data = doc.data();
  if (data.role === 'jury') {
    juryMap.set(doc.id, { ... });
  }
});
```

---

### Fix 7 — Team Dashboard Leaderboard: Use Lightweight Cached API Instead of Full Data Fetch

**Problem:** Every student's dashboard fetch reads all 5 team documents to compute rank.

**Solution A (Quick Fix):** Create a `/api/teams/rank` endpoint with Next.js `revalidate = 60`. The endpoint uses `getAllTeamsFlatCached()` and returns only the rank for a given teamId.

```typescript
// src/app/api/teams/rank/route.ts
export const revalidate = 60;

export async function GET(request: NextRequest) {
  const teamId = new URL(request.url).searchParams.get('teamId');
  const teams = await getAllTeamsFlatCached();
  const ranked = teams
    .map(t => ({ id: t.id, xp: (t as any).totalGameXP || 0, score: t.score || 0 }))
    .sort((a, b) => b.xp - a.xp || b.score - a.score);
  const idx = ranked.findIndex(t => t.id === teamId);
  return apiSuccess({ rank: idx === -1 ? null : idx + 1, total: ranked.length });
}
```

And in `team-dashboard/page.tsx`, remove the `getAllTeamsFlatFromDomainDocs()` call and instead fetch from this cached endpoint at render time.

---

### Fix 8 — Coordinator Dashboard: Fetch Only Team Names/IDs, Not Full Data

**Problem:** `coord-dashboard/page.tsx` fetches all 5 domain docs to populate a team selector.

**Solution:** Create a dedicated lightweight endpoint `/api/teams/minimal` that returns only `id`, `teamName`, `displayId`:

```typescript
// src/app/api/teams/minimal/route.ts
export const revalidate = 120; // 2-minute cache

export async function GET() {
  const teams = await getAllTeamsFlatCached();
  return apiSuccess({
    teams: teams.map(t => ({ id: t.id, teamName: t.teamName, displayId: t.displayId }))
  });
}
```

---

### Fix 9 — Add `revalidate` Caching to Public API Routes

**Applies to:** `/api/teams/leaderboard`, `/api/stats`, `/api/metadata/timelines`

```typescript
// Add at top of each route file:
export const revalidate = 60; // Next.js route cache — 60 seconds
```

---

### Fix 10 — `submitAndFreezeEvaluation`: Eliminate Redundant Domain Doc Scan

**Problem:** `findTeamInDomainDocs(teamId)` reads all 5 domain docs to verify a team that the jury already loaded via `getTeamDetails()`.

**Solution:** Remove the `findTeamInDomainDocs()` call before saving. Trust that the teamId is valid since it was verified during `getTeamDetails()`. Use the team parameters passed to the function directly:

```typescript
// Remove:
const found = await findTeamInDomainDocs(cleanTeamId); // 5 reads
if (!found) return { ... };

// Instead, only run updateTeamInDomainDoc if judge/lab are unassigned
// — you already have teamName and displayId as function parameters
```

**Read savings:** Saves 5 reads per evaluation submission. For 10 juries each scoring 20 teams = **1,000 reads saved**.

---

### Fix 11 — Registration: Deduplicate Team Data Reads in `registerTeamData`

**Problem:** `checkTeamNameUnique()` and `checkBatchNumbers()` are both called from the registration form AND `registerTeamData()` re-calls `checkTeamNameUnique()` internally — resulting in 3 separate full fetches.

**Solution:** Consolidate into a single validation fetch at the top of `registerTeamData()`:

```typescript
// In registerTeamData(), fetch once and validate both:
const allTeams = await getAllTeamsFlatCached();

const sanitizedName = teamName.trim().toLowerCase();
const nameExists = allTeams.some(t => t.teamName?.trim().toLowerCase() === sanitizedName);
if (nameExists) return { success: false, error: 'Team name already taken.' };

const takenBatch = new Set(allTeams.flatMap(t => [
  t.leadData?.batchNumber,
  ...(t.membersData || []).map((m: any) => m.batchNumber)
].filter(Boolean)));
const duplicates = batchNumbers.filter(b => takenBatch.has(b));
if (duplicates.length > 0) return { success: false, error: `Batch numbers already registered: ${duplicates.join(', ')}` };
```

**Read savings:** Reduces 3 separate full-fetches to **1 cached read** per registration attempt.

---

## Summary Table

| Fix | Problem | Reads Saved Per Call | Priority |
|-----|---------|----------------------|----------|
| 1 | No shared team data cache across actions | 5–25 reads/call | 🔴 Critical |
| 2 | `syncLabTeamCountsAdmin` after every mutation | 5 reads/mutation | 🔴 Critical |
| 3 | `getAdminOverviewStats` wrong query + bad data | Fixes data + 2 reads | 🔴 Critical |
| 4 | `getAllEvaluationsAdmin` schema mismatch | Fixes broken data | 🔴 Critical |
| 5 | `promoteTopTeamsToFinaleAdmin` ghost collection | Fixes broken feature | 🔴 Critical |
| 6 | `getJuriesAdmin` reads deleted `jury` collection | 1 wasted read | 🟡 High |
| 7 | Team dashboard 5-read leaderboard position | 5 reads/student visit | 🟡 High |
| 8 | Coord dashboard full team data fetch | 5 reads/coord visit | 🟡 High |
| 9 | Public API routes with no caching | 5–7 reads/API hit | 🟡 High |
| 10 | Redundant `findTeamInDomainDocs` in jury submit | 5 reads/eval submit | 🟠 Medium |
| 11 | Registration reads domain docs 3× | 10 reads/registration | 🟠 Medium |

---

## Execution Order

1. **Fix 1** — Implement `getAllTeamsFlatCached()` and `invalidateTeamCache()` in `firestore-helpers.ts`
2. **Fix 3, 4, 5** — Correct the broken schema-mismatch queries (these are also data bugs)
3. **Fix 6** — Remove the ghost `jury` collection read in `getJuriesAdmin`
4. **Fix 2** — Strip `syncLabTeamCountsAdmin` from all mutation paths
5. **Fix 10** — Remove `findTeamInDomainDocs` from `submitAndFreezeEvaluation`
6. **Fix 11** — Merge validation reads in `registerTeamData`
7. **Fix 7** — Create cached `/api/teams/rank` endpoint; update team dashboard page
8. **Fix 8** — Create `/api/teams/minimal` endpoint; update coord dashboard
9. **Fix 9** — Add `revalidate` and `Cache-Control` to public API routes

---

## What NOT to Do

- Do **not** use Firestore real-time listeners (`onSnapshot`) — they maintain persistent connections that count as continuous reads and will exhaust quota faster
- Do **not** add client-side polling (e.g. `setInterval(() => fetch('/api/...'))`) — all dashboards should load on demand and refresh manually
- Do **not** cache across requests with plain JS module variables in Vercel serverless (functions are stateless per cold start) — use Next.js `unstable_cache` or `revalidate` for cross-request caching in production

---

*Reviewed against actual source code: `admin/actions.ts`, `firestore-helpers.ts`, `jury-dashboard/actions.ts`, `actions/auth.ts`, `team-dashboard/page.tsx`, `coord-dashboard/page.tsx`, all `src/app/api/` routes.*
