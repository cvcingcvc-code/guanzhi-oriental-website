import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5173'),
  PUBLIC_BASE_URL: z.url().default('http://localhost:8080'),
  UPLOAD_DIR: z.string().default('./data/uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(50 * 1024 * 1024).default(10 * 1024 * 1024),
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_FROM: z.string().optional(),
  NOTIFICATION_TO: z.string().optional(),
  IP_HASH_SALT: z.string().min(16),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error('Invalid environment configuration', z.flattenError(result.error).fieldErrors);
  process.exit(1);
}

export const config = {
  ...result.data,
  corsOrigins: result.data.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean),
};
