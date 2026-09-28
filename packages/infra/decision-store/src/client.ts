/** PostgreSQL adapter for the shared decision schema. Configuration is supplied by composition. */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

export type Database = NodePgDatabase<typeof schema>;
export type DecisionWriter = Pick<Database, 'insert'>;

export interface DatabaseConnection {
  db: Database;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string): DatabaseConnection {
  if (!connectionString.trim()) throw new Error('A PostgreSQL connection string is required.');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool, close: () => pool.end() };
}
