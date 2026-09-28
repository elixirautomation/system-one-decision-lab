/**
 * Applying migrations, for this package and for use-case packages alike.
 *
 * Each package owns its own migrations folder AND its own journal table. Without
 * separate journals, two packages generating their own `0000_*.sql` would each
 * think the other's migration was already applied, and the second one silently
 * would not run.
 *
 * Ordering is the caller's business, but there is only one real constraint: this
 * package's migrations create the shared `decisions` table, so they go first.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './client.js';

/** Journal table for this package. Use-case packages must pass their own. */
export const DECISION_STORE_MIGRATIONS_TABLE = '__drizzle_migrations_decision_store';

export interface MigrationOptions {
  readonly db: Database;
  /** Absolute path to the package's `drizzle` folder. */
  readonly migrationsFolder: string;
  /** Journal table name, unique per package. */
  readonly migrationsTable: string;
}

export async function runMigrations(options: MigrationOptions): Promise<void> {
  await migrate(options.db, {
    migrationsFolder: options.migrationsFolder,
    migrationsTable: options.migrationsTable,
  });
}

/** This package's own migrations folder, resolved from its installed location. */
export function decisionStoreMigrationsFolder(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'drizzle');
}

/** Creates the shared `decisions` table. Safe to call repeatedly. */
export async function applyDecisionStoreMigrations(db: Database): Promise<void> {
  await runMigrations({
    db,
    migrationsFolder: decisionStoreMigrationsFolder(),
    migrationsTable: DECISION_STORE_MIGRATIONS_TABLE,
  });
}
