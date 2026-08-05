# 21 — Troubleshooting and FAQ

## Common Issues and Solutions

### 1. "Unable to Load Team Data" on Team Dashboard
- **Symptom:** Team logs in but sees an error card: *"Unable to Load Team Data: Firebase database quota reached"*.
- **Root Cause:** Firestore read/write limits exceeded on Firebase Spark (Free Tier).
- **Solution:**
  1. Upgrade the Firebase project to the **Blaze (Pay as you go)** plan in the Firebase Console.
  2. Wait a few minutes for quota reset if on Spark plan.
  3. Ensure `getTeamDataByEmail` queries are indexed properly.

---

### 2. "Invalid credentials" on Login Even with Correct Password
- **Symptom:** User cannot log in; client displays *"Invalid credentials"*.
- **Root Cause:** Client-side Firebase Auth state desync or email casing mismatch.
- **Solution:**
  1. Emails in Hackwell are case-insensitive and stored in lowercase. Ensure email input has no leading/trailing whitespace.
  2. Clear browser IndexedDB / localStorage for `firebase:authUser:*` or reload the `/login` page (which automatically runs `signOut(auth)`).

---

### 3. Server Actions Fail with "Unauthorized" on Admin Pages
- **Symptom:** Admin triggers an action (e.g. creating lab or assigning teams) but receives *"Unauthorized"*.
- **Root Cause:** Session cookie expired (40-minute TTL) or admin email is not present in `roles` collection / `ADMIN_EMAILS` whitelist.
- **Solution:**
  1. Re-login via `/login` to refresh the `session` cookie.
  2. Verify that your email document exists in Firestore under `roles/{email}` with `{ "role": "admin" }`.
  3. Verify that `ADMIN_EMAILS` in `src/app/actions/session.ts` contains your email.

---

### 4. "Firebase Admin SDK Private Key Error" on Startup
- **Symptom:** Server throws `Error: Invalid PEM formatted message` or `asn1 encoding error`.
- **Root Cause:** `FIREBASE_PRIVATE_KEY` in `.env.local` contains unescaped newlines or missing quotation marks.
- **Solution:**
  Wrap the private key string in double quotes in `.env.local`:
  ```env
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n"
  ```

---

### 5. PPT Upload Not Saving
- **Symptom:** Team submits PPT link but status remains "pending".
- **Root Cause:** Submission attempted outside the active Phase 2 timeline window.
- **Solution:**
  1. Check `/admin/event-management` and ensure Timeline Phase 2 (PPT Submission) is marked active and enabled.
  2. Verify that `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` is configured if using the direct Drive proxy.

---

## Frequently Asked Questions (FAQ)

#### Q: How do I add a new jury member?
**A:** Navigate to `/admin/users-creator`, select the **Jury** tab, and enter the Jury Name, Institution, Email, and Password. The system creates their Firebase Auth account and stores their role profile automatically.

#### Q: Can participants edit their registration details after submission?
**A:** Participants cannot edit team members directly to prevent unauthorized roster substitutions. An administrator can update team names and member information via `/admin/teams`.

#### Q: How does the auto-allocation algorithm assign teams to labs?
**A:** `autoAssignTeamsToLabsAdmin` matches each team's chosen hackathon Theme to labs configured with that same theme. If theme-specific labs are full, it allocates teams across general labs in a round-robin distribution.

---

> **Related Documents:** [15_Error_Handling](./15_Error_Handling.md) · [17_Developer_Setup](./17_Developer_Setup.md) · [19_Environment_Variables](./19_Environment_Variables.md)
