import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '../config.js';
import { databaseErrorMetadata } from './errors.js';
import * as schema from './schema.js';

type DatabasePoolLogger = {
  error(bindings: unknown, message: string): void;
};

let databasePoolLogger: DatabasePoolLogger | undefined;
const pendingPoolErrors: unknown[] = [];

export const pool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: config.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  const bindings = { databaseError: databaseErrorMetadata(error) };
  if (databasePoolLogger) {
    databasePoolLogger.error(bindings, 'PostgreSQL pool reported an idle client error');
    return;
  }

  if (pendingPoolErrors.length < 10) pendingPoolErrors.push(bindings);
});

export function configureDatabasePoolLogger(logger: DatabasePoolLogger) {
  databasePoolLogger = logger;
  for (const bindings of pendingPoolErrors.splice(0)) {
    logger.error(bindings, 'PostgreSQL pool reported an idle client error');
  }
}

export const db = drizzle(pool, { schema });

export async function closeDatabase() {
  await pool.end();
}
