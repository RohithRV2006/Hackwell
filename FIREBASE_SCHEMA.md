# 🔥 Firebase Firestore Schema — Hackwell 2.0

This document describes the complete Firestore database schema for the **Hackwell 2.0** hackathon management platform. All collections are housed under a single Firestore database instance.

> **Source of truth:** [`database-schema.json`](./database-schema.json)
> **Firestore security rules:** `firestore.rules`

---

## Table of Contents

1. [Overview](#overview)
2. [Collection: `teams`](#collection-teams)
3. [Collection: `roles`](#collection-roles)
4. [Collection: `evaluations`](#collection-evaluations)
5. [Collection: `gameScores`](#collection-gamescores)
6. [Collection: `labs`](#collection-labs)
7. [Collection: `finalLabs`](#collection-finallabs)
8. [Collection: `metadata`](#collection-metadata)
9. [Relationships & Cross-References](#relationships--cross-references)
10. [Field Type Reference](#field-type-reference)

---

## Overview

The database is organized into **7 top-level Firestore collections**, each serving a distinct domain:

| Collection      | Purpose                                              | Document ID Strategy              |
|-----------------|------------------------------------------------------|-----------------------------------|
| `teams`         | Registered hackathon teams and their members         | Auto-generated (or legacy team name) |
| `roles`         | Privileged user auth and role mapping                | User email (lowercase)            |
| `evaluations`   | Unified jury/admin scoring for all rounds            | `{round}_{juryId}_{teamId}`       |
| `gameScores`    | Game XP awarded by student coordinators              | Auto-generated                    |
| `labs`          | Lab venue assignments for Prelims                    | Auto-generated                    |
| `finalLabs`     | Lab venue assignments for Finale                     | Auto-generated                    |
| `metadata`      | Global event state, counters, timelines, and winners | Well-known document IDs           |

---

## Collection: `teams`

> Stores information about registered hackathon teams and their members.

**Document ID:** Auto-generated Firestore ID (legacy documents may use lowercase `teamName` as the ID).

### Fields

| Field               | Type        | Required | Nullable | Default      | Description |
|---------------------|-------------|----------|----------|--------------|-------------|
| `displayId`         | `string`    | —        | —        | —            | Human-readable display identifier for the team |
| `teamName`          | `string`    | ✅       | —        | —            | Official team name |
| `teamNameLower`     | `string`    | —        | —        | —            | Lowercase version of `teamName` for case-insensitive queries |
| `theme`             | `string`    | —        | —        | —            | Hackathon theme/track the team is competing under |
| `psId`              | `string`    | —        | —        | —            | Problem Statement ID |
| `problemStatement`  | `string`    | —        | —        | —            | Full text of the chosen problem statement |
| `leadEmail`         | `string`    | —        | —        | —            | Lowercase email of the team lead (used for auth lookup) |
| `leadData`          | `object`    | —        | —        | —            | Lead member details *(see sub-fields below)* |
| `membersData`       | `array`     | —        | —        | —            | Array of non-lead member objects *(see sub-fields below)* |
| `allBatchNumbers`   | `array`     | —        | —        | —            | Batch numbers of all team members (for quick filtering) |
| `pptLink`           | `string`    | —        | ✅       | —            | Public URL to the team's PPT submission |
| `pptDriveFileId`    | `string`    | —        | ✅       | —            | Google Drive File ID of the uploaded PPT |
| `pptQualified`      | `boolean`   | —        | —        | —            | Whether the PPT passed initial screening |
| `pptStatus`         | `string`    | —        | —        | —            | Human-readable PPT review status (e.g., `"Pending"`, `"Approved"`) |
| `venue`             | `string`    | —        | ✅       | —            | Prelims venue assignment |
| `finalVenue`        | `string`    | —        | ✅       | —            | Finale venue assignment |
| `score`             | `number`    | —        | —        | —            | Overall/current score |
| `judge`             | `string`    | —        | —        | `"Unassigned"` | Name or ID of assigned judge |
| `labNo`             | `string`    | —        | —        | `"Unassigned"` | Prelims lab number |
| `assignedLabId`     | `string`    | —        | —        | —            | Reference to `labs` document ID |
| `assignedLabName`   | `string`    | —        | —        | —            | Denormalized lab name for display |
| `feedback`          | `string`    | —        | —        | —            | Jury feedback text |
| `eliminated`        | `boolean`   | —        | —        | —            | Whether the team has been eliminated |
| `eliminationReason` | `string`    | —        | —        | —            | Reason for elimination (if applicable) |
| `prelimsAverageScore` | `number`  | —        | —        | —            | Computed average score across all jury evaluations in Prelims |
| `prelimsStatus`     | `string`    | —        | —        | —            | Prelims result status (e.g., `"Qualified"`, `"Eliminated"`) |
| `finaleQualified`   | `boolean`   | —        | —        | —            | Whether the team qualified for the Finale |
| `finalStatus`       | `string`    | —        | —        | —            | Finale result status |
| `isWinner`          | `boolean`   | —        | —        | —            | Whether the team is a prize winner |
| `winnerRank`        | `number`    | —        | ✅       | —            | Podium rank (1st, 2nd, 3rd…) if a winner |
| `winnerTitle`       | `string`    | —        | ✅       | —            | Winner title/prize label |
| `totalGameXP`       | `number`    | —        | —        | —            | Aggregated Game XP from all `gameScores` records |
| `createdAt`         | `timestamp` | —        | —        | —            | Document creation time |
| `updatedAt`         | `timestamp` | —        | —        | —            | Last update time |

### Sub-object: `leadData`

```
{
  name:          string,   // Full name of the lead
  batchNumber:   string,   // e.g., "21CS001"
  department:    string,   // e.g., "CSE"
  year:          string,   // e.g., "3"
  section:       string,   // e.g., "A"
  contactNumber: string,   // Phone number
  email:         string    // Lead's email
}
```

### Sub-object: `membersData[]`

```
{
  name:        string,  // Full name
  batchNumber: string,  // e.g., "21CS002"
  department:  string,
  year:        string,
  section:     string
}
```

---

## Collection: `roles`

> Stores authentication and role mapping for **privileged users only** (Admins, Juries, Coordinators).
>
> ⚠️ **Important:** Regular participant teams are NOT stored here. The system treats any authenticated user *not* found in this collection as the default `"team"` role.

**Document ID:** User's email address (lowercase), e.g., `john.doe@example.com`

### Fields

| Field         | Type        | Description |
|---------------|-------------|-------------|
| `role`        | `string`    | One of: `"admin"` \| `"jury"` \| `"coordinator"` |
| `name`        | `string`    | Full display name |
| `department`  | `string`    | Department name |
| `institution` | `string`    | Institution/college name |
| `juryId`      | `string`    | *(Jury only)* Unique jury identifier used in evaluation document IDs |
| `juryName`    | `string`    | *(Jury only)* Display name used in evaluations |
| `migratedFrom`| `string`    | Set by migration scripts; indicates original collection name if data was migrated |
| `createdAt`   | `timestamp` | Document creation time |

### Role Values

| Role          | Access Level |
|---------------|-------------|
| `admin`       | Full platform access — team management, lab assignment, evaluation oversight |
| `jury`        | Can submit evaluations for assigned teams in Prelims and/or Finale |
| `coordinator` | Student/Faculty coordinators — manage game XP or liaison duties |

---

## Collection: `evaluations`

> Unified scoring submitted by Juries and Admins. This single collection **replaces** the old `prelimsEvaluations` and `finaleEvaluations` collections.

**Document ID:** Composite key in the format `{round}_{juryId}_{teamId}`
- Example: `prelims_J001_abc123xyz`

### Fields

| Field         | Type        | Description |
|---------------|-------------|-------------|
| `round`       | `string`    | `"prelims"` or `"finale"` |
| `teamId`      | `string`    | Reference to the `teams` document ID |
| `teamName`    | `string`    | Denormalized team name for display |
| `displayId`   | `string`    | Denormalized display ID for the team |
| `juryId`      | `string`    | Reference to the `roles` document (jury's email) |
| `juryName`    | `string`    | Denormalized jury name for display |
| `rubric`      | `object`    | Rubric scores *(see sub-fields below)* |
| `totalScore`  | `number`    | Computed sum of all rubric criteria |
| `remarks`     | `string`    | Short remarks from the jury |
| `feedback`    | `string`    | Detailed qualitative feedback |
| `highlighted` | `boolean`   | Whether the jury flagged this team as notable |
| `isFrozen`    | `boolean`   | If `true`, the evaluation is locked and cannot be edited |
| `migratedFrom`| `string`    | Set by migration script if document was migrated from a legacy collection |
| `createdAt`   | `timestamp` | Submission time |
| `updatedAt`   | `timestamp` | Last edit time |

### Sub-object: `rubric`

```
{
  conceptStrength:     number,  // Idea originality and problem-solution fit
  buildIntelligence:   number,  // Technical depth and implementation quality
  deliveryImpact:      number,  // Presentation quality and demo effectiveness
  liveDefenseScore:    number,  // Q&A performance
  communication:       number   // Clarity and articulation
}
```

> **Note:** Each criterion is scored individually. `totalScore` is the aggregated value.

---

## Collection: `gameScores`

> Stores Game XP entries awarded by student coordinators during side-event games.
> Currently only read/queried by Admin actions.

**Document ID:** Auto-generated Firestore ID

### Fields

| Field              | Type        | Description |
|--------------------|-------------|-------------|
| `teamId`           | `string`    | Reference to the `teams` document ID |
| `studentCoordId`   | `string`    | Email/ID of the coordinator who awarded the XP |
| `gameName`         | `string`    | Name of the game/side-event |
| `xpAwarded`        | `number`    | Amount of XP awarded in this entry |
| `createdAt`        | `timestamp` | Time of XP award |

> Multiple `gameScores` documents can exist for the same `teamId`. The `totalGameXP` field on the `teams` document holds the aggregated total.

---

## Collection: `labs`

> Lab venue assignments specifically for the **Prelims** round.

**Document ID:** Auto-generated Firestore ID

### Fields

| Field              | Type        | Description |
|--------------------|-------------|-------------|
| `labId`            | `string`    | Logical lab identifier (e.g., `"LAB-01"`) |
| `labName`          | `string`    | Display name (e.g., `"Computer Lab 1"`) |
| `labCode`          | `string`    | Short code for the lab |
| `capacity`         | `number`    | Maximum number of teams the lab can host |
| `assignedJuryId`   | `string`    | Reference to `roles` document (jury assigned to this lab) |
| `assignedJuryName` | `string`    | Denormalized jury name |
| `assignedTheme`    | `string`    | Theme/track assigned to this lab |
| `currentTeamCount` | `number`    | Live count of teams currently assigned to this lab |
| `createdAt`        | `timestamp` | Document creation time |
| `updatedAt`        | `timestamp` | Last update time |

---

## Collection: `finalLabs`

> Lab venue assignments specifically for the **Finale** round.

**Document ID:** Auto-generated Firestore ID

### Fields

| Field              | Type        | Description |
|--------------------|-------------|-------------|
| `labId`            | `string`    | Logical lab identifier |
| `labName`          | `string`    | Display name |
| `labCode`          | `string`    | Short code for the lab |
| `capacity`         | `number`    | Maximum number of teams the lab can host |
| `coordinator`      | `string`    | Coordinator assigned to oversee this lab during Finale |
| `currentTeamCount` | `number`    | Live count of teams currently assigned to this lab |
| `createdAt`        | `timestamp` | Document creation time |
| `updatedAt`        | `timestamp` | Last update time |

---

## Collection: `metadata`

> Global singleton-like documents for event-wide state, counters, and configuration.

**Document IDs:** Fixed, well-known IDs (not auto-generated):

| Document ID      | Purpose |
|------------------|---------|
| `teamCounter`    | Tracks the total number of registered teams |
| `eventTimelines` | Controls event phase timelines and stage gating |
| `eventWinners`   | Stores proclaimed winners after the Finale |

---

### `metadata/teamCounter`

| Field   | Type     | Description |
|---------|----------|-------------|
| `count` | `number` | Incremented atomically on each new team registration |

---

### `metadata/eventTimelines`

Controls the visibility and state of each event phase. The `state` and `enabled` fields gate the platform's UI for all roles.

| Field       | Type     | Description |
|-------------|----------|-------------|
| `timeline1` | `object` | **Phase 1 — Registration** |
| `timeline2` | `object` | **Phase 2 — PPT Submission** |
| `timeline3` | `object` | **Phase 3 — Prelims** |
| `timeline4` | `object` | **Phase 4 — Finale** |

#### Timeline Object Structure

All timelines share a common base shape:

```
{
  name:      string,     // Display name for this phase
  state:     string,     // Current state (e.g., "active", "closed", "upcoming")
  enabled:   boolean,    // Master switch — disables the phase entirely if false
  startDate: timestamp,  // Phase start date/time
  endDate:   timestamp   // Phase end date/time
}
```

#### Phase-specific extra fields

| Timeline    | Extra Fields | Description |
|-------------|--------------|-------------|
| `timeline2` | `pptFilterApplied` (`boolean`) | Whether unqualified PPT teams have been filtered out |
| `timeline3` | `topTeamsToFinal` (`number`), `finalistsPromoted` (`boolean`) | How many top prelims teams advance; whether promotion has been triggered |
| `timeline4` | `winnerCount` (`number`) | Number of prize positions to be announced |

---

### `metadata/eventWinners`

| Field       | Type        | Description |
|-------------|-------------|-------------|
| `winners`   | `array`     | Array of winner objects *(see below)* |
| `updatedAt` | `timestamp` | Last time the winners list was updated |

#### Winner Object

```
{
  teamId: string,  // Reference to teams document ID
  rank:   number,  // 1 = 1st place, 2 = 2nd place, etc.
  title:  string   // Prize label, e.g., "Champion", "Runner-Up"
}
```

---

## Relationships & Cross-References

```
teams
  ├── leadEmail          ←→  Firebase Auth (user email)
  ├── assignedLabId      →   labs (document ID)
  ├── finalVenue         →   finalLabs (labId field)
  └── judge              →   roles (jury email)

evaluations
  ├── teamId             →   teams (document ID)
  └── juryId             →   roles (document ID = jury email)

gameScores
  └── teamId             →   teams (document ID)

labs
  └── assignedJuryId     →   roles (document ID = jury email)

metadata/eventWinners
  └── winners[].teamId   →   teams (document ID)
```

> **Denormalization note:** To minimize reads, several fields are intentionally duplicated (e.g., `teamName` in `evaluations`, `assignedJuryName` in `labs`). These are considered "read-optimized snapshots" and should always be updated together with the source document.

---

## Field Type Reference

| Firestore Type | Description |
|----------------|-------------|
| `string`       | UTF-8 text value |
| `number`       | Double-precision floating-point (used for scores, counts, ranks) |
| `boolean`      | `true` or `false` |
| `timestamp`    | Firestore `Timestamp` object (UTC). Use `serverTimestamp()` on writes. |
| `object`       | Nested map/object (not a subcollection) |
| `array`        | Ordered list of values |

---

*Last updated: 2026-08-05 • Maintained by the Hackwell 2.0 dev team*
