import { defineConfig } from 'drizzle-kit';
import { databaseUrl, loadLabEnv } from '@sysone/config';

loadLabEnv();

/**
 * Only this package's own table. A use case generates its tables from its own
 * config, into its own folder and journal table.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  migrations: {
    table: '__drizzle_migrations_decision_store',
  },
  dbCredentials: {
    url: databaseUrl(),
  },
  strict: true,
  verbose: true,
});
