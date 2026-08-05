# 19 — Environment Variables

## Overview

Hackwell 2.O requires environment variables to connect to Firebase services, enforce encryption, and interact with external integrations.

---

## Environment Variables Matrix

| Variable Name | Scope | Required | Format / Example | Description |
|---|---|:---:|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client & Server | Yes | `AIzaSyB...` | Firebase Web API Key for client authentication |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client & Server | Yes | `hackwell-2026.firebaseapp.com` | Firebase Authentication domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client & Server | Yes | `hackwell-2026` | Google Cloud / Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client & Server | Yes | `hackwell-2026.appspot.com` | Cloud Storage bucket name |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| Client & Server | Yes | `123456789012` | FCM Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client & Server | Yes | `1:123456789012:web:abcdef` | Firebase Web Application ID |
| `FIREBASE_CLIENT_EMAIL` | Server-Only | Yes | `firebase-adminsdk-xxx@proj.iam.gserviceaccount.com` | Service account client email for Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Server-Only | Yes | `"-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"` | Service account RSA private key |
| `ENCRYPTION_KEY` | Server-Only | Yes | `64-character hexadecimal string` (32 bytes) | AES-256-GCM symmetric key for data at rest |
| `NEXT_PUBLIC_GOOGLE_SCRIPT_URL` | Client & Server | Optional | `https://script.google.com/macros/s/.../exec` | Endpoint for Google Apps Script PPT proxy |

---

## Generating Secrets

### 1. Generating `ENCRYPTION_KEY`
Run the following command in terminal to generate a cryptographically secure 32-byte (64 hex characters) key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Generating Firebase Admin SDK Keys
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Project Settings** > **Service Accounts**.
3. Click **"Generate new private key"**.
4. Extract `client_email` and `private_key` from the downloaded JSON file.

---

## Security Best Practices

1. **Never Commit `.env.local`:** Ensure `.env.local` is listed in `.gitignore`.
2. **Prefix Protection:** Variables prefixed with `NEXT_PUBLIC_` are bundled into client JavaScript. Never prefix secret keys (`FIREBASE_PRIVATE_KEY`, `ENCRYPTION_KEY`) with `NEXT_PUBLIC_`.
3. **Double Quote Wrapping:** Always wrap `FIREBASE_PRIVATE_KEY` in double quotes in `.env.local` to allow proper parsing of newline escape sequences (`\n`).

---

> **Related Documents:** [13_Security_Documentation](./13_Security_Documentation.md) · [17_Developer_Setup](./17_Developer_Setup.md) · [18_Deployment_Guide](./18_Deployment_Guide.md)
