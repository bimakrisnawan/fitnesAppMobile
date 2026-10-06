import "dotenv/config";
import { z } from "zod";

/** Treats `KEY=` (blank, as in .env.example) the same as an unset variable. */
const optional = <T extends z.ZodType>(type: T) => z.preprocess((v) => (v === "" ? undefined : v), type.optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  /** Max pooled connections. `prisma dev` (PGlite) mishandles concurrent connections, so use 1 locally. */
  DATABASE_POOL_MAX: optional(z.coerce.number().int().positive()),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => v.split(",").map((o) => o.trim()).filter(Boolean)),
  APP_RESET_PASSWORD_URL: z.string().default("fitnessapp://reset-password"),
  /** Public base URL of this API; Mayar redirects the customer here after paying. */
  PUBLIC_API_URL: z.url().default("http://localhost:4000"),
  /** Where /api/payments/return sends the customer back into the app. */
  APP_PAYMENT_RETURN_URL: z.string().default("fitnessapp://payment-complete"),
  /** 32 random bytes, base64. Encrypts personal data at rest (phone numbers). */
  DATA_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "must be 32 bytes, base64-encoded"),
  // Sandbox: https://api.mayar.io/hl/v1  Production: https://api.mayar.id/hl/v1 (keys differ per environment)
  MAYAR_BASE_URL: z.url().default("https://api.mayar.io/hl/v1"),
  MAYAR_API_KEY: optional(z.string()),
  /** Shared secret appended to the webhook URL registered in Mayar; Mayar doesn't sign webhooks. */
  MAYAR_WEBHOOK_TOKEN: optional(z.string().min(24)),
  /** Requests per minute per IP across /api (spec: 100). Locally the app and dashboard share one IP. */
  API_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(100),
  PRICE_MONTHLY_IDR: z.coerce.number().int().positive().default(79_000),
  PRICE_COACHING_IDR: z.coerce.number().int().positive().default(499_000),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
