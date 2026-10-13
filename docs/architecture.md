# ORVIX Architecture

ORVIX is split into:

- `apps/mobile`: mobile-first React client for athletes.
- `apps/admin`: admin client for verification and operations.
- `services/api`: Express API enforcing authentication, ownership, and deterministic calculations.
- `packages/database`: Prisma schema and seed data for MongoDB.
- `packages/utils`: deterministic nutrition, voice parsing, search ranking, and workout session helpers.
- `packages/validation`: Zod request schemas shared by API routes.
- `packages/types`: shared domain types.

## Data integrity rules

- Private records carry `userId` or `ownerId`.
- API queries scope private resources to the authenticated user.
- Meal totals are calculated on the server from database food records.
- AI, OCR, vision, speech, and barcode providers return explicit not-configured responses when credentials are missing.
- User-submitted foods and AI estimates are not upgraded to verified states without admin review.

## Provider boundaries

Configured adapters should be implemented behind:

- `BarcodeProvider`
- `OcrProvider`
- `VisionProvider`
- `AiProvider`

The current boundaries deliberately do not fake provider success.
