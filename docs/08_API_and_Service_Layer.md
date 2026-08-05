# 08 — API and Service Layer

## Server Actions

All business logic is implemented as Next.js Server Actions (`'use server'`). There are no traditional REST API endpoints for core functionality.

### `src/app/actions/session.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `createSessionCookie(idToken)` | Firebase ID Token | `{ success, role }` | Verifies ID token, mints HttpOnly session cookie (40min), resolves user role. |
| `clearSessionCookie()` | None | void | Deletes the `session` cookie. |
| `getUserRole(email)` | Email string | Role string | Queries `roles` collection (with 5-min cache). Returns `'team'` as default fallback. |
| `isAdminEmail(email)` | Email string | boolean | Checks against hardcoded admin email whitelist. |
| `clearRoleCache(email?)` | Optional email | void | Clears role cache for specific email or all. |

**Error Handling:** Falls back to stale cached role on Firestore quota errors.

### `src/app/actions/auth.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `checkTeamNameUnique(teamName)` | Team name | `{ isUnique }` or `{ error }` | Checks both legacy doc IDs and `teamNameLower` field. |
| `checkBatchNumbers(batchNumbers)` | Array of batch numbers | `{ success, duplicates }` | Queries `allBatchNumbers` array-contains-any. |
| `checkRegistrationTimelineStatus()` | None | `{ allowed, message }` | Checks `metadata/eventTimelines.timeline1` date window. |
| `registerTeamData(...)` | Team name, theme, PS, lead data, members | `{ success }` or `{ error }` | Full registration: timeline check → uniqueness check → sequential ID generation (transaction with 5 retries) → Firestore write. |
| `getTeamDataByEmail(email)` | Email | `{ success, team }` | Fetches team by `leadEmail` for team dashboard. |
| `submitPPT(teamId, pptLink)` | Team ID, PPT link | `{ success }` | Updates team's `pptLink` field. |

### `src/app/actions/drive.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `checkPPTSubmissionTimelineStatus()` | None | `{ allowed, state, message }` | Checks `timeline2` date window. |
| `savePPTLink(teamId, webViewLink, fileId)` | Team ID, Drive link, file ID | `{ success }` | Session-verified PPT link save with timeline enforcement. |

### `src/app/actions/forgot-password.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `checkTeamEmailRegistered(email)` | Email | `{ success }` or `{ error }` | Verifies email is a team lead (not admin/jury/coord). |
| `changeTeamPassword(email, oldPw, newPw)` | Email, old password, new password | `{ success }` | Session-verified password change via Firebase Auth REST API + Admin SDK. |

### `src/app/admin/actions.ts` (2,244 lines)

**Admin-Only Actions** — all gated by `verifyAdminSession()`:

| Category | Functions |
|---|---|
| **Session** | `verifyAdminSession()` |
| **Overview** | `getAdminOverviewStats()` |
| **Teams CRUD** | `getAllTeamsAdmin()`, `updateTeamAdmin()`, `deleteTeamAdmin()` |
| **Evaluations** | `getAllEvaluationsAdmin(round)`, `createScoreAdmin()`, `updateScoreAdmin()`, `deleteScoreAdmin()` |
| **Game Scores** | `getAllGameScoresAdmin()` |
| **Labs** | `getLabsAdmin()`, `createLabAdmin()`, `updateLabAdmin()`, `deleteLabAdmin()` |
| **Final Labs** | `getFinalLabsAdmin()`, `createFinalLabAdmin()`, `updateFinalLabAdmin()`, `deleteFinalLabAdmin()` |
| **Juries** | `getJuriesAdmin()` |
| **Timeline** | `getEventTimelinesAdmin()`, `updateEventTimelinesAdmin()`, `setTimelinePhaseAdmin()`, `updateTimelinePhaseAdmin()`, `resetTimelinePhaseAdmin()` |
| **Workflow** | `applyPptFilterAdmin()`, `autoAllocateTeamsAdmin()`, `autoAssignTeamsToLabsAdmin()`, `promoteTopTeamsToFinaleAdmin()`, `autoAssignFinalTeamsToLabsAdmin()`, `publishPrelimsResults()` |
| **Winners** | `setFinalWinnersAdmin()` |
| **Stats** | `getTimelineStatsAdmin()` |
| **Reset** | `resetPrelimsFiltersAndAssignmentsAdmin()` |
| **Toggle** | `toggleTeamFinaleQualifiedAdmin()` |
| **Seed** | `seedDummyTeamsAdmin(count)` |
| **Caching** | `invalidateCollectionCache()`, `getCachedDocs()` |

### `src/app/admin/users-creator/actions.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `getAllUsersAdmin()` | None | `{ success, users }` | Lists all Firebase Auth users merged with Firestore roles. |
| `createJuryUser(name, institution, email, password)` | Profile data | `{ success }` | Creates Firebase Auth user + `roles` doc with encrypted credentials. |
| `createStudentCoordUser(name, email, password)` | Profile data | `{ success }` | Creates student coordinator account. |
| `createFacultyCoordUser(name, dept, email, password)` | Profile data | `{ success }` | Creates faculty coordinator account. |
| `createUserAdmin(email, password, role)` | Credentials + role | `{ success }` | Legacy generic user creation. |
| `deleteUserAdmin(email)` | Email | `{ success }` | Deletes user from Auth + roles + related collections + unassigns from labs. |

### `src/app/jury-dashboard/actions.ts`

| Function | Inputs | Outputs | Responsibility |
|---|---|---|---|
| `verifyJurySession()` | None (reads cookie) | `{ success, email, juryName, scoresFrozen, ... }` | Verifies session + jury role + frozen state. |
| `getJuryDashboardData()` | None | `{ success, teams, scoresFrozen }` | Fetches all teams + jury's evaluation status. |
| `getTeamDetails(teamId)` | Team ID | `{ success, teamDetails, scoreData }` | Detailed team data + existing evaluation for this jury. |
| `saveEvaluation(teamId, rubrics, remarks, highlighted)` | Team ID, 5-field rubric, remarks, star | `{ success }` | Creates or updates evaluation in `prelimsEvaluations`. |
| `toggleHighlight(teamId, highlighted)` | Team ID, boolean | `{ success }` | Toggles star/highlight on evaluation. |
| `freezeJuryScores()` | None | `{ success }` | Marks all jury evaluations as frozen + updates `roles` doc. |

## Utility Functions

### `src/lib/encryption.ts`

| Function | Inputs | Outputs | Description |
|---|---|---|---|
| `encrypt(text)` | Plain text | `iv:authTag:ciphertext` | AES-256-GCM encryption. |
| `decrypt(encryptedData)` | Encrypted string | Plain text | AES-256-GCM decryption. |
| `encryptJSON(data)` | Any JSON-serializable data | Encrypted string | Serializes to JSON then encrypts. |
| `decryptJSON(encryptedData)` | Encrypted string | Parsed JSON object | Decrypts then parses JSON. |

### `src/lib/data/themes.ts`

| Export | Type | Description |
|---|---|---|
| `HACKATHON_THEMES` | `Theme[]` | 5 themes with 3 problem statements each (15 total). |
| `ALL_PROBLEM_STATEMENTS` | `Array` | Flattened array with `themeName` added for dropdown search. |
| `THEME_NAMES` | `string[]` | Array of theme name strings (used in `admin/actions.ts` for resolving). |

## API Routes

| Route | Method | File | Description |
|---|---|---|---|
| `/api/check` | GET | `src/app/api/check/route.ts` | Health check endpoint. |
| `/api/wipe` | POST | `src/app/api/wipe/route.ts` | Administrative data wipe with admin verification. |

---

> **Related Documents:** [02_System_Architecture](./02_System_Architecture.md) · [09_State_Management](./09_State_Management.md)
