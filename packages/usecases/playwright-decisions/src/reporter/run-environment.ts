/**
 * Environment reading for the run, in one place.
 *
 * Keeps defaults and variable names out of the reporter so that adding or
 * renaming a knob does not touch orchestration logic.
 */
import type { RunMetadata } from '../db/ingestion-types.js';
import type { IngestMetadata } from '../triage/types.js';

/**
 * The run's two behaviour switches. Everything else a run does is fixed: the
 * setup project is persisted and the report is always refreshed.
 *
 * `DECISION_TRIAGE_ENABLED=true` asks the selected engine about every failure
 * and makes that triage required: an engine that is down, misconfigured, or
 * refused fails the run (after the evidence is persisted) rather than being
 * skipped quietly.
 *
 * `INGEST_REQUIRED` (default true) fails the run when its evidence could not be
 * persisted. Set it false to keep the tests' own verdict when PostgreSQL is not
 * running; the failure is still printed and recorded in the manifest.
 */
export const RUN_ENV_KEYS = {
  triageEnabled: 'DECISION_TRIAGE_ENABLED',
  ingestRequired: 'INGEST_REQUIRED',
} as const;

const DEFAULTS = {
  app: 'demo-app',
  projectId: 'system-one-decision-lab',
  projectConfiguration: 'chromium-smoke',
  squadName: 'local',
  branch: 'local',
} as const;

/**
 * Spellings accepted for a boolean knob.
 *
 * Deliberately forgiving: `DECISION_TRIAGE_ENABLED=enabled` reads as obviously
 * intended-on, and a parser that recognised only `true` silently disabled triage
 * for a whole run -- the manifest said "is false" while `.env` said `enabled`.
 * Anything outside these sets is a typo, and is reported rather than quietly
 * falling back.
 */
const TRUE_VALUES = new Set(['true', '1', 'yes', 'on', 'enabled']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off', 'disabled']);

export function envBoolean(name: string, fallback: boolean, env = process.env): boolean {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;

  console.warn(
    `[decision-lab] ${name}="${raw}" is not a recognised boolean; ` +
      `using ${fallback}. Accepted: ${[...TRUE_VALUES].join('/')} or ${[...FALSE_VALUES].join('/')}.`,
  );
  return fallback;
}

/** Whether a persistence failure fails the run. Defaults to true. */
export function ingestRequired(env = process.env): boolean {
  return envBoolean(RUN_ENV_KEYS.ingestRequired, true, env);
}

export function ingestMetadata(env = process.env): IngestMetadata {
  return {
    app: env.APP_NAME ?? DEFAULTS.app,
    projectConfiguration: env.PROJECT_CONFIGURATION ?? DEFAULTS.projectConfiguration,
    squadName: env.SQUAD_NAME ?? DEFAULTS.squadName,
    branch: env.BRANCH_NAME ?? DEFAULTS.branch,
  };
}

export function runMetadata(
  runId: string,
  triggeredAt: Date,
  completedAt: Date,
  env = process.env,
): RunMetadata {
  return {
    runId,
    pipelineId: env.CI_PIPELINE_ID || runId,
    ...(env.CI_JOB_ID ? { jobId: env.CI_JOB_ID } : {}),
    branch: env.BRANCH_NAME ?? DEFAULTS.branch,
    ...(env.COMMIT_SHA ? { commitSha: env.COMMIT_SHA } : {}),
    projectId: env.PROJECT_ID ?? DEFAULTS.projectId,
    projectConfiguration: env.PROJECT_CONFIGURATION ?? DEFAULTS.projectConfiguration,
    app: env.APP_NAME ?? DEFAULTS.app,
    squadName: env.SQUAD_NAME ?? DEFAULTS.squadName,
    triggeredAt,
    completedAt,
  };
}
