# 01 — Project Overview

## Project Introduction

**Hackwell 2.O** is a full-stack hackathon management web application designed to streamline the end-to-end lifecycle of a college hackathon event. It provides a centralized platform for team registration, role-based access, multi-stage evaluation, lab/venue assignments, and winner declaration.

## Purpose

To replace manual, spreadsheet-driven hackathon management with a secure, real-time, data-driven web application that handles registration, scoring, lab allocation, and event lifecycle management from a single unified interface.

## Goals

- Provide a seamless public registration experience with strict team validation.
- Implement robust Role-Based Access Control (RBAC) with four distinct dashboards.
- Enable juries to evaluate teams using a structured rubric-based scoring system.
- Give administrators full operational control over the event lifecycle (4-phase timeline).
- Ensure data security via HttpOnly session cookies and server-side authorization.

## Target Users

| User Role | Description |
|---|---|
| **Participants (Teams)** | Student teams of 4 (1 Lead + 3 Members) who register, upload PPTs, and view their status. |
| **Administrators** | Event organizers with full platform control: manage teams, timelines, labs, scores, and users. |
| **Juries** | External evaluators who score teams using a 5-criteria rubric during prelims/finale rounds. |
| **Student Coordinators** | Student volunteers who assign Game XP to teams during events. |
| **Faculty Coordinators** | Faculty supervisors who oversee event operations. |

## Features

### Public-Facing
- **Landing Page** — Modern, section-based homepage with Hero, About, Themes, Timeline, Rules, Testimonials, FAQ, and Contact sections.
- **Team Registration** — Strict 4-member (1 Lead + 3 Members) registration with live team name uniqueness checking, batch number duplication detection, theme/PS selection, and password strength enforcement.
- **Login Portal** — Unified login that dynamically routes users to their role-specific dashboards.
- **Forgot Password / Reset Password** — Password reset flow restricted to Team (student) users only.
- **Problem Statement Browser** — Public page listing hackathon problem statements.

### Team Dashboard
- View team details (display ID, members, assigned lab, assigned jury, status).
- Upload PPT presentation (with timeline-gated submission window).
- View prelims and finale status.
- Change password.

### Jury Dashboard
- View all teams assigned for evaluation.
- Evaluate teams using a 5-field rubric (0–10 per field, total /50).
- Star/highlight teams.
- Search, filter, and sort by team number, name, lab, status.
- Freeze scores permanently after completing evaluations.
- Navigate between teams with prev/next controls.

### Admin Dashboard (7 Tabs)
- **Overview** — System-wide statistics (teams, juries, roles, prelims/finale counts).
- **Event Management** — 4-phase timeline control (Registration → PPT Submission → Prelims → Finale), PPT filter, auto-allocate teams to labs, promote to finale, declare winners.
- **Team Details** — View, edit, and delete all teams with full member data.
- **Prelims Round** — View, create, update, and delete prelims evaluations.
- **Final Round** — View and manage finale evaluations.
- **Game Scores** — View Game XP awarded by student coordinators.
- **Users Creator** — Create and delete Jury, Student Coordinator, and Faculty Coordinator accounts.

## Scope

The application currently covers the full hackathon lifecycle for a **single event instance** running on a Firebase (Firestore + Auth) backend. It is designed for a college-level hackathon with up to ~500 teams.

## Screenshots

> _[Screenshot placeholders — add captured screenshots here]_
>
> - `screenshots/landing.png` — Landing Page
> - `screenshots/registration.png` — Team Registration
> - `screenshots/login.png` — Login Portal
> - `screenshots/team-dashboard.png` — Team Dashboard
> - `screenshots/jury-dashboard.png` — Jury Dashboard
> - `screenshots/admin-overview.png` — Admin Overview
> - `screenshots/admin-event.png` — Event Management

## Future Roadmap

- [ ] Add Firebase Storage for direct PPT file uploads (currently saves Drive links).
- [ ] Implement real-time Firestore listeners for live admin dashboards.
- [ ] Add email notifications (e.g., registration confirmation, result announcement).
- [ ] Multi-event support (run multiple hackathon instances from one deployment).
- [ ] Implement Firestore Security Rules (currently relying on Admin SDK server-side).
- [ ] Add comprehensive automated testing suite (unit, integration, E2E).
- [ ] Performance: Implement pagination for teams/evaluations lists.
- [ ] Student Coordinator dashboard for Game XP assignment (currently only admin-managed).
- [ ] Faculty Coordinator dashboard (currently placeholder).
- [ ] Add audit logging for admin actions.

---

> **Related Documents:** [02_System_Architecture](./02_System_Architecture.md) · [03_Folder_Structure](./03_Folder_Structure.md) · [17_Developer_Setup](./17_Developer_Setup.md)
