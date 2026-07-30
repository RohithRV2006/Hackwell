# Hackwell - Hackathon Management Web Application

Hackwell is a full-stack web application built for managing hackathon events. It provides functional registration, secure authentication, and a protected team dashboard, utilizing modern web technologies.

## Tech Stack
- **Framework:** Next.js (App Router, React)
- **Styling:** Tailwind CSS
- **Authentication:** Firebase Client Auth & Firebase Admin (Session Cookies)
- **Database:** Firebase Firestore
- **Security:** AES-256-GCM encryption for Personally Identifiable Information (PII)
- **Validation:** React Hook Form & Zod

## Features (Current Implementation)
- **Registration Page:** Strict team registration (1 Lead + 3 Members). Requires `@saranathan.ac.in` domain for leads. Validates unique team names and enforces strong passwords.
- **Login Page:** Standard Email & Password authentication.
- **Session Management:** Enforces a strict 30-minute session via Next.js proxy middleware and Firebase Admin.
- **Team Dashboard:** Protected route that decrypts team details server-side and securely presents them to the user.
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
Copy the `.env.local.example` file to `.env.local`:
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

## Database Schema
The Firestore schema and encryption documentation is actively maintained in [`database-schema.json`](./database-schema.json) in the root directory.
