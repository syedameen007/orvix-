# App Store & Google Play launch checklist

Work through this top to bottom. Items marked **(blocker)** will get a store rejection if missing.

## 1. Package the app
- [ ] Wrap `apps/mobile` with **Capacitor**: `pnpm add -D @capacitor/cli && pnpm add @capacitor/core @capacitor/ios @capacitor/android`, then `npx cap init` (app id e.g. `com.yourcompany.orvix`), `pnpm --filter @orvix/mobile build`, `npx cap add ios && npx cap add android`, `npx cap sync`.
- [ ] Set `VITE_API_URL` to your production API **before** building (native apps have no same-origin `/api`).
- [ ] Add `https://your-app-domain` and the Capacitor origins (`capacitor://localhost`, `https://localhost`) to the API's `CORS_ORIGINS`.
- [ ] Replace the web token storage with secure native storage (`@capacitor/preferences` is not encrypted; prefer a Keychain/Keystore plugin).
- [ ] App icon (1024×1024, no transparency for iOS), adaptive Android icon, splash screen.
- [ ] Camera permission text for barcode scanning (`NSCameraUsageDescription`) in plain language.

## 2. Compliance (blockers)
- [ ] **(blocker)** Publish a Privacy Policy and Terms (start from `docs/legal/`, have a lawyer review) and set `VITE_PRIVACY_URL`, `VITE_TERMS_URL`, `VITE_SUPPORT_EMAIL`.
- [ ] **(blocker, Apple & Google)** In-app account deletion: ✅ implemented (Profile → Security & data).
- [ ] **(blocker)** Apple Privacy "nutrition labels" and Google Play "Data safety" form: declare health & fitness data, email, identifiers; state data is encrypted in transit and deletable.
- [ ] Health disclaimer visible in-app: ✅ onboarding and Profile → About.
- [ ] If you add subscriptions: use Apple/Google in-app purchase, and add restore-purchases.
- [ ] Age rating questionnaire (health/fitness content; no user-to-user content).

## 3. Quality bar
- [x] Starter catalog: ~200 foods, 816 exercises, 5 beginner routines (`pnpm db:seed`, see `docs/DATA_SOURCES.md`).
- [ ] Have a nutritionist review the Indian dishes, and add a licensed or open branded-product database for barcode coverage. Food values are approximate estimates.
- [ ] Configure the AI provider or hide the Coach tab until it works.
- [ ] Add email verification + password reset (needs an email provider).
- [ ] Crash/error reporting (e.g. Sentry) and basic analytics with consent.
- [ ] Test on small phones, large phones, dark mode, offline, slow network, and with screen-reader/large text.
- [ ] Run a TestFlight / Play internal-testing round with 10–20 real beginners and watch where they get stuck.

## 4. Store listing
- [ ] Name, subtitle, description, keywords, 5–8 screenshots per device size, support URL, marketing URL.
- [ ] Review notes with a demo account for the reviewers.
