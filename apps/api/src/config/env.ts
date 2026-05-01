import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default("0.0.0.0"),
  APP_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SMTP_HOST: z.string().default("mailcatcher"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("DataReach Dev <dev@datareach.local>"),
  PYTHON_SCRAPER_URL: z.string().url().default("http://scraper-python:8000"),
  SCRAPER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  EMAIL_CONCURRENCY: z.coerce.number().int().positive().default(4),
  SCRAPER_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(12),
  EMAIL_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(30)
});

export const env = envSchema.parse(process.env);
