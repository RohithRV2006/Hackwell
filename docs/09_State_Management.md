# 09 — State Management

## Overview

Hackwell 2.O uses a **distributed state management approach** without a centralized store like Redux or Zustand. State is managed through three primary mechanisms:

## 1. Server-Side State (Server Components)

The Team Dashboard (`/team-dashboard`) is the primary example of server-rendered state:

```
Server Component (page.tsx)
  ├── Reads session cookie
  ├── Verifies session via Firebase Admin SDK
  ├── Queries Firestore for team data
  ├── Calculates leaderboard position
  └── Passes data as props to TeamDashboardClient
```

**Advantages:** Data is fetched before rendering — no loading states, no client-side hydration issues.

## 2. Client-Side Local State (useState)

All client components manage state via React `useState`. There is **no global state store**.

### Admin Dashboard State Pattern
```typescript
const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
const [loading, setLoading] = useState(true);
const [stats, setStats] = useState<any>(null);
const [errorMsg, setErrorMsg] = useState('');
```

### Jury Dashboard State Pattern
```typescript
const [session, setSession] = useState(null);        // Auth session
const [teams, setTeams] = useState<SimpleTeam[]>([]); // Team list
const [selectedTeam, setSelectedTeam] = useState(null); // Active team
const [evaluation, setEvaluation] = useState({...});  // Rubric form
const [scoresFrozen, setScoresFrozen] = useState(false);
const [loading, setLoading] = useState(true);
const [errorMsg, setErrorMsg] = useState('');
const [successMsg, setSuccessMsg] = useState('');
```

## 3. Server-Side Caching

### Role Cache (`session.ts`)
```typescript
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

### Collection Cache (`admin/actions.ts`)
```typescript
const collectionCache = new Map<string, CacheEntry<any>>();
const COLLECTION_CACHE_TTL = 30 * 1000; // 30 seconds
```

### Next.js `unstable_cache`
```typescript
const getCachedTeamsData = unstable_cache(
  async () => { /* Firestore query */ },
  ['admin-all-teams'],
  { revalidate: 300 } // 5 minutes
);
```

## 4. URL State (Jury Dashboard)

The jury dashboard uses URL search parameters as state via `useSearchParams()`:

| Parameter | Purpose | Default |
|---|---|---|
| `search` | Team search query | `''` |
| `filter` | Status filter (All, Pending, Evaluated, Highlighted, Lab_X) | `'All'` |
| `sort` | Sort field (teamNumber, teamName, etc.) | `'teamNumber'` |
| `team` | Selected team ID for detail view | `''` |

This enables shareable URLs, browser back/forward navigation, and persistence across refreshes.

## 5. Form State (React Hook Form)

Registration and login forms use `react-hook-form` with `zod` schema validation:

```typescript
const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... }
});
```

## Loading States

| Component | Loading Pattern |
|---|---|
| Admin Dashboard | `useState(true)` → show "Loading Overview..." → set false after data fetch. |
| Jury Dashboard | Full skeleton UI with `animate-pulse` placeholders. |
| Team Dashboard | Server-rendered (no client loading state). Error state shows retry button. |
| Login/Register | Button text changes to "Processing..." and `disabled` attribute applied. |

## Error States

| Component | Error Pattern |
|---|---|
| All dashboards | `errorMsg` string state → rendered as colored alert banner. |
| Registration | `error` string state → red alert box above form. |
| Server Components | Fallback error UI with retry link rendered directly. |

## Context API

**Not implemented.** No React Context providers are used in the application.

### Recommendations for Improvement

1. **Create an AuthContext** to share authentication state across components instead of calling `verifyAdminSession()` in every admin page.
2. **Extract a NotificationContext** for centralized toast/alert management.
3. **Consider Zustand** for the admin dashboard to share teams/labs/juries data across tabs without re-fetching.

---

> **Related Documents:** [05_UI_Component_Documentation](./05_UI_Component_Documentation.md) · [15_Error_Handling](./15_Error_Handling.md)
