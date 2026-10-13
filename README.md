# ORVIX

**Eat smarter. Train better. See real progress.**

ORVIX is an AI-assisted fitness app that helps beginners log food, plan workouts and track results, with a daily plan calculated for them. It is a TypeScript monorepo: a mobile-first web app, an admin console, and a MongoDB-backed API.

> Core loop: **Eat → Track → Train → Recover → Analyze → Adapt**

## Features

| Area | What you get |
| --- | --- |
| **Onboarding** | Five short steps → personal calorie, macro and water targets (Mifflin-St Jeor with a safe calorie floor) |
| **Today** | Calorie ring, macro bars, one-tap water logging, meal list, contextual nudges |
| **Food** | Search-as-you-type, barcode scanning, "say what you ate", editable portions, meal-type presets |
| **Train** | Workout builder with muscle-group shortcuts and an exercise library |
| **Progress** | Weight trend chart, change vs. start and goal |
| **Coach** | AI chat grounded in the user's own data (needs a provider key) |
| **Account** | Change password, download all data, delete account, legal links, health disclaimer |
| **Admin** | Food verification workflow with explicit verification levels, user overview, audit log |

## Repository layout

```
apps/mobile      Mobile-first React app (Vite)
apps/admin       Admin console (Vite)
services/api     Express API (JWT sessions, validation, rate limiting)
packages/database  Prisma schema (MongoDB) and seed
packages/validation  Zod schemas shared by API and apps
packages/utils   Nutrition, target calculator, parsers
packages/types   Shared TypeScript types
tests/           Vitest unit tests
docs/            Architecture, deployment, OpenAPI, legal templates, store checklist
```

## Quick start

Requires Node 20+, pnpm 11 (`corepack enable`), and Docker (for MongoDB).

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

| Service | URL |
| --- | --- |
| API | http://localhost:4000 |
| Mobile app | http://localhost:5173 |
| Admin console | http://localhost:5174 |

## Common commands

```bash
pnpm lint        # ESLint, zero warnings allowed
pnpm typecheck   # TypeScript across all packages
pnpm test        # Vitest
pnpm build       # Build everything
```

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, test and build on every pull request.

## Configuration

Copy `.env.example` to `.env`. The important variables:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | MongoDB connection string (replica set required for Prisma transactions) |
| `JWT_SECRET` | **Required in production**, 24+ characters (`openssl rand -base64 48`). The API refuses to boot without it. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed in production |
| `TRUST_PROXY` | Number of reverse proxies in front of the API (default `1`) |
| `AI_*`, `BARCODE_*`, `OCR_*`, `VISION_*`, `SPEECH_*` | Optional provider keys. Missing keys disable the feature honestly; responses are never faked. |

Mobile app (`apps/mobile/.env.example`): `VITE_API_URL`, `VITE_PRIVACY_URL`, `VITE_TERMS_URL`, `VITE_SUPPORT_EMAIL`.

## Seed data

`pnpm db:seed` loads ~200 everyday foods (Indian staples first), 816 exercises with instructions, and 5 beginner routines. It is idempotent and quality-tested. Read [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md) for sources, licensing and the honest limits of the food values (they are estimates, not a licensed database).

## Deployment

The repo ships with a Vercel configuration (mobile at `/`, admin at `/admin`, API under `/api`). Set `DATABASE_URL`, `JWT_SECRET` and `CORS_ORIGINS`, then `vercel --prod`. See [`docs/deployment.md`](docs/deployment.md).

## Security

See [`SECURITY.md`](SECURITY.md) for what is in place and the pre-launch checklist.

## Going to the App Store / Google Play

See [`docs/launch/STORE_LAUNCH_CHECKLIST.md`](docs/launch/STORE_LAUNCH_CHECKLIST.md). Legal documents are **templates** in [`docs/legal/`](docs/legal) and must be reviewed by a lawyer before publishing.

## API reference

[`docs/openapi.yaml`](docs/openapi.yaml)

## Disclaimer

ORVIX provides general fitness and nutrition guidance, not medical advice.
