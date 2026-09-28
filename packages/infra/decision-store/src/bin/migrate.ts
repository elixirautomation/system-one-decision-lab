import { databaseUrl, loadLabEnv } from '@sysone/config';
import { createDatabase } from '../client.js';
import { applyDecisionStoreMigrations } from '../migrate.js';

loadLabEnv();
const connection = createDatabase(databaseUrl());

try {
  await applyDecisionStoreMigrations(connection.db);
  console.log('[decision-store] Migrations applied: decisions table is up to date.');
} finally {
  await connection.close();
}
