/**
 * One run's identity and its own output directory.
 *
 * Playwright clears `outputDir` when a run starts. With every run sharing
 * `test-results/`, a second `playwright test` therefore deletes the first one's
 * `.playwright-artifacts-*` mid-flight, and the first fails every in-flight test
 * at teardown with:
 *
 *   browserContext.close: ENOENT: no such file or directory, open
 *   'test-results/.playwright-artifacts-0/traces/<id>.network'
 *
 * Those failures are fabricated -- the test bodies had already passed -- and this
 * lab would ingest and triage them as real evidence. The fix is isolation rather
 * than exclusion: each run owns `test-results/run-<runId>/`, so concurrent runs
 * (`yarn e2e` beside `yarn e2e:headed`, or a second terminal) cannot touch each
 * other's artifacts and neither has to wait.
 *
 * The id has to be identical in the main process and in every worker, because
 * they all resolve artifact paths independently. Playwright re-evaluates the
 * config in each worker, so a fresh id per evaluation would put workers in a
 * different directory from the reporter. It is therefore generated once and
 * published through the environment, which workers inherit.
 */
import { randomUUID } from 'node:crypto';
import path from 'node:path';

/** Carries the run id from the main process to every worker. */
export const RUN_ID_ENV_KEY = 'DECISION_RUN_ID';

/** Root for all run output. Playwright's `outputDir` is a subdirectory of it. */
export const TEST_RESULTS_ROOT = 'test-results';

/** Prefix of a per-run directory, e.g. `run-8a3846a0-...`. */
export const RUN_DIRECTORY_PREFIX = 'run-';

/**
 * The id shared by this run's output directory, its manifest, its triage payload,
 * and its `test_runs` row -- so an artifact on disk is traceable to a database
 * row without guessing.
 *
 * Memoized in the environment on first call: reading it is idempotent within a
 * process, and consistent across the workers that inherit it.
 */
export function resolveRunId(env: NodeJS.ProcessEnv = process.env): string {
  const existing = env[RUN_ID_ENV_KEY];
  if (existing !== undefined && existing.trim() !== '') return existing.trim();

  const runId = randomUUID();
  env[RUN_ID_ENV_KEY] = runId;
  return runId;
}

/** This run's private output directory, relative to the repo root. */
export function runOutputDirectory(runId: string): string {
  return path.join(TEST_RESULTS_ROOT, `${RUN_DIRECTORY_PREFIX}${runId}`);
}
