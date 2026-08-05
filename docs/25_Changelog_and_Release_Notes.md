# 25 — Changelog and Release Notes

## Version History

### Version 2.0.0 — Production Hackathon Release (Current)
- **Full Next.js App Router Architecture:** Complete modernization to Next.js 16 with Server Actions and Server Components.
- **Robust Role-Based Access Control (RBAC):** Added distinct portals for Participants (`/team-dashboard`), Juries (`/jury-dashboard`), Coordinators, and Admins (`/admin`).
- **Jury Rubric Scoring & Freezing:** Implemented 5-criteria rubric evaluation (/50) with optimistic UI updates and permanent score locking.
- **Automated Event Lifecycle:** Added 4-phase timeline orchestration with PPT filtering, theme-based lab auto-allocation, finalist promotion, and winner declaration.
- **Security & Data Protection:** Added AES-256-GCM encryption for stored role credentials, HttpOnly session cookies (40min TTL), and sequential Display ID transactions.
- **Performance Optimizations:** Added multi-tier caching (5-minute role cache, 30-second collection cache, and Next.js `unstable_cache`).

---

### Version 1.0.0 — Initial Prototype
- Basic team registration form.
- Simple Firebase Authentication login.
- Preliminary Firestore team storage.

---

## Documentation Suite Summary

The `/docs` directory now contains a complete 25-part architectural and operational documentation suite:

1. `01_Project_Overview.md` — Introduction, purpose, goals, and feature overview.
2. `02_System_Architecture.md` — High-level architecture, components, and Mermaid diagrams.
3. `03_Folder_Structure.md` — File tree, directory purposes, and key responsibilities.
4. `04_Routing_Guide.md` — App Router routes, page types, and protection layers.
5. `05_UI_Component_Documentation.md` — Reusable components, landing sections, and page UI.
6. `06_Firebase_Documentation.md` — Auth, Firestore collections, queries, and storage.
7. `07_Database_Design.md` — Entity Relationship (ER) diagrams and collection schemas.
8. `08_API_and_Service_Layer.md` — Server Actions, signatures, and API route handlers.
9. `09_State_Management.md` — Server state, local state, URL state, and caching tiers.
10. `10_Authentication_Flow.md` — End-to-end token exchange, sessions, and sequence diagrams.
11. `11_Authorization_and_Roles.md` — RBAC matrix, route guards, and user provisioning.
12. `12_Event_Lifecycle_and_Workflow.md` — 4-phase event workflow, state machine, and algorithms.
13. `13_Security_Documentation.md` — AES-256 encryption, threat models, and sanitization.
14. `14_Performance_and_Optimization.md` — Caching strategy, query optimization, and bundle sizing.
15. `15_Error_Handling.md` — Standard return contracts, retry policies, and Spark limits.
16. `16_Testing_Strategy.md` — Manual test matrices and Vitest/Playwright setup guide.
17. `17_Developer_Setup.md` — Local installation, environment configuration, and seed scripts.
18. `18_Deployment_Guide.md` — Vercel deployment, Docker configuration, and checklist.
19. `19_Environment_Variables.md` — Full variable matrix, secret generation, and scope.
20. `20_Coding_Standards_and_Conventions.md` — TypeScript standards, Server Action rules, and styling.
21. `21_Troubleshooting_and_FAQ.md` — Solutions to common issues and operational FAQ.
22. `22_Refactoring_and_Technical_Debt.md` — Architectural review, tech debt matrix, and priorities.
23. `23_Glossary_and_Domain_Concepts.md` — Domain terminology, models, and definitions.
24. `24_Third_Party_Integrations.md` — Firebase, Google Drive PPT proxy, and Identity Toolkit.
25. `25_Changelog_and_Release_Notes.md` — Version history and documentation index.

---

> **Maintained by:** Hackwell Development Team · **Target:** Next.js / Firebase Handover
