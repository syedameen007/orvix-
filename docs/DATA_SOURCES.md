# Seed data: sources, quality and limits

`pnpm db:seed` loads a ready-to-use catalog so the app is useful on day one.

| Data | Size | Source | License |
| --- | --- | --- | --- |
| **Foods** | ~200 everyday foods, Indian staples first | ORVIX-curated, typical rounded values consistent with USDA FoodData Central and the ICMR-NIN Indian Food Composition Tables (2017); dishes are typical home-cooked estimates | ORVIX original compilation |
| **Exercises** | 816, with step-by-step instructions and image links | [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) by yuhonas | Unlicense (public domain) |
| **Starter routines** | 5 beginner programmes | ORVIX original | ORVIX original |

## Be honest about the food values

Foods are marked `UNVERIFIED` with the note "Approximate reference value". They are **estimates for everyday tracking**, not laboratory values, and are **not a licensed or exhaustive database**. Real products vary by brand and recipe. Before launch:

- Keep the label wording in the app ("approximate") and tell users to prefer the pack label or a barcode scan for packaged foods.
- Have a nutritionist spot-check the Indian dishes, which depend most on recipe.
- Promote reviewed foods in the admin console (**Foods**) by setting a stronger verification level.
- Consider licensing a branded-product database (e.g. Open Food Facts under ODbL, or a commercial provider) for barcode coverage. The seed deliberately contains **no invented barcodes or brand products**.

## Quality gates (run in CI)

`tests/seed-data.test.ts` and `tests/seed-run.test.ts` enforce:

- unique names, valid units, required gram/ml weights for countable foods;
- every food's calories agree with its macros (4-4-9 rule, within 15%). This catches typos, not wrong-but-consistent numbers;
- the search quality regression list (e.g. "rice" → plain rice first, "roti" → chapati, Hindi and Kannada names resolve);
- the app's unit picker matches the server's conversion rules exactly;
- every starter routine uses exercises that really exist;
- the seed script is idempotent and refuses a weak admin password in production.

## How search ranking works

Foods carry a curated `popularity` (0-100) used **only to break ties**, so everyday staples beat side-dishes. Aliases are for synonyms (roti, dahi, kela, thayir); words already in a food's name are not repeated as aliases.

## Operating the seed

```bash
pnpm db:generate && pnpm db:push   # schema gained Food.popularity, UserProfile fields, WaterEntry
pnpm db:seed                       # safe to re-run: creates missing rows, refreshes existing ones
```

- In production you **must** set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (12+ characters), or the seed refuses to run.
- The old 9-food / 5-exercise development sample is retired (set to `DEPRECATED`), not deleted, so existing meal history keeps working.
- Exercise images are linked from the source repository on GitHub. For production, copy them to your own storage/CDN.

## Updating the data

- **Add or edit foods:** edit `packages/database/prisma/data/foods.ts`, run `pnpm test`, then `pnpm db:seed`.
- **Refresh exercises:** `node packages/database/scripts/build-exercise-data.mjs` (downloads the latest source), review the diff, test, seed.
- **Add a starter routine:** edit `packages/utils/src/starterRoutines.ts`. The test fails if an exercise name doesn't exist.
