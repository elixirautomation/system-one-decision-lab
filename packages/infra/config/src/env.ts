import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const ROOT_MARKER = 'yarn.lock';

export const DEFAULT_DATABASE_URL =
  'postgresql://decisionlab:decisionlab@localhost:5433/decision_lab';

/** Finds the workspace root without relying on the caller's current directory. */
export function findRepoRoot(startDirectory = process.cwd()): string | null {
  const fromYarn = process.env.PROJECT_CWD;
  if (fromYarn && existsSync(path.join(fromYarn, ROOT_MARKER))) return fromYarn;

  let current = path.resolve(startDirectory);
  while (true) {
    if (existsSync(path.join(current, ROOT_MARKER))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export interface LoadEnvOptions {
  /** Keys for which the file deliberately wins over an ambient shell export. */
  readonly overrideKeys?: readonly string[];
}

/** Loads the root `.env`; ordinary shell values win unless explicitly overridden. */
export function loadLabEnv(options: LoadEnvOptions = {}): void {
  const explicit = process.env.DOTENV_CONFIG_PATH;
  const root = findRepoRoot();
  const envPath = explicit ?? (root ? path.join(root, '.env') : null);
  if (!envPath || !existsSync(envPath)) return;

  const parsed = dotenv.parse(readFileSync(envPath));
  const forced = new Set(options.overrideKeys ?? []);
  for (const [key, value] of Object.entries(parsed)) {
    if (forced.has(key) || process.env[key] === undefined) process.env[key] = value;
  }
}

/** Resolves the database connection after the composition root has loaded env. */
export function databaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
}
