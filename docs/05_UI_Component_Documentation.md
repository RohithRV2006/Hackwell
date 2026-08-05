# 05 — UI Component Documentation

## Reusable Components

### 1. `LogoutButton`

**File:** `src/components/LogoutButton.tsx`

| Property | Value |
|---|---|
| **Purpose** | Provides a reusable logout button that clears both Firebase Client Auth state and the server-side session cookie. |
| **Props** | None |
| **State** | None |
| **Dependencies** | `firebase/auth` (signOut), `@/lib/firebase` (auth instance), `@/app/actions/session` (clearSessionCookie), `next/navigation` (useRouter) |

**Behavior:**
1. Calls `signOut(auth)` to clear Firebase Client SDK state.
2. Calls `clearSessionCookie()` Server Action to delete the HTTP-only session cookie.
3. Redirects to `/login` via `router.replace()`.

**Usage:**
```tsx
import LogoutButton from '@/components/LogoutButton';
// In any client component:
<LogoutButton />
```

> **Note:** This component is available but not used in all dashboards. The Admin and Jury dashboards implement inline logout buttons directly.

---

## Landing Page Components

All landing components are located in `src/components/landing/` and are used exclusively by the home page (`app/page.tsx`).

### 2. `NavBar`

**File:** `src/components/landing/NavBar.tsx` (8,366 bytes)

| Property | Value |
|---|---|
| **Purpose** | Responsive navigation bar with mobile hamburger menu, smooth-scroll anchor links, and CTA buttons. |
| **Props** | None |
| **State** | `isOpen` (mobile menu toggle), scroll position tracking for sticky behavior |
| **Dependencies** | `lucide-react` icons, Next.js `Link` |

**Features:**
- Desktop: Horizontal nav links + Login/Register buttons.
- Mobile: Hamburger menu with slide-in panel.
- Scroll-triggered background change (transparent → solid white).
- Smooth scrolling to page sections via anchor IDs.

### 3. `Hero`

**File:** `src/components/landing/Hero.tsx` (3,551 bytes)

| Property | Value |
|---|---|
| **Purpose** | Full-viewport hero banner with event branding, tagline, and CTA buttons. |
| **Props** | None |
| **State** | None (static rendering) |
| **Dependencies** | `lucide-react` icons |

### 4. `About`

**File:** `src/components/landing/About.tsx` (1,489 bytes)

| Property | Value |
|---|---|
| **Purpose** | "About the Hackathon" section with event description. |
| **Props** | None |
| **State** | None |
| **Dependencies** | None |

### 5. `Themes`

**File:** `src/components/landing/Themes.tsx` (2,254 bytes)

| Property | Value |
|---|---|
| **Purpose** | Displays hackathon theme cards (AI & ML, Fintech, Smart City, etc.). |
| **Props** | None |
| **State** | None |
| **Dependencies** | `lucide-react` icons |

### 6. `Timeline`

**File:** `src/components/landing/Timeline.tsx` (2,150 bytes)

| Property | Value |
|---|---|
| **Purpose** | Visual event timeline showing key dates (Registration → PPT → Prelims → Finale). |
| **Props** | None |
| **State** | None |
| **Dependencies** | None |

### 7. `Rules`

**File:** `src/components/landing/Rules.tsx` (4,518 bytes)

| Property | Value |
|---|---|
| **Purpose** | Hackathon rules and guidelines display. |
| **Props** | None |
| **State** | None |
| **Dependencies** | `lucide-react` icons |

### 8. `Testimonials`

**File:** `src/components/landing/Testimonials.tsx` (2,044 bytes)

| Property | Value |
|---|---|
| **Purpose** | Participant testimonials/quotes section. |
| **Props** | None |
| **State** | None |
| **Dependencies** | None |

### 9. `FAQ`

**File:** `src/components/landing/FAQ.tsx` (2,423 bytes)

| Property | Value |
|---|---|
| **Purpose** | Frequently Asked Questions accordion. |
| **Props** | None |
| **State** | `openIndex` (which FAQ item is expanded) |
| **Dependencies** | None |

### 10. `Contact`

**File:** `src/components/landing/Contact.tsx` (2,833 bytes)

| Property | Value |
|---|---|
| **Purpose** | Contact information and social links section. |
| **Props** | None |
| **State** | None |
| **Dependencies** | `lucide-react` icons |

---

## Page-Level Components (Non-Reusable)

These are large, page-specific components that are not extracted into the `components/` directory:

| Component | File | Lines | Description |
|---|---|---|---|
| `TeamDashboardClient` | `app/team-dashboard/TeamDashboardClient.tsx` | ~900 | Full team dashboard UI with PPT upload, status display, password change. |
| `JuryDashboardContent` | `app/jury-dashboard/page.tsx` (inline) | ~1000 | Jury evaluation interface with team list, rubric form, search/filter, score freezing. |
| `AdminOverviewPage` | `app/admin/page.tsx` | 111 | Admin overview with statistics cards. |
| `AdminLayout` | `app/admin/layout.tsx` | 103 | Admin tabbed navigation layout. |
| `LoginForm` | `app/login/page.tsx` (inline) | ~130 | Login form with Zod validation. |
| `Register` | `app/register/page.tsx` | 668 | Full registration form with live validation. |

### Recommendations for Improvement

1. **Extract reusable UI primitives:** Button, Card, Input, Modal, Badge, Alert components should be extracted from inline page code to reduce duplication.
2. **Component prop typing:** Landing components accept no props; consider making them configurable for reuse across events.
3. **Split large page components:** `jury-dashboard/page.tsx` (1009 lines) and `admin/event-management/page.tsx` (94KB) should be broken into smaller sub-components.

---

> **Related Documents:** [03_Folder_Structure](./03_Folder_Structure.md) · [09_State_Management](./09_State_Management.md)
