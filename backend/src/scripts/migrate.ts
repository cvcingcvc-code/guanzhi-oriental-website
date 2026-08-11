import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, closeDatabase } from '../db/client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, '../../drizzle');

try {
  await migrate(db, { migrationsFolder });
  console.log('Database migrations applied.');
} finally {
  await closeDatabase();
}
