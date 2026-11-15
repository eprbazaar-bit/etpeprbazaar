# ETP – EPR Bazaar | Build & Deployment Guide

**Operator:** NYANVI ECOCLEAN PRIVATE LIMITED (`CIN: U38220WB2024PTC274770`)  
**Production Domain:** `https://etp.eprbazaar.com`  
**Firebase Project:** `intense-brook-3fs6l`  
**Firestore Database:** `ai-studio-etpeprbazaar-43fa5c66-e0d4-4e50-8298-07d3c23960cf`

---

## 1. Local Setup & Production Build

```bash
npm install
npm run lint
npm run rules:lint
npm run build
```

- `npm run build` outputs the production static bundle to `dist/`.
- `npm start` runs `node server.ts` (serves `dist/` + `/api/notifications/dispatch` & `/api/notifications/retry` on port `3000`).
- `npm test` runs the two-way email notification automated test suite.

---

## 2. Backend Environment Variables (Email Notifications & Firebase Admin)

Configure these secrets in your Cloud Run / Node server environment (never commit secrets or expose them in `VITE_*` client variables):

- `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON string for a Firebase Admin service account with Firestore & Auth Token Verification access (or rely on Application Default Credentials on Google Cloud Run / App Hosting).
- `APP_URL` — Public base URL used for email deep-links (e.g. `https://etp.eprbazaar.com`).
- `EMAIL_PROVIDER` — `resend`, `sendgrid`, or `smtp`.
- `EMAIL_FROM` — Sender address (e.g. `EPR Bazaar Alerts <alerts@eprbazaar.com>`).
- **Resend**: `RESEND_API_KEY`
- **SendGrid**: `SENDGRID_API_KEY`
- **SMTP**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`

---

## 3. Deploy to Firebase Hosting, Firestore & Storage + Cloud Run Backend

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. Deploy Firestore Rules, Firestore Indexes, and Storage Rules:
   ```bash
   npm run deploy:firebase
   ```
   *(Or deploy specific targets: `firebase deploy --only hosting`, `firebase deploy --only firestore`, `firebase deploy --only storage`.)*
3. Deploy the Node backend (`npm run build && npm start`) to Google Cloud Run / App Hosting so `/api/notifications/dispatch` and `/api/notifications/retry` remain protected behind Firebase Admin ID token verification.

---

## 4. Firebase Console Production Checklist

1. **Authentication → Settings → Authorized domains**:
   - Add `etp.eprbazaar.com` and `www.etp.eprbazaar.com` (in addition to `intense-brook-3fs6l.firebaseapp.com`).
2. **Authentication → Sign-in method**:
   - Ensure **Google** is enabled (Buyers, Sellers, Super Admin).
   - Ensure **Email/Password** is enabled for `@eprbazaar.com` Facilitators and Admin accounts provisioned via Admin Portal.
   - Ensure staff Email/Password accounts have verified email status (`emailVerified = true`) so Firestore security rules permit authenticated access.
3. **Hosting → Custom domain**:
   - Connect `etp.eprbazaar.com` in Firebase Hosting and configure DNS TXT/A records.
4. **Storage**:
   - Verify `storage.rules` is deployed for `intense-brook-3fs6l.firebasestorage.app`.

