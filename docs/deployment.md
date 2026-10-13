# ORVIX Vercel + MongoDB Deployment

## Required Vercel environment variables

- `DATABASE_URL`: MongoDB or MongoDB Atlas URI. Prisma transactions require a replica set. MongoDB Atlas satisfies this by default.
- `JWT_SECRET`: long random string for session signing.

Optional integration variables are listed in `.env.example`.

## Deploy

```bash
vercel login
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel --prod
```

The configured Vercel build command is:

```bash
pnpm build:vercel
```

Routes:

- `/` serves the mobile-first ORVIX app.
- `/admin` serves the admin app.
- `/api/*` serves the Express API as a Vercel serverless function.

## Initialize MongoDB

After setting `DATABASE_URL`, sync indexes and seed development data:

```bash
pnpm db:push
pnpm db:seed
```

Seed data is labelled `SAMPLE / DEVELOPMENT DATA` and is not a production food catalog.
