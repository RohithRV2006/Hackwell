# Hackwell 2.O - Hackathon Management Web Application

Hackwell 2.O is a full-stack web application built for managing hackathon events. It provides functional registration, secure authentication, strict Role-Based Access Control (RBAC) routing, and dynamic data-driven dashboards using modern web technologies.

## Tech Stack
- **Framework:** Next.js (App Router, React, Server Components)
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Client Auth & Firebase Admin (HttpOnly Session Cookies)
- **Database:** Firebase Firestore
- **Validation:** React Hook Form & Zod

## Features
- **Modern Landing Page:** Highly responsive and aesthetic landing page built with custom Tailwind CSS and React Lucide icons.
- **Unified Login Portal:** A single centralized login page that dynamically routes users (Participants, Admins, Juries, Coordinators) to their respective role-based dashboards using Firebase session cookies.
- **Registration Page:** Strict team registration (1 Lead + 3 Members). Validates unique team names and enforces strong passwords.
- **Multi-Stage Evaluation Pipeline:** Built-in support for Prelims and Finale scoring, allowing juries to dynamically select and grade teams using a unified criteria rubric (`innovation`, `technicalFeasibility`, `impact`, `presentation`).
- **Live XP Engine:** Student Coordinators can dynamically assign Game XP to teams via their dashboard, which aggregates into `totalGameXP` on the backend.
- **Strict Role-Based Access Control (RBAC):** Dedicated restricted routes (`/admin`, `/jury-dashboard`, `/student-coord-dashboard`, `/faculty-coord-dashboard`, `/team-dashboard`). Unauthorized users attempting to access a dashboard via direct URL or the browser back-button are instantly intercepted and securely redirected to the home page.

---

## Detailed System Architecture

The Hackwell 2.O platform is architected around the **Next.js App Router paradigm**, leveraging both client-side interactivity and robust server-side security.

### 1. Authentication Flow & Session Management
- **Client-Side Auth:** When a user logs in, Firebase Client Auth authenticates the credentials and issues a temporary ID token.
- **Server-Side Cookies:** Next.js intercepts this token via a Server Action (`createSessionCookie`) and requests Firebase Admin to mint a secure, HTTP-only, 5-day `session` cookie. 
- **Decoupled State:** By relying entirely on the server-side cookie for routing and data-fetching authorization, the application prevents common client-side exploits. If the Firebase Client state ever desyncs from the Server state (e.g., after logging out), the platform detects this and immediately purges the stale client state.

### 2. Role-Based Access Control (RBAC) Strategy
- **Roles Collection:** Privileged accounts (Admin, Jury, Student Co-ord, Faculty Co-ord) are stored in a centralized `roles` collection in Firestore. 
- **The "Team" Fallback:** To ensure the database scales efficiently during mass public registrations, student teams are explicitly *not* added to the `roles` collection. Instead, the backend treats "team" as the default fallback role for any valid Firebase Auth user who is not explicitly listed in the `roles` collection.
- **Server Component Interception:** Dashboard pages (e.g. `/team-dashboard`, `/student-coord-dashboard`) are rendered as Next.js Server Components. Before any data is fetched or HTML is rendered, the server verifies the `session` cookie and queries the user's role. Unauthorized accesses are rejected entirely on the server using Next.js `redirect()`, preventing secure layout flashes.

### 3. Database Schema Consolidation (NoSQL)
- Rather than maintaining fragmented collections for `jury`, `studentCoords`, and `facultyCoords`, all privileged users and their profile details (names, institutions, departments) are consolidated cleanly into the unified `roles` collection. 
- **Scores & Evaluations:** Scoring is fully decoupled. The `prelimsEvaluations` and `finaleEvaluations` collections store grading data and heavily rely on `teamId` and `juryId` references, allowing multiple juries to score the same team independently without data collisions.

---

## Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Firebase Setup
To run this project locally, you must connect it to a Firebase project.
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Navigate to **Build > Authentication** and enable the **Email/Password** sign-in method.
3. Navigate to **Build > Firestore Database** and create a database.
4. Go to **Project Settings > General** and register a new Web App to get your Client API keys.
5. Go to **Project Settings > Service Accounts** and click **Generate new private key**. This will download a JSON file containing your Admin credentials.

### 3. Environment Variables
Copy the `.env.local.example` file to `.env.local` (or create a new `.env.local`):
```bash
cp .env.local.example .env.local
```
Fill in the following variables in `.env.local`:
- `NEXT_PUBLIC_FIREBASE_*`: Your client configuration from step 4 above.
- `FIREBASE_CLIENT_EMAIL`: The `client_email` from the downloaded Service Account JSON.
- `FIREBASE_PRIVATE_KEY`: The `private_key` from the downloaded Service Account JSON. Ensure it is wrapped in double quotes so the `\n` line breaks parse correctly.

### 4. Running the Development Server
Install dependencies and start the server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema & Rules
The Firestore schema and role mapping structures are actively maintained in [`database-schema.json`](./database-schema.json). 
Firestore security rules are maintained locally in `firestore.rules`.
