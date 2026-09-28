import { defineConfig } from 'drizzle-kit';
import { databaseUrl, loadLabEnv } from '@sysone/config';

loadLabEnv();

/**
 * This use case's own evidence tables. The shared `decisions` table is generated
 * from `@sysone/decision-store`, which owns it, and uses a different journal
 * table so the two packages' migrations cannot shadow each other.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  migrations: {
    table: '__drizzle_migrations_playwright',
  },
  dbCredentials: {
    url: databaseUrl(),
  },
  strict: true,
  verbose: true,
});
