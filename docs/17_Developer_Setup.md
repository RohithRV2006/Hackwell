# 17 — Developer Setup

## Prerequisites

Ensure your development environment meets the following minimum requirements:

- **Node.js:** `v18.17.0` or higher (Recommended: Node.js `20.x` LTS or `22.x`)
- **Package Manager:** `npm` (v9.x or higher)
- **Firebase Account:** Access to a Firebase Project with Cloud Firestore and Firebase Authentication enabled.
- **Git:** Version control client installed.

---

## Step-by-Step Installation

### 1. Clone the Repository
```bash
git clone https://github.com/RohithRV2006/Hackwell.git
cd Hackwell
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

Populate `.env.local` with your credentials (see [19_Environment_Variables.md](./19_Environment_Variables.md) for full reference):
```env
# Firebase Client SDK Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK Credentials
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC3...\n-----END PRIVATE KEY-----\n"

# Security & Encryption (64 hex characters = 32 bytes)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Google Apps Script Endpoint (Optional for PPT Proxy)
NEXT_PUBLIC_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXXX/exec
```

> **IMPORTANT:** Ensure `FIREBASE_PRIVATE_KEY` is wrapped in double quotes `"..."` so that literal `\n` characters are parsed correctly on Windows and Linux.

---

## Running the Application Locally

### Development Server (with Turbopack)
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Local Validation
```bash
npm run build
npm run start
```

---

## Initial Database Seeding & Setup

### 1. Create Initial Admin User
To provision your first administrative account:
1. Register a user via the registration form or Firebase Auth Console with your admin email.
2. In Firestore Console, navigate to `roles` collection and create a document with Document ID = `your-admin-email@example.com` (lowercase):
   ```json
   {
     "role": "admin",
     "name": "Super Admin",
     "createdAt": "2026-08-05T00:00:00Z"
   }
   ```
3. Alternatively, ensure your email is added to the `ADMIN_EMAILS` whitelist array in `src/app/actions/session.ts`.

### 2. Seed Test Teams (Optional)
From the Admin Dashboard (`/admin`), navigate to the development utility action or invoke `seedDummyTeamsAdmin(50)` to generate mock teams across all departments.

---

## Useful NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| **dev** | `next dev --turbopack` | Starts development server with fast Turbopack compilation |
| **build** | `next build` | Compiles production-optimized application |
| **start** | `next start` | Serves production build locally |
| **lint** | `next lint` | Executes ESLint validation across codebase |

---

> **Related Documents:** [18_Deployment_Guide](./18_Deployment_Guide.md) · [19_Environment_Variables](./19_Environment_Variables.md) · [21_Troubleshooting_and_FAQ](./21_Troubleshooting_and_FAQ.md)
