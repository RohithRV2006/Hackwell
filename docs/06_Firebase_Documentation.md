# 06 — Firebase Documentation

## Authentication

### Provider
- **Email/Password** — the only authentication provider enabled.

### Login Flow
1. User enters email + password on `/login`.
2. Client calls `signInWithEmailAndPassword(auth, email, password)` via Firebase Client SDK.
3. On success, client gets an ID Token from `userCredential.user.getIdToken()`.
4. Client invokes `createSessionCookie(idToken)` Server Action.
5. Server verifies the ID Token with Firebase Admin SDK.
6. Server checks `auth_time` is within 5 minutes (prevents replay of old tokens).
7. Server mints an HttpOnly session cookie (40-minute expiry).
8. Server queries Firestore `roles` collection to determine user role.
9. Returns `{ success: true, role }` to client.
10. Client redirects to the role-specific dashboard.

### Logout
1. Client calls `signOut(auth)` to clear Firebase Client SDK state.
2. Client calls `clearSessionCookie()` Server Action.
3. Server deletes the `session` cookie.
4. Client redirects to `/login`.

### Session Handling
- **Cookie Name:** `session`
- **Duration:** 40 minutes
- **Attributes:** `httpOnly: true`, `secure: true` (production only), `sameSite: 'lax'`, `path: '/'`
- **Verification:** `getAdminAuth().verifySessionCookie(cookie, true)` — the `true` flag enables revocation checking.

### Token Management
- ID Tokens are short-lived and used only during the login flow to mint a session cookie.
- The session cookie is the sole authentication mechanism after login.
- No refresh token logic is implemented on the client; when the session expires, the user must re-login.

### Client-Side Auth Desync Prevention
On the login page, `signOut(auth)` is called in a `useEffect` hook to forcefully clear any stale Firebase Client Auth state that might persist from a previous session.

---

## Firestore

### Collections

| Collection | Document ID Format | Description |
|---|---|---|
| `teams` | Auto-generated ID | Registered hackathon teams and all member data. |
| `roles` | User email (lowercase) | Privileged user role mappings and profile data. |
| `evaluations` | `{round}_{juryId}_{teamId}` | Admin-managed unified scoring (prelims/finale). |
| `prelimsEvaluations` | Auto-generated ID | Jury-submitted prelims evaluations. |
| `gameScores` | Auto-generated ID | Game XP records from coordinators. |
| `labs` | Auto-generated ID | Prelims round lab configurations. |
| `finalLabs` | Auto-generated ID | Finale round lab configurations. |
| `metadata` | Named documents | Global counters and event timeline state. |

### Key Queries

| Operation | Collection | Query |
|---|---|---|
| Check team name uniqueness | `teams` | `where('teamNameLower', '==', name).limit(1)` |
| Check batch numbers | `teams` | `where('allBatchNumbers', 'array-contains-any', batchNumbers)` |
| Get team by email | `teams` | `where('leadEmail', '==', email).limit(1)` |
| Get user role | `roles` | `doc(email).get()` |
| Get prelims evaluations | `evaluations` | `where('round', '==', 'prelims')` |
| Get jury evaluations | `prelimsEvaluations` | `where('juryId', '==', juryId)` |
| Count teams | `teams` | `.count().get()` |
| Get event timelines | `metadata` | `doc('eventTimelines').get()` |

### Indexes

The following composite indexes should be configured in Firestore:

| Collection | Fields | Order |
|---|---|---|
| `evaluations` | `round`, `teamId` | Ascending |
| `evaluations` | `round`, `juryId` | Ascending |
| `prelimsEvaluations` | `juryId`, `teamId` | Ascending |
| `gameScores` | `createdAt` | Descending |
| `teams` | `totalGameXP` | Descending |

---

## Storage

**Firebase Storage is NOT currently used.** PPT files are uploaded via a Google Apps Script proxy that stores files in Google Drive. The Drive file link and file ID are saved to the team's Firestore document (`pptLink`, `pptDriveFileId`).

---

## Security Rules

**Firestore Security Rules are NOT currently implemented.** All database operations are performed server-side through the Firebase Admin SDK, which bypasses security rules entirely.

### Recommendations

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all client-side access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Since all operations go through the Admin SDK, the safest approach is to **deny all client-side access**. This prevents any direct Firestore access from the browser even if credentials are exposed.

---

> **Related Documents:** [07_Database_Design](./07_Database_Design.md) · [10_Authentication_Flow](./10_Authentication_Flow.md) · [13_Security_Documentation](./13_Security_Documentation.md)
