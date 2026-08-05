# 23 — Glossary and Domain Concepts

## Hackathon Domain Terminology

This glossary defines key terminology, domain concepts, and data models used throughout the Hackwell 2.O codebase.

---

| Term | Definition in Hackwell 2.O |
|---|---|
| **Display ID (`displayId`)** | A user-friendly, sequential identifier (e.g. `H2O-001`, `H2O-042`) assigned to teams upon successful registration via atomic counter transactions. |
| **Team Lead (`leadData`)** | The primary student registrant who owns the login credentials and contact communication for a 4-person team. |
| **Team Members (`membersData`)** | The 3 accompanying student participants registered under a team. |
| **Batch Number** | A 6-digit institutional student identifier (`/^\d{6}$/`) validated for uniqueness across all registrations. |
| **Theme (`theme`)** | The broad technological track (e.g. *AI & Machine Learning*, *Fintech & Blockchain*) selected by the team. |
| **Problem Statement (`psId`)** | The specific challenge statement (e.g. `PS-01`, `PS-07`) chosen from the event catalog. |
| **PPT Link (`pptLink`)** | The Google Drive presentation URL submitted by teams during Phase 2 for preliminary screening. |
| **PPT Filter (`applyPptFilterAdmin`)** | An administrative action that marks teams with valid PPTs as qualified (`pptQualified: true`) and eliminates non-submitted teams. |
| **Lab (`labs`)** | A physical or virtual evaluation venue with a defined capacity, assigned theme, and assigned jury member for the Prelims round. |
| **Final Lab (`finalLabs`)** | An evaluation venue (e.g. Main Auditorium) reserved for the top-ranking finalist teams in Phase 4. |
| **Rubric (/50)** | The 5-criteria evaluation scoring schema used by juries: Problem Statement (10), Presentation (10), Communication (10), Solution (10), and Idea (10). |
| **Score Freezing (`isFrozen`)** | An irreversible state change triggered by a jury member that locks all submitted evaluations from further edits. |
| **Game XP (`totalGameXP`)** | Gamification points awarded to teams by Student Coordinators during hackathon mini-events, powering the leaderboard. |
| **Event Timeline (`metadata/eventTimelines`)** | Global configuration governing active hackathon phases: Phase 1 (Registration), Phase 2 (PPT Submission), Phase 3 (Prelims), and Phase 4 (Finale). |
| **Roles Collection (`roles`)** | Firestore collection storing privileged access mappings (`admin`, `jury`, `student-coord`, `faculty-coord`). |

---

> **Related Documents:** [01_Project_Overview](./01_Project_Overview.md) · [07_Database_Design](./07_Database_Design.md) · [12_Event_Lifecycle_and_Workflow](./12_Event_Lifecycle_and_Workflow.md)
