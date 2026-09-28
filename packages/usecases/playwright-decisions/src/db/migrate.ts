/**
 * `yarn db:migrate` for this use case.
 *
 * Applies infra's migrations first, because this package's decisions land in the
 * shared `decisions` table, then its own evidence tables. Reusing infra's runner
 * keeps journal handling in one place.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyDecisionStoreMigrations, runMigrations } from '@sysone/decision-store';
import { createLabDatabase as createDatabase } from '../composition/database.js';

export const PLAYWRIGHT_MIGRATIONS_TABLE = '__drizzle_migrations_playwright';

/** This package's migrations folder, resolved from this file's location. */
export function playwrightMigrationsFolder(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'drizzle');
}

const connection = createDatabase();

try {
  await applyDecisionStoreMigrations(connection.db);
  await runMigrations({
    db: connection.db,
    migrationsFolder: playwrightMigrationsFolder(),
    migrationsTable: PLAYWRIGHT_MIGRATIONS_TABLE,
  });
  console.log('[playwright-decisions] Migrations applied: decisions, test_runs, test_cases.');
} finally {
  await connection.close();
}
