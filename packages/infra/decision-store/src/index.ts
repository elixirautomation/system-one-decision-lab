/**
 * The public surface of `@sysone/decision-store`.
 *
 * A use case should need nothing from this package that is not re-exported here:
 * the connection, the generic `decisions` table, the write API, and the migration
 * runner it reuses for its own tables.
 */
export { createDatabase } from './client.js';
export type { Database, DatabaseConnection, DecisionWriter } from './client.js';

export { decisions, decisionStoreSchema, DATA_ORIGINS } from './schema.js';
export type { DataOrigin, DecisionProvider } from './schema.js';

export {
  decisionValues,
  loadDecisions,
  loadDecisionsForSubject,
  recordDecision,
  recordDecisions,
} from './record.js';
export type { DecisionInput, DecisionSubject } from './record.js';

export {
  applyDecisionStoreMigrations,
  decisionStoreMigrationsFolder,
  runMigrations,
  DECISION_STORE_MIGRATIONS_TABLE,
} from './migrate.js';
export type { MigrationOptions } from './migrate.js';
