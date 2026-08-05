# 22 — Refactoring and Technical Debt

## Architectural Review & Technical Debt Analysis

Hackwell 2.O is a fully functional, high-velocity hackathon platform. However, rapid feature development has accumulated specific areas of technical debt that should be addressed in subsequent iterations.

---

## Key Refactoring Opportunities

### 1. Deconstruct Monolithic Server Action Files
- **Issue:** `src/app/admin/actions.ts` spans **2,244 lines** and combines lab management, scoring logic, team filtering, winner declaration, and seeding.
- **Recommendation:** Split `admin/actions.ts` into modular, domain-driven action files:
  ```
  src/app/admin/actions/
  ├── session.ts        # verifyAdminSession
  ├── teams.ts          # Team CRUD & filtering
  ├── labs.ts           # Lab & FinalLab CRUD + allocations
  ├── evaluations.ts    # Prelims & Finale scoring
  ├── timelines.ts      # Phase advancement & state
  └── winners.ts        # Finalist promotion & winner ranking
  ```

---

### 2. Extract Reusable UI Component Primitives
- **Issue:** Page files (such as `jury-dashboard/page.tsx` at 1,009 lines and `admin/event-management/page.tsx`) contain inline modals, badge renderers, and search bars.
- **Recommendation:** Create a centralized UI component library in `src/components/ui/`:
  - `Modal.tsx`
  - `Badge.tsx`
  - `SearchBar.tsx`
  - `StatCard.tsx`
  - `DataTable.tsx`

---

### 3. Adopt Global State / Server State Management
- **Issue:** Admin dashboard sub-tabs trigger full collection re-fetches on navigation.
- **Recommendation:** Introduce **TanStack Query (React Query)** or **Zustand** on client dashboards to cache query results, provide optimistic mutations, and synchronize server state.

---

### 4. Implement Database-Enforced Firestore Security Rules
- **Issue:** Security relies exclusively on server-side Admin SDK verification. Direct client SDK requests to Firestore are not currently blocked by rules.
- **Recommendation:** Deploy a strict `firestore.rules` configuration denying all client-side read/write access:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```

---

### 5. Replace In-Memory Cache with Distributed Cache
- **Issue:** The in-memory `Map` caches for roles and collections reside in process memory. On serverless platforms (Vercel) with multiple lambdas, cache instances are isolated per container.
- **Recommendation:** Integrate **Upstash Redis** or **Vercel KV** for shared, distributed caching across all serverless invocations.

---

## Technical Debt Priority Matrix

| Item | Impact | Effort | Priority |
|---|:---:|:---:|:---:|
| **Firestore Security Rules Deployment** | High | Low | 🔴 P0 |
| **Split `admin/actions.ts` Monolith** | Medium | Medium | 🟡 P1 |
| **Extract UI Component Library** | Medium | Medium | 🟡 P1 |
| **Cursor-Based Pagination for Teams** | High | Medium | 🟡 P1 |
| **Automated E2E / Unit Test Suite** | High | High | 🟢 P2 |
| **Distributed Redis Cache Layer** | Low | Medium | 🟢 P2 |

---

> **Related Documents:** [02_System_Architecture](./02_System_Architecture.md) · [16_Testing_Strategy](./16_Testing_Strategy.md) · [20_Coding_Standards_and_Conventions](./20_Coding_Standards_and_Conventions.md)
