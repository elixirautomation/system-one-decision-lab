import { databaseUrl, loadLabEnv } from '@sysone/config';
import { createDatabase } from '@sysone/decision-store';

/** Application composition root for the shared PostgreSQL adapter. */
export function createLabDatabase() {
  loadLabEnv();
  return createDatabase(databaseUrl());
}
