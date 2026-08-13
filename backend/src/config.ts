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
  RESEND_API_KEY: z.string().optional(),
  NOTIFICATION_FROM: z.string().optional(),
  NOTIFICATION_TO: z.string().optional(),
  IP_HASH_SALT: z.string().min(16),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  SWAGGER_ENABLED: z.enum(['true', 'false']).optional(),
});

export function parseConfig(environment: NodeJS.ProcessEnv) {
  const result = envSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${JSON.stringify(z.flattenError(result.error).fieldErrors)}`);
  }

  const insecureProductionValues = [
    result.data.DATABASE_URL.includes('local-development-password'),
    result.data.DATABASE_URL.includes('change-me'),
    result.data.JWT_SECRET.includes('local-only-jwt-secret'),
    result.data.JWT_SECRET.includes('change-this'),
    result.data.JWT_SECRET.includes('replace-with'),
    result.data.IP_HASH_SALT.includes('local-ip-hash-secret'),
    result.data.IP_HASH_SALT.includes('change-this'),
    result.data.IP_HASH_SALT.includes('replace-with'),
    result.data.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*'),
  ];
  if (result.data.NODE_ENV === 'production' && insecureProductionValues.some(Boolean)) {
    throw new Error('Invalid environment configuration: production secrets must not use local/example values');
  }

  return {
    ...result.data,
    corsOrigins: result.data.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean),
    swaggerEnabled: result.data.SWAGGER_ENABLED ? result.data.SWAGGER_ENABLED === 'true' : result.data.NODE_ENV !== 'production',
  };
}

export let config: ReturnType<typeof parseConfig>;
try {
  config = parseConfig(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid environment configuration');
  process.exit(1);
}
