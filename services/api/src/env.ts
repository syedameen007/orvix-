import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(24).optional(),
  CORS_ORIGINS: z.string().default(""),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_COST: z.coerce.number().int().min(10).max(16).default(12),
  AI_PROVIDER: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  VISION_PROVIDER: z.string().optional(),
  VISION_API_KEY: z.string().optional(),
  OCR_PROVIDER: z.string().optional(),
  OCR_API_KEY: z.string().optional(),
  SPEECH_PROVIDER: z.string().optional(),
  SPEECH_API_KEY: z.string().optional(),
  BARCODE_PROVIDER: z.string().optional(),
  BARCODE_API_KEY: z.string().optional()
});

const parsed = envSchema.parse(process.env);

const DEV_SECRET = "development-only-secret-change-before-prod";
const isProduction = parsed.NODE_ENV === "production";

if (isProduction && !parsed.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set (24+ characters) when NODE_ENV=production.");
}
if (isProduction && !parsed.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set when NODE_ENV=production.");
}

export const env = {
  ...parsed,
  JWT_SECRET: parsed.JWT_SECRET ?? DEV_SECRET,
  isProduction,
  corsOrigins: parsed.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
};
