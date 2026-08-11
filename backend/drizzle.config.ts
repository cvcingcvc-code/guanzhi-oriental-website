import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://guanzhi:guanzhi@localhost:5432/guanzhi',
  },
  strict: true,
  verbose: true,
});
