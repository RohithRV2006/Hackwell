# 20 — Coding Standards and Conventions

## Codebase Conventions

Hackwell 2.O follows modern TypeScript and Next.js App Router conventions. Adhering to these standards ensures maintainability and readability across developer handoffs.

---

## File Naming & Directory Structure

| Type | Convention | Examples |
|---|---|---|
| **App Router Routes** | Lowercase kebab-case folder with `page.tsx` or `layout.tsx` | `src/app/team-dashboard/page.tsx`, `src/app/jury-dashboard/page.tsx` |
| **Server Actions** | Lowercase `actions.ts` within route directory or `src/app/actions/` | `src/app/actions/auth.ts`, `src/app/admin/actions.ts` |
| **Components** | PascalCase `.tsx` | `src/components/LogoutButton.tsx`, `src/components/landing/NavBar.tsx` |
| **Utility Libraries** | Lowercase kebab-case `.ts` | `src/lib/firebase-admin.ts`, `src/lib/encryption.ts` |
| **Data Modules** | Lowercase kebab-case `.ts` | `src/lib/data/themes.ts` |

---

## TypeScript & Type Safety Rules

1. **Strict Null Checks:** Ensure optional object parameters are guarded or given default values before access (e.g. `team.leadData?.name || 'N/A'`).
2. **Explicit Action Signatures:** Server actions must explicitly declare return promise types:
   ```typescript
   export async function deleteLabAdmin(labId: string): Promise<{ success: boolean; error?: string }>
   ```
3. **Avoid Implicit `any`:** When typing data payloads from Firestore `doc.data()`, define explicit interfaces (`LabData`, `FinalLabData`, `SimpleTeam`, `EvaluationData`).

---

## Server Actions Guidelines (`'use server'`)

- **Top-of-File Declaration:** All Server Action files must begin with `'use server';`.
- **Security Check as First Statement:** All privileged Server Actions must start with session/role verification:
  ```typescript
  const valid = await verifyAdminSession();
  if (!valid) return { success: false, error: 'Unauthorized' };
  ```
- **Never Throw to Client:** Wrap action internals in `try / catch` blocks and return structured `{ success: false, error: err.message }` objects instead of throwing uncaught exceptions.
- **Cache Invalidation:** Always invoke `invalidateCollectionCache('collectionName')` immediately following mutations to ensure stale data is not served.

---

## React & Styling Conventions

- **Tailwind CSS Utility Classes:** Use standard Tailwind utility classes for consistent spacing, colors, and typography.
- **Modern Color Palettes:** Use curated slate/blue/neutral tones (`bg-gray-50`, `text-blue-600`, `border-gray-200`) and semantic accents (green for evaluated, amber for pending/frozen, red for errors).
- **Icons:** Use `lucide-react` for all interface icons with explicit `size` and `className` attributes.
- **Client vs Server Components:** Keep Server Components as the default for data fetching; use `'use client'` only when state (`useState`), effects (`useEffect`), or client event listeners are required.

---

> **Related Documents:** [03_Folder_Structure](./03_Folder_Structure.md) · [08_API_and_Service_Layer](./08_API_and_Service_Layer.md) · [22_Refactoring_and_Technical_Debt](./22_Refactoring_and_Technical_Debt.md)
