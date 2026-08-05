# 03 — Folder Structure

## Project Tree

```
hackwell/
├── .env.local                          # Environment variables (secrets, API keys)
├── .gitignore                          # Git ignore rules
├── AGENTS.md                           # AI agent instructions (Next.js rule)
├── CLAUDE.md                           # AI assistant context
├── README.md                           # Project README
├── database-schema.json                # Firestore schema documentation (JSON)
├── eslint.config.mjs                   # ESLint configuration
├── next-env.d.ts                       # Next.js TypeScript declarations
├── next.config.ts                      # Next.js configuration
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Locked dependency tree
├── postcss.config.mjs                  # PostCSS configuration (Tailwind)
├── tsconfig.json                       # TypeScript configuration
│
├── public/                             # Static assets (favicon, images)
│   └── (static files served at root)
│
├── docs/                               # Project documentation (this folder)
│
└── src/                                # Application source code
    ├── proxy.ts                        # Edge middleware (route protection)
    │
    ├── app/                            # Next.js App Router pages & layouts
    │   ├── globals.css                 # Global CSS + Tailwind theme
    │   ├── layout.tsx                  # Root layout (fonts, metadata)
    │   ├── page.tsx                    # Home/Landing page (/)
    │   ├── favicon.ico                 # App favicon
    │   │
    │   ├── actions/                    # Shared server actions
    │   │   ├── auth.ts                 # Registration, team data, PPT submission
    │   │   ├── session.ts              # Session cookie management, role resolution
    │   │   ├── drive.ts                # PPT timeline checks, Google Drive integration
    │   │   └── forgot-password.ts      # Password reset/change logic
    │   │
    │   ├── api/                        # API route handlers
    │   │   ├── check/route.ts          # Health check endpoint
    │   │   └── wipe/route.ts           # Data wipe endpoint
    │   │
    │   ├── login/                      # Login page
    │   │   └── page.tsx                # Client component with Firebase Auth
    │   │
    │   ├── register/                   # Team registration page
    │   │   └── page.tsx                # Multi-step form (668 lines)
    │   │
    │   ├── forgot-password/            # Forgot password page
    │   │   └── page.tsx                # Email verification + reset link
    │   │
    │   ├── reset-password/             # Reset password page
    │   │   └── page.tsx                # New password form
    │   │
    │   ├── team-dashboard/             # Team dashboard (hybrid SSR + CSR)
    │   │   ├── page.tsx                # Server component (session, data fetch)
    │   │   └── TeamDashboardClient.tsx # Client component (UI, interactions)
    │   │
    │   ├── jury-dashboard/             # Jury evaluation dashboard
    │   │   ├── page.tsx                # Client component (1009 lines)
    │   │   └── actions.ts              # Jury-specific server actions
    │   │
    │   ├── admin/                      # Admin dashboard (tabbed layout)
    │   │   ├── layout.tsx              # Admin layout with tab navigation
    │   │   ├── page.tsx                # Overview statistics page
    │   │   ├── actions.ts              # Admin server actions (2244 lines)
    │   │   │
    │   │   ├── event-management/       # Event lifecycle management
    │   │   │   ├── page.tsx            # Timeline phases, auto-allocate, PPT filter
    │   │   │   └── reports.ts          # Report generation utilities
    │   │   │
    │   │   ├── teams/                  # Team details CRUD
    │   │   │   └── page.tsx            # Team list, edit, delete
    │   │   │
    │   │   ├── prelims-scores/         # Prelims evaluation management
    │   │   │   └── page.tsx            # Score CRUD for prelims round
    │   │   │
    │   │   ├── finale-scores/          # Finale evaluation management
    │   │   │   └── page.tsx            # Score viewing for finale round
    │   │   │
    │   │   ├── game-scores/            # Game XP management
    │   │   │   └── page.tsx            # View game scores
    │   │   │
    │   │   └── users-creator/          # User account management
    │   │       ├── page.tsx            # Create/delete jury, coord accounts
    │   │       └── actions.ts          # User CRUD server actions
    │   │
    │   ├── gallery/                    # Gallery page (placeholder)
    │   │   └── page.tsx
    │   │
    │   ├── organizers/                 # Organizers page (placeholder)
    │   │   └── page.tsx
    │   │
    │   └── problem-statement/          # Problem statements page (placeholder)
    │       └── page.tsx
    │
    ├── components/                     # Reusable React components
    │   ├── LogoutButton.tsx            # Shared logout button
    │   └── landing/                    # Landing page section components
    │       ├── NavBar.tsx              # Navigation bar with mobile menu
    │       ├── Hero.tsx                # Hero banner section
    │       ├── About.tsx               # About section
    │       ├── Themes.tsx              # Hackathon themes display
    │       ├── Timeline.tsx            # Event timeline display
    │       ├── Rules.tsx               # Rules section
    │       ├── Testimonials.tsx        # Testimonials carousel
    │       ├── FAQ.tsx                 # FAQ accordion
    │       └── Contact.tsx             # Contact information
    │
    ├── lib/                            # Shared libraries and utilities
    │   ├── firebase.ts                 # Firebase Client SDK initialization
    │   ├── firebase-admin.ts           # Firebase Admin SDK initialization
    │   ├── encryption.ts               # AES-256-GCM encryption utilities
    │   └── data/                       # Static data modules
    │       └── themes.ts               # Hackathon themes & problem statements
    │
    ├── data/                           # Static data files
    │   └── problem-statements.ts       # Extended problem statements (35KB)
    │
    └── scripts/                        # Utility scripts
        ├── migrate.js                  # Data migration script
        └── seed-teams.js              # Team seeding script
```

## Folder Purposes

| Folder | Purpose |
|---|---|
| `src/app/` | Next.js App Router — contains all pages, layouts, server actions, and API routes. |
| `src/app/actions/` | Shared server actions used across multiple pages (auth, session, drive, password). |
| `src/app/admin/` | Admin-only pages and actions. Protected by `verifyAdminSession()`. |
| `src/app/api/` | REST API endpoints (health check, data wipe). |
| `src/components/` | Reusable React components. Currently contains `LogoutButton` and 9 landing page section components. |
| `src/lib/` | Core libraries: Firebase SDK initialization, encryption utilities, and static data modules. |
| `src/data/` | Static data files (extended problem statements). |
| `src/scripts/` | One-off Node.js utility scripts for data migration and seeding. |
| `public/` | Static assets served at the root URL path. |
| `docs/` | Project documentation (these files). |

## Key File Responsibilities

| File | Lines | Responsibility |
|---|---|---|
| `src/app/admin/actions.ts` | 2,244 | **Largest file.** Contains all admin server actions: CRUD for teams/scores/labs, event timeline management, auto-allocation algorithms, PPT filtering, finalist promotion, winner declaration, dummy data seeding. |
| `src/app/jury-dashboard/page.tsx` | 1,009 | Full jury evaluation dashboard UI: team list, search/filter/sort, detailed evaluation view with rubric form, score freezing, team navigation. |
| `src/app/register/page.tsx` | 668 | Complete team registration form with Zod validation, live uniqueness checking, confirmation modal, terms & conditions. |
| `src/app/jury-dashboard/actions.ts` | 512 | Jury-specific server actions: session verification, dashboard data fetching, team details, evaluation save/update, highlight toggle, score freezing. |
| `src/app/admin/users-creator/actions.ts` | 325 | User account CRUD: create jury/coordinator/faculty accounts in Firebase Auth + Firestore, delete users with cleanup of related collections. |
| `src/app/actions/auth.ts` | 232 | Core registration logic: team name uniqueness, batch number validation, team data persistence with sequential ID generation. |
| `src/app/actions/session.ts` | 110 | Session management: cookie creation/clearing, role resolution with caching, admin email whitelist. |
| `src/lib/encryption.ts` | 57 | AES-256-GCM encryption/decryption for sensitive data at rest. |
| `src/proxy.ts` | 47 | Edge middleware for route protection and authenticated user redirection. |

---

> **Related Documents:** [04_Routing_Guide](./04_Routing_Guide.md) · [05_UI_Component_Documentation](./05_UI_Component_Documentation.md)
