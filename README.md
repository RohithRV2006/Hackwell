# Hackwell 2.O - Hackathon Management Web Application

Hackwell 2.O is a full-stack web application built for managing hackathon events. It provides functional registration, secure authentication, role-based dashboards, and complete data encryption utilizing modern web technologies.

## Tech Stack
- **Framework:** Next.js (App Router, React)
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Client Auth & Firebase Admin (Session Cookies)
- **Database:** Firebase Firestore
- **Security:** AES-256-GCM encryption for Personally Identifiable Information (PII)
- **Validation:** React Hook Form & Zod

## Features
- **Modern Landing Page:** Highly responsive and aesthetic landing page built with custom Tailwind CSS and React Lucide icons.
- **Unified Login Portal:** A single centralized login page that dynamically routes users (Participants, Admins, Juries, Coordinators) to their respective role-based dashboards using Firebase session cookies.
- **Registration Page:** Strict team registration (1 Lead + 3 Members). Validates unique team names, enforces strong passwords, and dynamically checks availability in real-time.
- **Session Management:** Enforces a strict session timeout via Next.js proxy middleware and Firebase Admin.
- **Team Dashboard:** Protected route that decrypts team details server-side and securely presents them to the user.
- **Role-Based Access Control (RBAC):** Dedicated restricted routes (`/admin`, `/jury-dashboard`, etc.) managed via a secure `roles` Firestore collection with encrypted credentials.
- **Data Security:** Stores all user PII (Names, Contact Numbers, etc.) completely encrypted within Firestore.

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
- `ENCRYPTION_KEY`: A 64-character hexadecimal string (32 bytes). A default one is provided for development, but you should generate a new secure one for production.

### 4. Running the Development Server
Install dependencies and start the server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema & Rules
The Firestore schema, role mapping structures, and encryption documentation are actively maintained in [`database-schema.json`](./database-schema.json). 
Firestore security rules are maintained locally in `firestore.rules`.
